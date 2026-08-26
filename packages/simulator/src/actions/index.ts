import type { SimulationContext } from '../environment.js';

export interface ActionContext {
  ctx: SimulationContext;
  env: Record<string, string>;
  with: Record<string, string>;
  logs: string[];
}

export type ActionHandler = (ctx: ActionContext) => Promise<string>;

export const builtinActions: Record<string, ActionHandler> = {};

// ─── actions/checkout ──────────────────────────────────────────

builtinActions['actions/checkout'] = async (ctx: ActionContext) => {
  ctx.logs.push('  → Simulating checkout of repository...');
  const ref = ctx.with.ref || 'main';
  const path = ctx.with.path || '.';
  ctx.logs.push(`  → Checked out ref=${ref} into ${path}`);
  return `Checked out repository at ${ref}`;
};

// ─── actions/upload-artifact ───────────────────────────────────

builtinActions['actions/upload-artifact'] = async (ctx: ActionContext) => {
  const name = ctx.with.name || 'artifact';
  const path = ctx.with.path || '.';
  ctx.logs.push(`  → Simulating upload of artifact "${name}" from ${path}`);
  return `Uploaded artifact: ${name}`;
};

// ─── actions/download-artifact ─────────────────────────────────

builtinActions['actions/download-artifact'] = async (ctx: ActionContext) => {
  const name = ctx.with.name || 'artifact';
  const path = ctx.with.path || '.';
  ctx.logs.push(`  → Simulating download of artifact "${name}" into ${path}`);
  return `Downloaded artifact: ${name}`;
};

// ─── actions/setup-node ────────────────────────────────────────

builtinActions['actions/setup-node'] = async (ctx: ActionContext) => {
  const version = ctx.with.version || '20';
  ctx.logs.push(`  → Simulating setup of Node.js ${version}`);
  return `Node.js ${version} ready`;
};

// ─── actions/cache ─────────────────────────────────────────────

builtinActions['actions/cache'] = async (ctx: ActionContext) => {
  const path = ctx.with.path || 'node_modules';
  ctx.logs.push(`  → Cache lookup for ${path}`);
  return `Cache restored for ${path}`;
};

// ─── actions/github-script ─────────────────────────────────────

builtinActions['actions/github-script'] = async (ctx: ActionContext) => {
  ctx.logs.push(`  → Simulating github-script action`);
  return 'github-script executed';
};

// ─── aws-actions/configure-aws-credentials ─────────────────────

builtinActions['aws-actions/configure-aws-credentials'] = async (ctx: ActionContext) => {
  const roleArn = ctx.with['role-to-assume'] || '';
  const region = ctx.with['aws-region'] || 'us-east-1';

  ctx.logs.push(`  → Configuring AWS credentials via OIDC (role: ${roleArn})`);

  // Check if using static credentials instead of OIDC
  if (!roleArn) {
    ctx.ctx.findings.push({
      severity: 'high',
      category: 'secrets',
      message: 'AWS credentials configured without OIDC role assumption',
      remediation: 'Use role-to-assume with OIDC federation instead of static credentials',
    });
  }

  return `AWS configured for region ${region}`;
};
