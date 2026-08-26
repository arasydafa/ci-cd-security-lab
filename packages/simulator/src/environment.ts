import type { WorkflowFile, Step, Job, PermissionsConfig } from '@cicd-lab/shared';

export interface SimulationContext {
  env: Record<string, string>;
  secrets: Record<string, string>;
  github: {
    event_name: string;
    event_action?: string;
    ref: string;
    sha: string;
    repository: string;
    actor: string;
    workflow: string;
    workspace: string;
  };
  masks: Set<string>;
  logs: string[];
  findings: import('@cicd-lab/shared').SecurityFinding[];
}

export function createContext(overrides?: Partial<SimulationContext>): SimulationContext {
  return {
    env: {
      RUNNER_OS: 'Linux',
      RUNNER_TEMP: '/home/runner/work/_temp',
      RUNNER_TOOL_CACHE: '/opt/hostedtoolcache',
      GITHUB_ACTION: 'main',
      GITHUB_ACTIONS: 'true',
      GITHUB_ACTOR: 'test-user',
      GITHUB_EVENT_NAME: 'push',
      GITHUB_REPOSITORY: 'owner/repo',
      GITHUB_SHA: 'abc123def456',
      GITHUB_REF: 'refs/heads/main',
      GITHUB_WORKSPACE: '/home/runner/work/repo/repo',
      ...overrides?.env,
    },
    secrets: {
      GITHUB_TOKEN: 'ghs_mock_token_12345',
      AWS_ACCESS_KEY_ID: 'AKIAIOSFODNN7EXAMPLE',
      AWS_SECRET_ACCESS_KEY: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
      ...overrides?.secrets,
    },
    github: {
      event_name: 'push',
      ref: 'refs/heads/main',
      sha: 'abc123def456',
      repository: 'owner/repo',
      actor: 'test-user',
      workflow: 'deploy.yml',
      workspace: '/home/runner/work/repo/repo',
      ...overrides?.github,
    },
    masks: new Set(),
    logs: [],
    findings: [],
    ...overrides,
  };
}

export function resolveEnvironment(
  stepEnv: Record<string, string> | undefined,
  jobEnv: Record<string, string> | undefined,
  workflowEnv: Record<string, string> | undefined,
  ctx: SimulationContext
): Record<string, string> {
  const merged: Record<string, string> = {};

  if (workflowEnv) Object.assign(merged, workflowEnv);
  if (jobEnv) Object.assign(merged, jobEnv);
  if (stepEnv) Object.assign(merged, stepEnv);

  const resolved: Record<string, string> = {};
  for (const [key, value] of Object.entries(merged)) {
    resolved[key] = interpolate(value, ctx);
  }

  return resolved;
}

export function interpolate(template: string, ctx: SimulationContext): string {
  return template.replace(/\$\{\{([^}]+)\}\}/g, (_, expr: string) => {
    const trimmed = expr.trim();

    if (trimmed.startsWith('secrets.')) {
      const secretName = trimmed.slice(7);
      return ctx.secrets[secretName] || '';
    }

    if (trimmed.startsWith('env.')) {
      const envName = trimmed.slice(4);
      return ctx.env[envName] || '';
    }

    if (trimmed.startsWith('github.')) {
      const field = trimmed.slice(7) as keyof typeof ctx.github;
      return String(ctx.github[field] || '');
    }

    return ctx.env[trimmed] || `\${{ ${trimmed} }}`;
  });
}

export function checkPermissions(
  permissions: PermissionsConfig | string | undefined,
  ctx: SimulationContext
): void {
  if (!permissions) return;

  // Handle string permissions (e.g., "write-all")
  if (typeof permissions === 'string') {
    if (permissions === 'write-all') {
      ctx.findings.push({
        severity: 'high',
        category: 'permissions',
        message: 'Workflow uses overly broad write-all permissions',
        remediation: 'Grant only the specific permissions needed for each job',
      });
    }
    return;
  }

  if (permissions.contents === 'write') {
    ctx.findings.push({
      severity: 'medium',
      category: 'permissions',
      message: 'Workflow has contents: write permission — consider using contents: read if not needed',
      remediation: 'Use least-privilege permissions: contents: read for most workflows',
    });
  }

  const permStr = JSON.stringify(permissions);
  if (permStr.includes('write-all') || permStr.includes('"*": "write"')) {
    ctx.findings.push({
      severity: 'high',
      category: 'permissions',
      message: 'Workflow uses overly broad write-all permissions',
      remediation: 'Grant only the specific permissions needed for each job',
    });
  }
}
