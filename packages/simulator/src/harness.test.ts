import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ChallengeManager } from './challenges.js';
import { auditAll, listFixtures } from './harness.js';
import { registerRule, isKnownRule } from './rules.js';
import { parseChallengeMeta } from './schema.js';

describe('authoring harness', () => {
  it('every fixture passes the full audit (schema, files, verdicts, evasions)', async () => {
    const manager = new ChallengeManager();
    const fixtures = listFixtures();
    assert.ok(fixtures.length >= 20, `expected at least 20 challenges, found ${fixtures.length}`);
    const failures = await auditAll(manager);
    assert.deepEqual(
      failures.map((f) => `${f.id}: ${f.problems.join(' | ')}`),
      [],
    );
  });

  it('registerRule validates shape, rejects duplicates, and wires into schema', () => {
    assert.throws(() => registerRule({} as never), /object|kebab-case/);
    assert.throws(
      () =>
        registerRule({
          id: 'Not Kebab',
          severity: 'info',
          category: 'test',
          summary: 's',
          whyItMatters: 'w',
          fixHint: 'f',
          detect: () => [],
        }),
      /kebab-case/,
    );
    assert.throws(
      () =>
        registerRule({
          id: 'unpinned-uses',
          severity: 'info',
          category: 'test',
          summary: 's',
          whyItMatters: 'w',
          fixHint: 'f',
          detect: () => [],
        }),
      /duplicate rule id/,
    );
    assert.throws(
      () =>
        registerRule({
          id: 'harness-probe-rule',
          severity: 'info',
          category: 'test',
          summary: 's',
          whyItMatters: 'w',
          fixHint: 'f',
          detect: 'nope' as never,
        }),
      /detect/,
    );

    registerRule({
      id: 'harness-probe-rule',
      severity: 'info',
      category: 'test',
      summary: 'Harness probe',
      whyItMatters: 'Proves the registry accepts author rules.',
      fixHint: 'Remove the marker.',
      detect: ({ rawYaml }) =>
        rawYaml.includes('HARNESS_PROBE_MARKER_ZZZ')
          ? [
              {
                ruleId: 'harness-probe-rule',
                severity: 'info',
                category: 'test',
                message: 'probe marker found',
              },
            ]
          : [],
    });
    assert.ok(isKnownRule('harness-probe-rule'));
    // Newly registered rules are immediately usable in challenge validation.
    const meta = parseChallengeMeta({
      id: 'probe',
      title: 'Probe',
      objectives: ['First observable objective here', 'Second observable objective here'],
      references: [{ page: 'github-actions', label: 'Guide' }],
      validation: {
        type: 'workflow-check',
        expected: [{ predicate: 'no-rule-findings', rules: ['harness-probe-rule'] }],
      },
    });
    assert.deepEqual(meta.validation.expected[0].rules, ['harness-probe-rule']);
  });
});
