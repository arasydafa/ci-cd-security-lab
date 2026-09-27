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

  it('flags cache restore in publish context, not in plain CI', () => {
    const release = [
      'name: Release',
      'on:',
      '  release:',
      '    types: [published]',
      'jobs:',
      '  release:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: actions/cache@v4',
      '        with:',
      '          path: ~/.npm',
      "          key: npm-${{ hashFiles('package-lock.json') }}",
      '      - run: npm ci',
      '      - run: npm publish',
    ].join('\n');
    assert.ok(ruleIds(release).includes('cache-in-publish'));
    // Cosmetic evasion: renaming the key still restores attacker-controlled bytes.
    assert.ok(ruleIds(release.replace('npm-${{', 'deps-${{')).includes('cache-in-publish'));
    const plainCi = release.replace('  release:\n    types: [published]', '  push:').replace('      - run: npm publish', '      - run: npm test');
    assert.ok(!ruleIds(plainCi).includes('cache-in-publish'));
    const noCache = release.split('\n').filter((l) => !l.includes('actions/cache') && !l.includes('path: ~/.npm') && !l.includes('key: npm-')).join('\n');
    assert.ok(!ruleIds(noCache).includes('cache-in-publish'));
  });

  it('flags ungated prod deploys, ignores echo-only and staging', () => {
    const bad = [
      'name: Deploy',
      'on: push',
      'jobs:',
      '  deploy-prod:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - run: ./deploy.sh --target prod',
    ].join('\n');
    assert.ok(ruleIds(bad).includes('prod-deploy-without-environment'));
    const gated = bad.replace('    runs-on: ubuntu-latest', '    runs-on: ubuntu-latest\n    environment: production');
    assert.ok(!ruleIds(gated).includes('prod-deploy-without-environment'));
    // Regression: echo-only "Deploying to production" is not a deploy command.
    const echoOnly = [
      'name: Deploy',
      'on: push',
      'jobs:',
      '  build:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - name: Deploy',
      '        run: echo "Deploying to production..."',
    ].join('\n');
    assert.ok(!ruleIds(echoOnly).includes('prod-deploy-without-environment'));
    const staging = bad.replace('deploy-prod', 'deploy-staging').replace('--target prod', '--target staging');
    assert.ok(!ruleIds(staging).includes('prod-deploy-without-environment'));
  });

  it('flags unpinned FROM lines, accepts tag@digest', () => {
    const bad = BASE(
      '    steps:\n      - run: |\n          cat <<EOF > Dockerfile\n          FROM node:20-slim\n          EOF',
    );
    assert.ok(ruleIds(bad).includes('unpinned-base-image'));
    const good = BASE(
      '    steps:\n      - run: |\n          cat <<EOF > Dockerfile\n          FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0\n          EOF',
    );
    assert.ok(!ruleIds(good).includes('unpinned-base-image'));
    const commented = BASE('    steps:\n      - run: echo "FROM node:20-slim"');
    assert.ok(!ruleIds(commented).includes('unpinned-base-image'));
  });

  it('flags publishes without provenance, accepts actions/attest', () => {
    const bad = [
      'name: Release',
      'on:',
      '  release:',
      '    types: [published]',
      'jobs:',
      '  release:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - run: npm ci',
      '      - run: npm publish',
    ].join('\n');
    assert.ok(ruleIds(bad).includes('missing-provenance'));
    const good = bad.replace(
      '      - run: npm publish',
      '      - uses: actions/attest@v4\n        with:\n          subject-path: dist/**\n      - run: npm publish',
    );
    assert.ok(!ruleIds(good).includes('missing-provenance'));
    const plainCi = bad.replace('  release:\n    types: [published]', '  push:').replace('      - run: npm publish', '      - run: npm test');
    assert.ok(!ruleIds(plainCi).includes('missing-provenance'));
  });

  it('flags unsigned pushes, ignores echo-only cosign mentions', () => {
    const bad = BASE('    steps:\n      - run: docker build -t myapp:latest .\n      - run: docker push myapp:latest');
    assert.ok(ruleIds(bad).includes('unsigned-image-push'));
    const signed = bad.replace(
      '      - run: docker push myapp:latest',
      '      - uses: sigstore/cosign-installer@v4\n      - run: cosign sign --yes myapp:latest',
    );
    assert.ok(!ruleIds(signed).includes('unsigned-image-push'));
    // Mentioning cosign in an echo does not sign anything.
    const echoEvasion = bad.replace(
      '      - run: docker push myapp:latest',
      '      - run: |\n          echo "cosign sign --yes myapp:latest"\n          docker push myapp:latest',
    );
    assert.ok(ruleIds(echoEvasion).includes('unsigned-image-push'));
    const noPush = BASE('    steps:\n      - run: docker build -t myapp:latest .');
    assert.ok(!ruleIds(noPush).includes('unsigned-image-push'));
  });

  it('flags broad OIDC trust, accepts scoped sub', () => {
    const bad = BASE(
      '    steps:\n      - run: |\n          aws iam update-assume-role-policy --role-name deploy --policy-document file://trust.json\n          echo {"token.actions.githubusercontent.com:sub": "repo:my-org/*"}',
    );
    assert.ok(ruleIds(bad).includes('broad-oidc-trust'));
    const good = BASE(
      '    steps:\n      - run: |\n          aws iam update-assume-role-policy --role-name deploy --policy-document file://trust.json\n          echo {"token.actions.githubusercontent.com:sub": "repo:my-org/my-app:ref:refs/heads/main"}',
    );
    assert.ok(!ruleIds(good).includes('broad-oidc-trust'));
    // Trust-policy identity lines are not credentials.
    assert.ok(!ruleIds(good).includes('hardcoded-credential'));
    assert.ok(!ruleIds(bad).includes('hardcoded-credential'));
  });

  it('flags OIDC role assumption without id-token: write', () => {
    const bad = [
      'name: Deploy',
      'on: push',
      'permissions:',
      '  contents: read',
      'jobs:',
      '  deploy:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - uses: aws-actions/configure-aws-credentials@v4',
      '        with:',
      '          role-to-assume: arn:aws:iam::123456789012:role/deploy',
      '          aws-region: us-east-1',
    ].join('\n');
    assert.ok(ruleIds(bad).includes('oidc-missing-id-token'));
    const topLevel = bad.replace('  contents: read', '  contents: read\n  id-token: write');
    assert.ok(!ruleIds(topLevel).includes('oidc-missing-id-token'));
    const jobLevel = bad.replace('    runs-on: ubuntu-latest', '    runs-on: ubuntu-latest\n    permissions:\n      id-token: write');
    assert.ok(!ruleIds(jobLevel).includes('oidc-missing-id-token'));
  });

  it('flags whole-secrets dumps, not single references', () => {
    const bad = BASE('    steps:\n      - run: echo "${{ toJSON(secrets) }}"');
    assert.ok(ruleIds(bad).includes('secrets-json-dump'));
    assert.ok(!ruleIds(BASE('    steps:\n      - run: echo "${{ toJSON(github) }}"')).includes('secrets-json-dump'));
  });

  it('lineOf maps snippets to 1-based lines', () => {
    assert.equal(lineOf('a\nb\nc', 'b'), 2);
    assert.equal(lineOf('a\nb', 'zzz'), undefined);
  });
});
