import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSandboxCommand,
  isDockerAvailable,
  runSandboxed,
  sandboxImage,
  DEFAULT_SANDBOX_IMAGE,
} from './sandbox.js';

describe('sandbox', () => {
  it('builds an ephemeral no-network container command', () => {
    const cmd = buildSandboxCommand('echo hi');
    assert.deepEqual(
      cmd.slice(0, 6),
      ['docker', 'run', '--rm', '--network=none', '--workdir=/work', DEFAULT_SANDBOX_IMAGE],
    );
    assert.deepEqual(cmd.slice(6), ['bash', '-c', 'echo hi']);
  });

  it('respects image override and env default', () => {
    assert.equal(buildSandboxCommand('x', { image: 'alpine:3.21' })[5], 'alpine:3.21');
    assert.equal(sandboxImage(), DEFAULT_SANDBOX_IMAGE);
  });

  it('script travels as one argv entry (no host-shell interpolation)', () => {
    const evil = 'echo hi; rm -rf /tmp/pwned';
    const cmd = buildSandboxCommand(evil);
    assert.equal(cmd[cmd.length - 1], evil);
  });

  it('reports missing docker as an actionable error', () => {
    assert.equal(isDockerAvailable('definitely-not-docker-xyz'), false);
    assert.throws(
      () => runSandboxed('echo hi', { dockerBin: 'definitely-not-docker-xyz' }),
      /Sandbox unavailable/,
    );
  });
});
