import { execSync } from 'child_process';
import type { Step, StepResult, WorkflowResult, SecurityFinding } from '@cicd-lab/shared';
import { SimulationContext, resolveEnvironment, checkPermissions, type Clock } from './environment.js';
import { type ActionContext, builtinActions } from './actions/index.js';
import { runSandboxed } from './sandbox.js';

export type ExecMode = 'dry-run' | 'host' | 'sandbox';

/**
 * Execution mode for user `run:` scripts. Default is dry-run: nothing
 * executes on the host. `host` runs scripts directly (explicit, dangerous),
 * `sandbox` runs them in an ephemeral no-network container (opt-in).
 * Set via CICD_LAB_EXEC (unset/dry-run, 1/host, sandbox) or CLI --exec.
 */
export function resolveExecMode(): ExecMode {
  const v = (process.env.CICD_LAB_EXEC || '').trim().toLowerCase();
  if (v === '1' || v === 'host') return 'host';
  if (v === 'sandbox') return 'sandbox';
  return 'dry-run';
}

export class Executor {
  private ctx: SimulationContext;
  private clock: Clock;

  constructor(ctx: SimulationContext, clock: Clock = () => new Date()) {
    this.ctx = ctx;
    this.clock = clock;
  }

  async executeSteps(steps: Step[], jobEnv?: Record<string, string>): Promise<StepResult[]> {
    const results: StepResult[] = [];

    for (const step of steps) {
      const result = await this.executeStep(step, jobEnv);
      results.push(result);

      if (result.status === 'failure' && !step['continue-on-error']) {
        break;
      }
    }

    return results;
  }

  private async executeStep(step: Step, jobEnv?: Record<string, string>): Promise<StepResult> {
    const name = step.name || step.uses || step.run?.slice(0, 40) || 'unnamed';
    const startTime = this.clock().toISOString();

    this.ctx.logs.push(`[${name}] Starting...`);

    try {
      if (step.uses) {
        return await this.executeAction(step, name, jobEnv, startTime);
      } else if (step.run) {
        return await this.executeRun(step, name, jobEnv, startTime);
      } else {
        return {
          name,
          status: 'success',
          output: '',
          duration: 0,
          startTime,
          endTime: this.clock().toISOString(),
        };
      }
    } catch (error) {
      const endTime = this.clock().toISOString();
      const msg = error instanceof Error ? error.message : String(error);
      this.ctx.logs.push(`[${name}] FAILED: ${msg}`);

      if (step['continue-on-error']) {
        this.ctx.logs.push(`[${name}] Ignored due to continue-on-error`);
        return { name, status: 'success', output: msg, duration: 0, startTime, endTime };
      }

      return { name, status: 'failure', output: msg, duration: 0, startTime, endTime };
    }
  }

  private async executeAction(
    step: Step,
    name: string,
    jobEnv: Record<string, string> | undefined,
    startTime: string
  ): Promise<StepResult> {
    const [actionName, actionVersion] = (step.uses || '').split('@');
    const actionCtx: ActionContext = {
      ctx: this.ctx,
      env: resolveEnvironment(step.env, jobEnv, undefined, this.ctx),
      with: step.with || {},
      logs: this.ctx.logs,
    };

    const actionKey = actionName?.toLowerCase() || '';
    const handler = builtinActions[actionKey];

    if (handler) {
      const output = await handler(actionCtx);
      const endTime = this.clock().toISOString();
      this.ctx.logs.push(`[${name}] Completed successfully`);
      return { name, status: 'success', output, duration: 0, startTime, endTime };
    }

    // Unknown action — simulate success with warning
    this.ctx.logs.push(`[${name}] Action ${actionName}@${actionVersion} simulated (not executed)`);
    this.ctx.findings.push({
      severity: 'info',
      category: 'actions',
      message: `Action ${actionName}@${actionVersion} was simulated, not executed`,
    });
    const endTime = this.clock().toISOString();
    return { name, status: 'success', output: `Simulated: ${actionName}`, duration: 0, startTime, endTime };
  }

  private async executeRun(
    step: Step,
    name: string,
    jobEnv: Record<string, string> | undefined,
    startTime: string
  ): Promise<StepResult> {
    const env = resolveEnvironment(step.env, jobEnv, undefined, this.ctx);
    const script = step.run || '';

    const mode = resolveExecMode();
    if (mode === 'dry-run') {
      const firstLine = script.split('\n')[0].trim().slice(0, 120);
      const output = `[dry-run] ${firstLine}`;
      this.ctx.logs.push(`[${name}] ${output}`);
      const endTime = this.clock().toISOString();
      return { name, status: 'success', output, duration: 0, startTime, endTime };
    }
    if (mode === 'sandbox') {
      return await this.executeSandboxed(step, name, startTime);
    }

    const shell = step.shell || 'bash';
    let output = '';

    try {
      // Execute in a sandboxed way — use timeout to prevent hanging
      const result = execSync(script, {
        encoding: 'utf-8',
        timeout: 30000,
        env: { ...process.env, ...env },
        shell: shell === 'pwsh' ? 'powershell.exe' : '/bin/bash',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      output = result;
      this.ctx.logs.push(`[${name}] Output: ${output.trim().slice(0, 500)}`);
    } catch (execError) {
      const err = execError as { status: number; stderr?: string; message?: string };
      output = err.stderr || err.message || 'Command failed';
      this.ctx.logs.push(`[${name}] Command exited with status ${err.status}`);

      if (step['continue-on-error']) {
        this.ctx.logs.push(`[${name}] Ignored due to continue-on-error`);
        const endTime = this.clock().toISOString();
        return { name, status: 'success', output, duration: 0, startTime, endTime };
      }

      const endTime = this.clock().toISOString();
      return { name, status: 'failure', output, duration: 0, startTime, endTime };
    }

    const endTime = this.clock().toISOString();
    this.ctx.logs.push(`[${name}] Completed successfully`);
    return { name, status: 'success', output, duration: 0, startTime, endTime };
  }

  private async executeSandboxed(
    step: Step,
    name: string,
    startTime: string
  ): Promise<StepResult> {
    let output = '';
    try {
      output = runSandboxed(step.run || '');
      this.ctx.logs.push(`[${name}] Output: ${output.trim().slice(0, 500)}`);
    } catch (sandboxError) {
      const endTime = this.clock().toISOString();
      const msg = sandboxError instanceof Error ? sandboxError.message : String(sandboxError);
      this.ctx.logs.push(`[${name}] Sandbox failed: ${msg}`);
      if (step['continue-on-error']) {
        this.ctx.logs.push(`[${name}] Ignored due to continue-on-error`);
        return { name, status: 'success', output: msg, duration: 0, startTime, endTime };
      }
      return { name, status: 'failure', output: msg, duration: 0, startTime, endTime };
    }

    const endTime = this.clock().toISOString();
    this.ctx.logs.push(`[${name}] Completed successfully`);
    return { name, status: 'success', output, duration: 0, startTime, endTime };
  }
}
