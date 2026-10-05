import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseWorkflow } from './parser.js';
import { predicateCheck, knownPredicates } from './predicates.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// dist/ -> simulator package root -> repo root -> challenges
const CHALLENGES = path.resolve(__dirname, '..', '..', '..', 'challenges');

function loadChallengeFile(level: string, id: string, kind: 'solution' | 'vulnerable'): string {
  const dir = path.join(CHALLENGES, level, id, kind);
  const file = fs
    .readdirSync(dir)
    .find((f) => f.endsWith('.yml') || f.endsWith('.yaml'));
  assert.ok(file, `missing ${kind} workflow for ${id}`);
  return fs.readFileSync(path.join(dir, file), 'utf8');
}

function checkPredicate(yaml: string, predicate: string, rules?: string[]) {
  const workflow = parseWorkflow(yaml);
  const check = predicateCheck(predicate, { workflow, rawYaml: yaml }, { rules });
  assert.ok(check, `unknown predicate ${predicate}`);
  return check;
}

describe('predicates', () => {
  it('exposes the known predicate set', () => {
    assert.deepEqual(knownPredicates().sort(), [
      'all-uses-pinned',
      'has-explicit-permissions',
      'no-interpolation-in-run',
      'no-rule-findings',
      'no-write-all',
    ]);
  });

  it('script-injection: solution passes, vulnerable fails', () => {
    const solution = loadChallengeFile('intermediate', '03-script-injection', 'solution');
    const vulnerable = loadChallengeFile('intermediate', '03-script-injection', 'vulnerable');
    const ok = checkPredicate(solution, 'no-interpolation-in-run');
    assert.equal(ok.passed, true);
    const bad = checkPredicate(vulnerable, 'no-interpolation-in-run');
    assert.equal(bad.passed, false);
    assert.ok(bad.message && bad.message.includes('line'));
    assert.ok(bad.whyItMatters && bad.whyItMatters.length > 0);
    assert.ok(bad.reference);
  });

  it('script-injection: cosmetic evasion still fails', () => {
    // Attacker-controlled context via a different accessor must still trip.
    const evasion = [
      'name: T',
      'on: push',
      'jobs:',
      '  t:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - name: Build',
      '        run: |',
      '          echo "Ref: ${{ github.head_ref }}"',
    ].join('\n');
    const check = checkPredicate(evasion, 'no-interpolation-in-run');
    assert.equal(check.passed, false);
    assert.ok(check.message && check.message.includes('github.head_ref'));
  });

  it('non-attacker contexts stay clean', () => {
    const clean = [
      'name: T',
      'on: push',
      'jobs:',
      '  t:',
      '    runs-on: ubuntu-latest',
      '    steps:',
      '      - name: Build',
      '        run: |',
      '          echo "SHA: ${{ github.sha }}"',
    ].join('\n');
    assert.equal(checkPredicate(clean, 'no-interpolation-in-run').passed, true);
  });

  it('permissions-overkill: solution passes, vulnerable fails breadth check', () => {
    const solution = loadChallengeFile('beginner', '02-permissions-overkill', 'solution');
    const vulnerable = loadChallengeFile('beginner', '02-permissions-overkill', 'vulnerable');
    assert.equal(checkPredicate(solution, 'no-write-all').passed, true);
    assert.equal(checkPredicate(solution, 'has-explicit-permissions').passed, true);
    assert.equal(checkPredicate(vulnerable, 'no-write-all').passed, false);
    // write-all IS explicit — explicitness passes, breadth fails. Correct semantics.
    assert.equal(checkPredicate(vulnerable, 'has-explicit-permissions').passed, true);
  });

  it('unsafe-deps: SHA-pinned solution passes, tag-based fails', () => {
    const solution = loadChallengeFile('beginner', '03-unsafe-deps', 'solution');
    const vulnerable = loadChallengeFile('beginner', '03-unsafe-deps', 'vulnerable');
    assert.equal(checkPredicate(solution, 'all-uses-pinned').passed, true);
    const bad = checkPredicate(vulnerable, 'all-uses-pinned');
    assert.equal(bad.passed, false);
    assert.ok(bad.message && bad.message.includes('@v'));
  });

  it('unknown predicates fail closed with a loud message', () => {
    const yaml = 'name: T\non: push\njobs:\n  t:\n    runs-on: x\n    steps:\n      - run: echo hi\n';
    const workflow = parseWorkflow(yaml);
    const check = predicateCheck('no-such-predicate', { workflow, rawYaml: yaml });
    assert.equal(check, null);
  });

  it('migrated challenges: solutions pass, vulnerable fail', () => {
    const cases: { level: string; id: string; predicate: string; rules?: string[] }[] = [
      { level: 'advanced', id: '01-reusable-workflow-injection', predicate: 'no-interpolation-in-run' },
      {
        level: 'beginner',
        id: '01-secrets-leak',
        predicate: 'no-rule-findings',
        rules: ['aws-access-key', 'hardcoded-credential', 'secrets-echo-expression'],
      },
      {
        level: 'beginner',
        id: '04-error-swallowing',
        predicate: 'no-rule-findings',
        rules: ['error-swallow'],
      },
      {
        level: 'beginner',
        id: '05-unverified-script',
        predicate: 'no-rule-findings',
        rules: ['curl-pipe-shell', 'wget-pipe-shell'],
      },
      {
        level: 'beginner',
        id: '06-env-dumping',
        predicate: 'no-rule-findings',
        rules: ['env-dump'],
      },
      {
        level: 'intermediate',
        id: '01-supply-chain-attack',
        predicate: 'no-rule-findings',
        rules: ['env-dump'],
      },
      {
        level: 'intermediate',
        id: '04-oidc-misconfig',
        predicate: 'no-rule-findings',
        rules: ['oidc-missing-id-token', 'broad-oidc-trust', 'aws-access-key', 'hardcoded-credential'],
      },
      {
        level: 'intermediate',
        id: '05-self-hosted-risk',
        predicate: 'no-rule-findings',
        rules: ['self-hosted-runner'],
      },
    ];
    for (const c of cases) {
      const solution = loadChallengeFile(c.level, c.id, 'solution');
      const vulnerable = loadChallengeFile(c.level, c.id, 'vulnerable');
      assert.equal(checkPredicate(solution, c.predicate, c.rules).passed, true, `${c.id} solution`);
      assert.equal(checkPredicate(vulnerable, c.predicate, c.rules).passed, false, `${c.id} vulnerable`);
    }
  });

  it('fase 4a (cache flow): solutions pass, vulnerable fail', () => {
    const cases: { level: string; id: string; predicate: string; rules?: string[] }[] = [
      {
        level: 'intermediate',
        id: '10-cache-poisoning',
        predicate: 'no-rule-findings',
        rules: ['cache-in-publish'],
      },
      {
        level: 'advanced',
        id: '06-pr-target-pwn',
        predicate: 'no-rule-findings',
        rules: ['pr-target-untrusted-checkout'],
      },
      {
        level: 'intermediate',
        id: '11-ungated-prod',
        predicate: 'no-rule-findings',
        rules: ['prod-deploy-without-environment'],
      },
    ];
    for (const c of cases) {
      const solution = loadChallengeFile(c.level, c.id, 'solution');
      const vulnerable = loadChallengeFile(c.level, c.id, 'vulnerable');
      assert.equal(checkPredicate(solution, c.predicate, c.rules).passed, true, `${c.id} solution`);
      assert.equal(checkPredicate(vulnerable, c.predicate, c.rules).passed, false, `${c.id} vulnerable`);
    }
  });

  it('fase 4b (supply chain): solutions pass, vulnerable fail', () => {
    const cases: { level: string; id: string; predicate: string; rules?: string[] }[] = [
      {
        level: 'intermediate',
        id: '12-docker-digest-pin',
        predicate: 'no-rule-findings',
        rules: ['unpinned-base-image'],
      },
      {
        level: 'advanced',
        id: '07-slsa-provenance',
        predicate: 'no-rule-findings',
        rules: ['missing-provenance'],
      },
      {
        level: 'intermediate',
        id: '13-cosign-sign',
        predicate: 'no-rule-findings',
        rules: ['unsigned-image-push'],
      },
    ];
    for (const c of cases) {
      const solution = loadChallengeFile(c.level, c.id, 'solution');
      const vulnerable = loadChallengeFile(c.level, c.id, 'vulnerable');
      assert.equal(checkPredicate(solution, c.predicate, c.rules).passed, true, `${c.id} solution`);
      assert.equal(checkPredicate(vulnerable, c.predicate, c.rules).passed, false, `${c.id} vulnerable`);
    }
  });

  it('fase 4c (oidc lifecycle): solutions pass, vulnerable fail', () => {
    const cases: { level: string; id: string; predicate: string; rules?: string[] }[] = [
      {
        level: 'intermediate',
        id: '04-oidc-misconfig',
        predicate: 'no-rule-findings',
        rules: ['oidc-missing-id-token', 'broad-oidc-trust', 'aws-access-key', 'hardcoded-credential'],
      },
      {
        level: 'intermediate',
        id: '14-secrets-lifecycle',
        predicate: 'no-rule-findings',
        rules: ['hardcoded-credential', 'secrets-json-dump'],
      },
    ];
    for (const c of cases) {
      const solution = loadChallengeFile(c.level, c.id, 'solution');
      const vulnerable = loadChallengeFile(c.level, c.id, 'vulnerable');
      assert.equal(checkPredicate(solution, c.predicate, c.rules).passed, true, `${c.id} solution`);
      assert.equal(checkPredicate(vulnerable, c.predicate, c.rules).passed, false, `${c.id} vulnerable`);
    }
  });

  it('fase 4c: cosmetic evasions still fail', () => {
    // Scoping one line while leaving a wildcard elsewhere still fails.
    const oidcSolution = loadChallengeFile('intermediate', '04-oidc-misconfig', 'solution');
    const oidcEvasion = oidcSolution.replace(
      'ref:refs/heads/main',
      'ref:refs/heads/main", "extra": "repo:my-org/*',
    );
    assert.equal(
      checkPredicate(oidcEvasion, 'no-rule-findings', ['broad-oidc-trust']).passed,
      false,
    );
    // Masking the dump output does not remove the serialization.
    const lifecycleSolution = loadChallengeFile('intermediate', '14-secrets-lifecycle', 'solution');
    const lifecycleEvasion = lifecycleSolution.replace(
      '      - name: Deploy',
      '      - name: Audit secrets\n        run: echo "${{ toJSON(secrets) }}" | sha256sum\n\n      - name: Deploy',
    );
    assert.equal(
      checkPredicate(lifecycleEvasion, 'no-rule-findings', ['secrets-json-dump']).passed,
      false,
    );
  });

  it('fase 4b: cosmetic evasions still fail', () => {
    // A comment claiming a digest does not pin the FROM line.
    const digestSolution = loadChallengeFile('intermediate', '12-docker-digest-pin', 'solution');
    const digestEvasion = digestSolution.replace(
      'FROM node:20-slim@sha256:',
      '# pinned to digest\n          FROM node:20-slim',
    );
    assert.equal(checkPredicate(digestEvasion, 'no-rule-findings', ['unpinned-base-image']).passed, false);
  });

  it('fase 4a: cosmetic evasions still fail', () => {
    // Renaming the cache key does not remove the publish-context restore.
    const cacheSolution = loadChallengeFile('intermediate', '10-cache-poisoning', 'solution');
    const cacheEvasion = cacheSolution.replace(
      '      - name: Install dependencies',
      '      - uses: actions/cache@v4\n        with:\n          path: ~/.npm\n          key: totally-different-key\n\n      - name: Install dependencies',
    );
    assert.equal(checkPredicate(cacheEvasion, 'no-rule-findings', ['cache-in-publish']).passed, false);
    // A non-production environment name does not gate a prod deploy.
    const prodSolution = loadChallengeFile('intermediate', '11-ungated-prod', 'solution');
    const prodEvasion = prodSolution.replace('environment: production', 'environment: staging');
    assert.equal(
      checkPredicate(prodEvasion, 'no-rule-findings', ['prod-deploy-without-environment']).passed,
      false,
    );
  });
});
