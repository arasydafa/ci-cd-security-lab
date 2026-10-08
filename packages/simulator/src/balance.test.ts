import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  availableBalance,
  availableForChallenge,
  bankedPoints,
  canOpenHint,
  hintCost,
  hintHolds,
  type BalanceChallenge,
} from '@cicd-lab/shared';

// Beginner-shaped fixtures: 100-pt challenges, 25-pt hint penalty.
const challenges: BalanceChallenge[] = [
  { id: 'a', points: 100, hintsPenalty: 25 },
  { id: 'b', points: 100, hintsPenalty: 25 },
  { id: 'c', points: 150, hintsPenalty: 30 },
];

describe('bankedPoints', () => {
  it('sums completed bestScore, capped at each challenge max', () => {
    const progress = {
      a: { completed: true, bestScore: 120 }, // bonus pushed it over 100
      b: { completed: true, bestScore: 80 },
      c: { completed: false, bestScore: 0 },
    };
    // 120 capped to 100, plus 80. In-progress contributes nothing.
    assert.equal(bankedPoints(progress, challenges), 180);
  });
});

describe('hintHolds / availableBalance', () => {
  it('holds penalty per open hint on unfinished challenges only', () => {
    const progress = {
      a: { completed: true, bestScore: 100 },
      b: { completed: false, hintsUsed: 2 }, // holds 2*25 = 50
      c: { completed: true, bestScore: 150 },
    };
    assert.equal(hintHolds(progress, challenges), 50);
    // banked 250 - held 50 = 200 free
    assert.equal(availableBalance(progress, challenges), 200);
  });

  it('never returns negative', () => {
    const progress = { a: { completed: false, hintsUsed: 9 } }; // holds 225, banked 0
    assert.equal(availableBalance(progress, challenges), 0);
  });
});

describe('availableForChallenge', () => {
  it('excludes the target challenge own hold, unlike availableBalance', () => {
    // banked 100 (b). a holds 25 (1 hint), c holds 30 (1 hint).
    const progress = {
      a: { completed: false, hintsUsed: 1 },
      b: { completed: true, bestScore: 100 },
      c: { completed: false, hintsUsed: 1 },
    };
    // Global free balance subtracts EVERY hold, including a's own...
    assert.equal(availableBalance(progress, challenges), 45); // 100 - 25 - 30
    // ...but the gate's budget for `a` excludes a's own hold (a new hint would
    // add to it), so it only subtracts the OTHER challenge's hold.
    assert.equal(availableForChallenge(progress, challenges, 'a'), 70); // 100 - 30
  });

  it('includes a completed challenge own banked points', () => {
    const progress = { a: { completed: true, bestScore: 90 } };
    // Nothing else holds points, so the full banked score is spendable here.
    assert.equal(availableForChallenge(progress, challenges, 'a'), 90);
  });
});

describe('canOpenHint', () => {
  it('blocks the very first hint on a fresh account (0 banked)', () => {
    // The core regression: no points yet => hints locked.
    assert.equal(canOpenHint({}, challenges, 'a', 1), false);
  });

  it('allows hint 1 once banked points cover its cost', () => {
    const progress = { b: { completed: true, bestScore: 100 } };
    assert.equal(canOpenHint(progress, challenges, 'a', 1), true);
  });

  it('allows cumulative hint 2 only when 2*penalty still fits', () => {
    // 100 banked can cover hint 2 (holds 50) but not hint 3 (holds 75)?
    // 100 >= 50 -> yes; then test a tighter case below.
    const progress = { b: { completed: true, bestScore: 100 } };
    assert.equal(canOpenHint(progress, challenges, 'a', 2), true);

    // 40 banked: hint 1 (25) fits, hint 2 (50) does not.
    const poor = { b: { completed: true, bestScore: 40 } };
    assert.equal(canOpenHint(poor, challenges, 'a', 1), true);
    assert.equal(canOpenHint(poor, challenges, 'a', 2), false);
  });

  it('always allows re-viewing already-opened hints', () => {
    // a has 2 hints open and 0 banked; re-viewing hint 1/2 stays allowed.
    const progress = { a: { completed: false, hintsUsed: 2 } };
    assert.equal(canOpenHint(progress, challenges, 'a', 1), true);
    assert.equal(canOpenHint(progress, challenges, 'a', 2), true);
  });

  it('counts other challenges holds against the same balance', () => {
    // 100 banked. b holds 75 (3 hints) => only 25 free => a hint 1 (25) fits,
    // a hint 2 (50) does not.
    const progress = {
      b: { completed: false, hintsUsed: 3 },
      c: { completed: true, bestScore: 100 },
    };
    // banked = 100 (c capped). b holds 75. free = 25.
    assert.equal(canOpenHint(progress, challenges, 'a', 1), true);
    assert.equal(canOpenHint(progress, challenges, 'a', 2), false);
  });

  it('opens hint k exactly when budget >= hintCost(challenge, k)', () => {
    // 100 banked elsewhere, nothing else held => budget for `a` is 100.
    const progress = { b: { completed: true, bestScore: 100 } };
    const a = challenges[0]; // 100 pts, 25 penalty
    const budget = availableForChallenge(progress, challenges, 'a');
    assert.equal(budget, 100);
    // Hints 1-4 cost 25/50/75/100 => all fit. Hint 5 costs 125 => blocked.
    for (const k of [1, 2, 3, 4]) {
      assert.equal(canOpenHint(progress, challenges, 'a', k), budget >= hintCost(a, k));
    }
    assert.equal(canOpenHint(progress, challenges, 'a', 5), false);
  });

  it('lets a completed challenge open hints while its balance is non-negative', () => {
    // Completed => no new hold is created, so only a non-negative budget matters.
    const progress = { a: { completed: true, bestScore: 10 } };
    assert.equal(canOpenHint(progress, challenges, 'a', 2), true);
  });

  it('returns false for an unknown challenge id', () => {
    assert.equal(canOpenHint({}, challenges, 'nope', 1), false);
  });
});

describe('hintCost', () => {
  it('is cumulative penalty * k', () => {
    assert.equal(hintCost(challenges[0], 3), 75);
    assert.equal(hintCost(challenges[2], 2), 60);
  });
});
