import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkflow } from './parser.js';
import { simulate } from './simulator.js';

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
});
