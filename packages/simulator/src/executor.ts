import { execSync } from 'child_process';
import type { Step, StepResult, WorkflowResult, SecurityFinding } from '@cicd-lab/shared';
import { SimulationContext, resolveEnvironment, checkPermissions } from './environment.js';
import { type ActionContext, builtinActions } from './actions/index.js';

export class Executor {
  private ctx: SimulationContext;
  private startTime: Date;

  constructor(ctx: SimulationContext) {
    this.ctx = ctx;
    this.startTime = new Date();
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
    const startTime = new Date().toISOString();

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
          endTime: new Date().toISOString(),
        };
      }
    } catch (error) {
      const endTime = new Date().toISOString();
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
      const endTime = new Date().toISOString();
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
    const endTime = new Date().toISOString();
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

    // Security scanning: check for leaked secrets in output
    this.scanForSecrets(script, name);

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
        const endTime = new Date().toISOString();
        return { name, status: 'success', output, duration: 0, startTime, endTime };
      }

      const endTime = new Date().toISOString();
      return { name, status: 'failure', output, duration: 0, startTime, endTime };
    }

    const endTime = new Date().toISOString();
    this.ctx.logs.push(`[${name}] Completed successfully`);
    return { name, status: 'success', output, duration: 0, startTime, endTime };
  }

  private scanForSecrets(script: string, stepName: string): void {
    // Check for secrets being echoed or printed
    const secretPatterns = [
      { pattern: /echo.*\$\{\{\s*secrets\./, msg: 'Secret may be echoed to logs via expression interpolation' },
      { pattern: /printenv|env\b/, msg: 'Environment dump may expose secrets' },
      { pattern: /AKIA[0-9A-Z]{16}/, msg: 'AWS Access Key ID detected in script' },
    ];

    for (const { pattern, msg } of secretPatterns) {
      if (pattern.test(script)) {
        this.ctx.findings.push({
          severity: 'high',
          category: 'secrets',
          message: `${msg} in step "${stepName}"`,
          remediation: 'Use GitHub Secrets and mask sensitive values with ::add-mask::',
        });
      }
    }

    // Check for curl piping to shell (supply chain risk)
    if (/curl.*\|\s*(ba)?sh/.test(script) || /curl.*--compressed.*\|\s*(ba)?sh/.test(script)) {
      this.ctx.findings.push({
        severity: 'critical',
        category: 'supply-chain',
        message: `Piping curl output to shell in step "${stepName}" — supply chain attack vector`,
        remediation: 'Download, verify checksum, then execute',
      });
    }

    // Check for wget piping to shell
    if (/wget.*\|\s*(ba)?sh/.test(script)) {
      this.ctx.findings.push({
        severity: 'critical',
        category: 'supply-chain',
        message: `Piping wget output to shell in step "${stepName}" — supply chain attack vector`,
        remediation: 'Download, verify checksum, then execute',
      });
    }

    // Check for || echo swallowing errors
    if (/\|\|\s*echo/.test(script)) {
      this.ctx.findings.push({
        severity: 'medium',
        category: 'reliability',
        message: `Build errors silently swallowed with "|| echo" in step "${stepName}"`,
        remediation: 'Let build failures propagate naturally',
      });
    }

    // Check for hardcoded credentials
    if (/password\s*[:=]\s*["']/.test(script)) {
      this.ctx.findings.push({
        severity: 'high',
        category: 'secrets',
        message: `Hardcoded password detected in step "${stepName}"`,
        remediation: 'Use GitHub Secrets or a secrets manager',
      });
    }
  }
}
