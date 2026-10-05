import { execFileSync } from 'child_process';

export const DEFAULT_SANDBOX_IMAGE = 'node:20-slim';
export const SANDBOX_WORKDIR = '/work';

export interface SandboxOptions {
  image?: string;
  timeoutMs?: number;
  /** Docker binary (overridable for tests). */
  dockerBin?: string;
}

/** Sandbox image, overridable via CICD_LAB_SANDBOX_IMAGE. */
export function sandboxImage(): string {
  return process.env.CICD_LAB_SANDBOX_IMAGE || DEFAULT_SANDBOX_IMAGE;
}

/**
 * Pure command builder (no execution): user script bytes travel as a single
 * argv entry to `bash -c` inside the container — never through a host shell.
 * No network, ephemeral (--rm), fixed workdir.
 */
export function buildSandboxCommand(script: string, opts: SandboxOptions = {}): string[] {
  return [
    opts.dockerBin || 'docker',
    'run',
    '--rm',
    '--network=none',
    `--workdir=${SANDBOX_WORKDIR}`,
    opts.image || sandboxImage(),
    'bash',
    '-c',
    script,
  ];
}

export function isDockerAvailable(bin = 'docker'): boolean {
  try {
    execFileSync(bin, ['info', '--format', '{{.ServerVersion}}'], {
      stdio: 'pipe',
      timeout: 5000,
    });
    return true;
  } catch {
    return false;
  }
}

/** Run a script inside the sandbox container and return its stdout. */
export function runSandboxed(
  script: string,
  opts: SandboxOptions = {},
): string {
  const bin = opts.dockerBin || 'docker';
  if (!isDockerAvailable(bin)) {
    throw new Error(
      `Sandbox unavailable: "${bin}" not found or the daemon is unreachable. ` +
        `Stay on dry-run (default) or install Docker for sandboxed execution.`,
    );
  }
  const [, ...args] = buildSandboxCommand(script, { ...opts, dockerBin: bin });
  const out = execFileSync(bin, args, {
    encoding: 'utf-8',
    timeout: opts.timeoutMs ?? 30000,
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 1024 * 1024,
  });
  return typeof out === 'string' ? out : String(out);
}
