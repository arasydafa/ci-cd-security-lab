import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseChallengeMeta } from './schema.js';

const VALID = {
  id: 'demo-challenge',
  title: 'Demo',
  topic: 'github-actions',
  objectives: ['Explain the flaw in one sentence here', 'Fix the flaw and verify with simulation'],
  references: [{ page: 'github-actions', label: 'Guide' }],
  validation: {
    type: 'workflow-check',
    expected: [{ predicate: 'no-interpolation-in-run' }],
  },
};

describe('challenge schema', () => {
  it('accepts a complete valid meta', () => {
    const meta = parseChallengeMeta(VALID);
    assert.equal(meta.id, 'demo-challenge');
    assert.equal(meta.category, 'security');
  });

  it('rejects missing id/title, short objectives, and missing references', () => {
    assert.throws(() => parseChallengeMeta({ ...VALID, id: undefined }), /Invalid/);
    assert.throws(
      () => parseChallengeMeta({ ...VALID, objectives: ['Too short'] }),
      /objectives/,
    );
    assert.throws(() => parseChallengeMeta({ ...VALID, references: [] }), /references/);
  });

  it('rejects unknown predicates and rules with actionable paths', () => {
    assert.throws(
      () =>
        parseChallengeMeta({
          ...VALID,
          validation: { type: 'workflow-check', expected: [{ predicate: 'no-such-check' }] },
        }),
      /Unknown predicate "no-such-check"/,
    );
    assert.throws(
      () =>
        parseChallengeMeta({
          ...VALID,
          validation: {
            type: 'workflow-check',
            expected: [{ predicate: 'no-rule-findings', rules: ['no-such-rule'] }],
          },
        }),
      /Unknown rule "no-such-rule"/,
    );
  });

  it('rejects empty expectations and bad estimated_time', () => {
    assert.throws(
      () =>
        parseChallengeMeta({
          ...VALID,
          validation: { type: 'workflow-check', expected: [{}] },
        }),
      /needs a predicate/,
    );
    assert.throws(
      () => parseChallengeMeta({ ...VALID, estimated_time: 'soon' }),
      /estimated_time/,
    );
  });
});
