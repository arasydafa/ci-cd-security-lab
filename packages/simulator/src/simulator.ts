import type { WorkflowFile, Job, Step, WorkflowResult, JobResult, StepResult, SecurityFinding } from '@cicd-lab/shared';
import { Executor } from './executor.js';
import { SimulationContext, createContext, checkPermissions } from './environment.js';

export interface SimulationOptions {
  workflow: WorkflowFile;
  context?: Partial<SimulationContext>;
}

export async function simulate(options: SimulationOptions): Promise<WorkflowResult> {
  const startTime = new Date();
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
        jobResults.push({
          name: id,
          status: 'skipped',
          steps: [],
          startTime: startTime.toISOString(),
          endTime: startTime.toISOString(),
        });
        executed.add(id);
      }
      break;
    }

    const [jobId, job] = jobQueue.splice(nextIndex, 1)[0];
    const result = await executeJob(jobId, job, ctx, workflow.env);
    jobResults.push(result);
    executed.add(jobId);

    // If job failed and has no continue-on-error, skip dependent jobs
    if (result.status === 'failure') {
      for (const [id] of jobQueue) {
        const j = workflow.jobs[id];
        const needs = Array.isArray(j.needs) ? j.needs : j.needs ? [j.needs] : [];
        if (needs.includes(jobId)) {
          jobResults.push({
            name: id,
            status: 'skipped',
            steps: [],
            startTime: new Date().toISOString(),
            endTime: new Date().toISOString(),
          });
          executed.add(id);
        }
      }
    }
  }

  const endTime = new Date();
  const allPassed = jobResults.every((j) => j.status === 'success' || j.status === 'skipped');

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
  workflowEnv?: Record<string, string>
): Promise<JobResult> {
  const startTime = new Date().toISOString();
  ctx.logs.push(`\n━━━ Job: ${job.name || jobId} ━━━`);

  // Check job-level permissions
  checkPermissions(job.permissions, ctx);

  const executor = new Executor(ctx);
  const stepResults = await executor.executeSteps(job.steps, job.env);

  const endTime = new Date().toISOString();
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
