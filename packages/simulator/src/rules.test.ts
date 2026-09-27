import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseWorkflow } from './parser.js';
import { runRules, lineOf, RULES } from './rules.js';

function findingsFor(yaml: string) {
  const workflow = parseWorkflow(yaml);
  return runRules({ workflow, rawYaml: yaml });
}

function ruleIds(yaml: string): string[] {
  return findingsFor(yaml).map((f) => f.ruleId);
}

const BASE = (jobs: string) => `name: Test\non: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n${jobs}`;

describe('rule registry', () => {
  it('exposes a stable ordered registry', () => {
    assert.ok(RULES.length >= 10);
    assert.deepEqual(RULES.map((r) => r.id), [...new Set(RULES.map((r) => r.id))]);
  });

  it('flags secret echo via expression', () => {
    const ids = ruleIds(BASE(`    steps:\n      - run: echo "\${{ secrets.DB_PASS }}"`));
    assert.ok(ids.includes('secrets-echo-expression'));
  });

  it('ignores the documented ::add-mask:: pattern', () => {
    const yaml = [
      'name: Test',
      'on: push',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - name: Mask',
      '        run: |',
      '          echo "::add-mask::${{ secrets.AWS_KEY }}"',
    ].join('\n');
    assert.ok(!ruleIds(yaml).includes('secrets-echo-expression'));
  });

  it('flags printenv but not the word environment', () => {
    const bad = ruleIds(BASE(`    steps:\n      - run: printenv | sort`));
    assert.ok(bad.includes('env-dump'));
    const good = ruleIds(BASE(`    steps:\n      - run: echo "environment ready"`));
    assert.ok(!good.includes('env-dump'));
  });

  it('flags AWS keys in scripts and env blocks', () => {
    const yaml = `name: T\non: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    env:\n      AWS_KEY: AKIAIOSFODNN7EXAMPLE\n    steps:\n      - run: echo hi`;
    assert.ok(ruleIds(yaml).includes('aws-access-key'));
  });

  it('flags hardcoded credentials but skips secret references', () => {
    // Block-scalar run: blocks mirror real workflow files (plain-scalar
    // run: values cannot contain ": " in YAML).
    const bad = ruleIds(
      [
        'name: Test',
        'on: push',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - name: Setup',
        '        run: |',
        '          echo starting',
        '        env:',
        '          DB_PASSWORD: supersecret',
      ].join('\n'),
    );
    // env at step level is parsed; value without ${{ }} is flagged
    assert.ok(bad.includes('hardcoded-credential'));
    const good = ruleIds(
      [
        'name: Test',
        'on: push',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - name: Setup',
        '        run: |',
        '          echo starting',
        '        env:',
        '          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}',
      ].join('\n'),
    );
    assert.ok(!good.includes('hardcoded-credential'));
  });

  it('flags curl|sh and wget|sh with line numbers', () => {
    const yaml = BASE(`    steps:\n      - run: echo start\n      - run: curl -sSL https://example.com/x.sh | bash`);
    const found = findingsFor(yaml).filter((f) => f.ruleId === 'curl-pipe-shell');
    assert.equal(found.length, 1);
    assert.equal(found[0].line, 8);
    assert.equal(found[0].severity, 'critical');
  });

  it('flags direct interpolation of event and inputs contexts', () => {
    const bad = ruleIds(
      [
        'name: Test',
        'on: push',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - name: Build',
        '        run: |',
        '          echo "Title: ${{ github.event.pull_request.title }}"',
        '          echo "${{ inputs.name }}"',
      ].join('\n'),
    );
    assert.equal(bad.filter((id) => id === 'interpolation-in-run').length, 2);
    const good = ruleIds(
      [
        'name: Test',
        'on: push',
        'jobs:',
        '  test:',
        '    runs-on: ubuntu-latest',
        '    steps:',
        '      - name: Build',
        '        env:',
        '          TITLE: ${{ github.event.pull_request.title }}',
        '        run: |',
        '          echo "$TITLE"',
      ].join('\n'),
    );
    assert.ok(!good.includes('interpolation-in-run'));
  });

  it('flags mutable action refs but not SHAs or local actions', () => {
    const yaml = `name: T\non: push\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8\n      - uses: ./local-action`;
    const ids = ruleIds(yaml);
    assert.equal(ids.filter((id) => id === 'unpinned-uses').length, 1);
  });

  it('flags fork checkout under pull_request_target only', () => {
    const bad = `name: T\non: pull_request_target\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: \${{ github.event.pull_request.head.sha }}`;
    assert.ok(ruleIds(bad).includes('pr-target-untrusted-checkout'));
    const safeTrigger = bad.replace('pull_request_target', 'pull_request');
    assert.ok(!ruleIds(safeTrigger).includes('pr-target-untrusted-checkout'));
    const safeCheckout = `name: T\non: pull_request_target\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4`;
    assert.ok(!ruleIds(safeCheckout).includes('pr-target-untrusted-checkout'));
  });

  it('flags missing permissions and accepts explicit blocks', () => {
    assert.ok(ruleIds(BASE(`    steps:\n      - run: echo hi`)).includes('missing-explicit-permissions'));
    const explicit = `name: T\non: push\npermissions: {}\njobs:\n  t:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi`;
    assert.ok(!ruleIds(explicit).includes('missing-explicit-permissions'));
  });

  it('lineOf maps snippets to 1-based lines', () => {
    assert.equal(lineOf('a\nb\nc', 'b'), 2);
    assert.equal(lineOf('a\nb', 'zzz'), undefined);
  });
});
