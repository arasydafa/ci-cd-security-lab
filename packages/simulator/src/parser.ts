import yaml from 'js-yaml';
import type { WorkflowFile, Step, Job, PermissionsConfig } from '@cicd-lab/shared';

export class ParseError extends Error {
  constructor(message: string, public line?: number) {
    super(message);
    this.name = 'ParseError';
  }
}

export function parseWorkflow(yamlContent: string): WorkflowFile {
  let parsed: Record<string, unknown>;
  try {
    parsed = yaml.load(yamlContent) as Record<string, unknown>;
  } catch (e) {
    throw new ParseError(`Invalid YAML: ${(e as Error).message}`);
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new ParseError('Workflow must be a YAML object');
  }

  if (!parsed.on && !parsed['true']) {
    throw new ParseError('Workflow missing required "on" trigger');
  }

  if (!parsed.jobs || typeof parsed.jobs !== 'object') {
    throw new ParseError('Workflow missing required "jobs" section');
  }

  const onKey = parsed.on || parsed['true'];
  const triggers = parseTriggers(onKey);
  const jobs = parseJobs(parsed.jobs as Record<string, unknown>);
  const permissions = parsePermissions(parsed.permissions);
  const env = parseEnv(parsed.env);

  return {
    name: typeof parsed.name === 'string' ? parsed.name : undefined,
    on: triggers,
    env,
    permissions,
    jobs,
  };
}

function parseTriggers(on: unknown): WorkflowFile['on'] {
  if (typeof on === 'string' || Array.isArray(on)) {
    return on as WorkflowFile['on'];
  }
  if (typeof on === 'object' && on !== null) {
    return on as WorkflowFile['on'];
  }
  return 'push';
}

function parseJobs(jobsRaw: Record<string, unknown>): Record<string, Job> {
  const jobs: Record<string, Job> = {};

  for (const [id, jobDef] of Object.entries(jobsRaw)) {
    if (typeof jobDef !== 'object' || jobDef === null) continue;
    const j = jobDef as Record<string, unknown>;

    const steps: Step[] = Array.isArray(j.steps)
      ? j.steps.map((s) => parseStep(s as Record<string, unknown>))
      : [];

    jobs[id] = {
      name: typeof j.name === 'string' ? j.name : undefined,
      'runs-on': (j['runs-on'] as string | string[]) || 'ubuntu-latest',
      needs: (j.needs as string | string[]) || undefined,
      if: typeof j.if === 'string' ? j.if : undefined,
      permissions: parsePermissions(j.permissions),
      env: parseEnv(j.env),
      steps,
    };
  }

  return jobs;
}

function parseStep(raw: Record<string, unknown>): Step {
  return {
    name: typeof raw.name === 'string' ? raw.name : undefined,
    uses: typeof raw.uses === 'string' ? raw.uses : undefined,
    run: typeof raw.run === 'string' ? raw.run : undefined,
    shell: typeof raw.shell === 'string' ? raw.shell : undefined,
    with: typeof raw.with === 'object' && raw.with !== null
      ? raw.with as Record<string, string>
      : undefined,
    env: typeof raw.env === 'object' && raw.env !== null
      ? raw.env as Record<string, string>
      : undefined,
    id: typeof raw.id === 'string' ? raw.id : undefined,
    'continue-on-error': raw['continue-on-error'] === true,
  };
}

function parsePermissions(raw: unknown): PermissionsConfig | undefined {
  if (typeof raw === 'string') return undefined;
  if (typeof raw !== 'object' || raw === null) return undefined;
  return raw as PermissionsConfig;
}

function parseEnv(raw: unknown): Record<string, string> | undefined {
  if (typeof raw !== 'object' || raw === null) return undefined;
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'string') env[k] = v;
  }
  return Object.keys(env).length > 0 ? env : undefined;
}
