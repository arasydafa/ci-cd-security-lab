import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { clampThreshold, computeScore, parseEstimatedTime } from './scoring.js';
import { ChallengeManager } from './challenges.js';

describe('parseEstimatedTime', () => {
  it('parses minutes used by every challenge', () => {
    assert.equal(parseEstimatedTime('10m'), 600_000);
    assert.equal(parseEstimatedTime('8m'), 480_000);
    assert.equal(parseEstimatedTime('20m'), 1_200_000);
  });

  it('returns 0 for garbage so the bonus never applies', () => {
    assert.equal(parseEstimatedTime(''), 0);
    assert.equal(parseEstimatedTime('soon'), 0);
  });
});

describe('clampThreshold', () => {
  it('defaults to 1 (all must pass) and clamps to 0..1', () => {
    assert.equal(clampThreshold(undefined), 1);
    assert.equal(clampThreshold('0.5'), 1);
    assert.equal(clampThreshold(0.75), 0.75);
    assert.equal(clampThreshold(2), 1);
    assert.equal(clampThreshold(-1), 0);
  });
});

describe('computeScore', () => {
  const base = {
    basePoints: 100,
    hintsUsed: 0,
    hintsPenalty: 25,
    timeBonus: 50,
    estimatedTime: '10m',
    threshold: 1,
    elapsedMs: undefined as number | undefined,
  };

  it('stays backward compatible on full pass without timing', () => {
    const s = computeScore({ ...base, passedChecks: 3, totalChecks: 3 });
    assert.equal(s.passed, true);
    assert.equal(s.finalScore, 100);
    assert.equal(s.timeBonusAwarded, 0);
    assert.equal(s.passedChecks, 3);
    assert.equal(s.totalChecks, 3);
  });

  it('awards partial points on failure: 3-of-4 issues is not zero', () => {
    const s = computeScore({ ...base, basePoints: 200, passedChecks: 3, totalChecks: 4 });
    assert.equal(s.passed, false);
    assert.equal(s.partialRatio, 0.75);
    assert.equal(s.finalScore, 150);
  });

  it('applies the threshold: 3-of-4 passes at 0.75', () => {
    const s = computeScore({ ...base, basePoints: 200, threshold: 0.75, passedChecks: 3, totalChecks: 4 });
    assert.equal(s.passed, true);
    assert.equal(s.finalScore, 150);
  });

  it('deducts hints from the partial, floored at zero', () => {
    const s = computeScore({ ...base, passedChecks: 1, totalChecks: 4, hintsUsed: 2 });
    // basePartial 25 - deductions 50 -> 0, never negative.
    assert.equal(s.finalScore, 0);
    assert.equal(s.totalDeductions, 50);
  });

  it('grants time_bonus only when solved within estimatedTime', () => {
    const fast = computeScore({ ...base, passedChecks: 2, totalChecks: 2, elapsedMs: 60_000 });
    assert.equal(fast.timeBonusAwarded, 50);
    assert.equal(fast.finalScore, 150);

    const slow = computeScore({ ...base, passedChecks: 2, totalChecks: 2, elapsedMs: 3_600_000 });
    assert.equal(slow.timeBonusAwarded, 0);
    assert.equal(slow.finalScore, 100);

    const failed = computeScore({ ...base, passedChecks: 1, totalChecks: 2, elapsedMs: 1_000 });
    assert.equal(failed.timeBonusAwarded, 0);
  });

  it('charges solutionViewed as all hints used + forfeits time_bonus', () => {
    // 2 hints on a 100-pt challenge: viewing the solution costs 2*25 = 50.
    const s = computeScore({
      ...base,
      passedChecks: 3,
      totalChecks: 3,
      hintsUsed: 0,
      totalHints: 2,
      solutionViewed: true,
      elapsedMs: 30_000, // fast, but bonus must still be forfeited
    });
    assert.equal(s.passed, true);
    assert.equal(s.hintsUsed, 2);
    assert.equal(s.totalDeductions, 50);
    assert.equal(s.timeBonusAwarded, 0);
    assert.equal(s.finalScore, 50);
  });

  it('solutionViewed never out-scores solving with the same hints', () => {
    const opts = { ...base, passedChecks: 3, totalChecks: 3, totalHints: 2, elapsedMs: undefined as number | undefined };
    const withSolution = computeScore({ ...opts, hintsUsed: 0, solutionViewed: true });
    const withHints = computeScore({ ...opts, hintsUsed: 2, solutionViewed: false });
    assert.equal(withSolution.finalScore, withHints.finalScore);
  });

  it('solutionViewed keeps the higher of actual vs all-hints penalty', () => {
    // Already used all hints: solutionViewed must not reduce the deduction.
    const s = computeScore({
      ...base,
      passedChecks: 3,
      totalChecks: 3,
      hintsUsed: 2,
      totalHints: 2,
      solutionViewed: true,
    });
    assert.equal(s.hintsUsed, 2);
    assert.equal(s.totalDeductions, 50);
  });
});

describe('fair scoring integration', () => {
  it('solution passes with full base; vulnerable fails (threshold 1 preserved)', async () => {
    const manager = new ChallengeManager();
    const solution = manager.getSolutionWorkflow('secrets-leak');
    assert.ok(solution);
    const ok = await manager.runSimulation('secrets-leak', solution);
    assert.equal(ok.validation.passed, true);
    assert.equal(ok.score.passed, true);
    assert.equal(ok.score.finalScore, 100);
    assert.equal(ok.score.passedChecks, ok.score.totalChecks);

    const bad = await manager.runSimulation('secrets-leak');
    assert.equal(bad.validation.passed, false);
    assert.equal(bad.score.passed, false);
  });

  it('a half-fixed workflow scores above zero and reports X/Y fixed', async () => {
    const manager = new ChallengeManager();
    const solution = manager.getSolutionWorkflow('oidc-misconfig');
    assert.ok(solution);
    // Reintroduce one issue: a hardcoded credential in a new step.
    const halfFixed = solution.replace(
      '      - name: Deploy',
      '      - name: Legacy key export\n        run: export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n\n      - name: Deploy',
    );
    const r = await manager.runSimulation('oidc-misconfig', halfFixed);
    assert.equal(r.score.totalChecks, 3);
    assert.ok(r.score.passedChecks < 3 && r.score.passedChecks >= 1);
    assert.ok(r.score.finalScore > 0);
    assert.equal(r.score.passed, false);
    assert.equal(r.validation.passed, r.score.passed);
  });

  it('fast solutions earn time_bonus end to end', async () => {
    const manager = new ChallengeManager();
    const solution = manager.getSolutionWorkflow('secrets-leak');
    assert.ok(solution);
    const r = await manager.runSimulation('secrets-leak', solution, 0, 30_000);
    assert.equal(r.score.timeBonusAwarded, 50);
    assert.equal(r.score.finalScore, 150);
  });
});
