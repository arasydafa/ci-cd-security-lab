import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkflow } from './parser.js';
import { simulate } from './simulator.js';
import { resolveExecMode } from './executor.js';

function workflowWithRun(runBody: string): string {
  // Executor runs bash everywhere except explicit pwsh; match the host.
  const shell = process.platform === 'win32' ? 'pwsh' : 'bash';
  return [
    'name: T',
    'on: push',
    'jobs:',
    '  t:',
    '    runs-on: ubuntu-latest',
    '    steps:',
    '      - name: Probe',
    `        shell: ${shell}`,
    '        run: |',
    ...runBody.split('\n').map((l) => `          ${l}`),
  ].join('\n');
}

describe('executor gate', () => {
  it('dry-runs scripts by default (no host execution)', async () => {
    delete process.env.CICD_LAB_EXEC;
    const workflow = parseWorkflow(workflowWithRun('echo EXEC_MARKER_123'));
    const result = await simulate({ workflow, rawYaml: '' });
    const step = result.jobs[0].steps[0];
    assert.equal(step.status, 'success');
    assert.ok(step.output.includes('[dry-run]'), `expected dry-run marker, got: ${step.output}`);
  });

  it('executes scripts only with CICD_LAB_EXEC=1', async () => {
    process.env.CICD_LAB_EXEC = '1';
    try {
      const workflow = parseWorkflow(workflowWithRun('echo EXEC_MARKER_123'));
      const result = await simulate({ workflow, rawYaml: '' });
      const step = result.jobs[0].steps[0];
      assert.equal(step.status, 'success');
      assert.ok(!step.output.includes('[dry-run]'), `must be a real run, got: ${step.output}`);
      assert.ok(step.output.includes('EXEC_MARKER_123'), `missing marker, got: ${step.output}`);
    } finally {
      delete process.env.CICD_LAB_EXEC;
    }
  });

  it('deterministic simulations are byte-identical', async () => {
    delete process.env.CICD_LAB_EXEC;
    const yaml = workflowWithRun('echo hello');
    const runOnce = () => simulate({ workflow: parseWorkflow(yaml), rawYaml: yaml, deterministic: true });
    const a = await runOnce();
    const b = await runOnce();
    assert.equal(JSON.stringify(a), JSON.stringify(b));
    assert.ok(a.startTime.startsWith('2026-01-01'), `fixed clock, got: ${a.startTime}`);
    assert.ok(a.jobs[0].steps[0].output.includes('[dry-run]'));
  });

  it('resolveExecMode maps unset/1/host/sandbox/garbage', () => {
    const prev = process.env.CICD_LAB_EXEC;
    try {
      delete process.env.CICD_LAB_EXEC;
      assert.equal(resolveExecMode(), 'dry-run');
      process.env.CICD_LAB_EXEC = '1';
      assert.equal(resolveExecMode(), 'host');
      process.env.CICD_LAB_EXEC = 'host';
      assert.equal(resolveExecMode(), 'host');
      process.env.CICD_LAB_EXEC = 'sandbox';
      assert.equal(resolveExecMode(), 'sandbox');
      process.env.CICD_LAB_EXEC = 'yolo';
      assert.equal(resolveExecMode(), 'dry-run');
    } finally {
      if (prev === undefined) delete process.env.CICD_LAB_EXEC;
      else process.env.CICD_LAB_EXEC = prev;
    }
  });
});
