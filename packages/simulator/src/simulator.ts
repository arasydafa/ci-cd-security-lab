import type { WorkflowFile, Job, Step, WorkflowResult, JobResult, StepResult, SecurityFinding } from '@cicd-lab/shared';
import { Executor } from './executor.js';
import { SimulationContext, createContext, checkPermissions, fixedClock, type Clock } from './environment.js';
import { runRules } from './rules.js';

export interface SimulationOptions {
  workflow: WorkflowFile;
  /** Raw YAML source — enables detection rules with line attribution. */
  rawYaml?: string;
  context?: Partial<SimulationContext>;
  /**
   * Reproducible mode: fixed fixture clock (2026-01-01T00:00, +1s per stamp)
   * instead of wall time. Timestamps, durations, and logs become
   * byte-identical across runs — use it in tests, CI diffing, and harness.
   */
  deterministic?: boolean;
}

export async function simulate(options: SimulationOptions): Promise<WorkflowResult> {
  const now: Clock = options.deterministic ? fixedClock() : () => new Date();
  const startTime = now();
  const ctx = createContext(options.context);
  const workflow = options.workflow;

  // Check workflow-level permissions
  checkPermissions(workflow.permissions, ctx);

  const jobResults: JobResult[] = [];

  // Simple topological execution (respecting `needs`)
  const executed = new Set<string>();
  const jobQueue = Object.entries(workflow.jobs);

  while (jobQueue.length > 0) {
    const nextIndex = jobQueue.findIndex(([id, job]) => {
      const needs = Array.isArray(job.needs) ? job.needs : job.needs ? [job.needs] : [];
      return needs.every((n) => executed.has(n));
    });

    if (nextIndex === -1) {
      // All remaining jobs have unmet dependencies
      for (const [id] of jobQueue) {
        const stamp = now().toISOString();
        jobResults.push({
          name: id,
          status: 'skipped',
          steps: [],
          startTime: stamp,
          endTime: stamp,
        });
        executed.add(id);
      }
      break;
    }

    const [jobId, job] = jobQueue.splice(nextIndex, 1)[0];
    const result = await executeJob(jobId, job, ctx, workflow.env, now);
    jobResults.push(result);
    executed.add(jobId);

    // If job failed and has no continue-on-error, skip dependent jobs
    if (result.status === 'failure') {
      for (const [id] of jobQueue) {
        const j = workflow.jobs[id];
        const needs = Array.isArray(j.needs) ? j.needs : j.needs ? [j.needs] : [];
        if (needs.includes(jobId)) {
          const stamp = now().toISOString();
          jobResults.push({
            name: id,
            status: 'skipped',
            steps: [],
            startTime: stamp,
            endTime: stamp,
          });
          executed.add(id);
        }
      }
    }
  }

  const endTime = now();
  const allPassed = jobResults.every((j) => j.status === 'success' || j.status === 'skipped');

  // Static detection rules (registry) — pure AST/YAML analysis with line attribution.
  if (options.rawYaml) {
    ctx.findings.push(...runRules({ workflow, rawYaml: options.rawYaml }));
  }

  return {
    success: allPassed,
    jobs: jobResults,
    totalDuration: endTime.getTime() - startTime.getTime(),
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
    logs: ctx.logs,
    findings: ctx.findings,
  };
}

async function executeJob(
  jobId: string,
  job: Job,
  ctx: SimulationContext,
  workflowEnv: Record<string, string> | undefined,
  now: Clock,
): Promise<JobResult> {
  const startTime = now().toISOString();
  ctx.logs.push(`\n━━━ Job: ${job.name || jobId} ━━━`);

  // Check job-level permissions
  checkPermissions(job.permissions, ctx);

  const executor = new Executor(ctx, now);
  const stepResults = await executor.executeSteps(job.steps, job.env);

  const endTime = now().toISOString();
  const allSuccess = stepResults.every((s) => s.status === 'success');
  const anyFailure = stepResults.some((s) => s.status === 'failure');

  return {
    name: job.name || jobId,
    status: anyFailure ? 'failure' : allSuccess ? 'success' : 'skipped',
    steps: stepResults,
    startTime,
    endTime,
  };
}
