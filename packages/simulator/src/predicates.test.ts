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

  it('unknown predicates fail closed with a loud message', () => {
    const yaml = 'name: T\non: push\njobs:\n  t:\n    runs-on: x\n    steps:\n      - run: echo hi\n';
    const workflow = parseWorkflow(yaml);
    const check = predicateCheck('no-such-predicate', { workflow, rawYaml: yaml });
    assert.equal(check, null);
  });
});
