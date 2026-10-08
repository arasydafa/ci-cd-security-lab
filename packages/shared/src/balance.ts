/**
 * Global points-as-balance model for hint gating.
 *
 * A learner's completed challenges bank points. Opening a hint places a *hold*
 * on `hints_used_penalty` points of that balance; the hold is exactly the
 * deduction the challenge scoring will apply at solve time (see the simulator's
 * `computeScore`), so there is no double counting — the hold is provisional and
 * becomes real only when the challenge is scored.
 *
 * A hint may only be revealed when the free balance can cover the new total
 * hold. This prevents the old behavior where a learner with zero points could
 * reveal every hint.
 *
 * The same functions are used by the CLI and the web UI so the two surfaces
 * always agree. Progress is passed in as a plain record (localStorage on the
 * web, ~/.cicd-lab-progress.json in the CLI) so this module stays pure.
 */

/** The progress fields the balance math needs. */
export interface BalanceProgressEntry {
  bestScore?: number;
  completed?: boolean;
  hintsUsed?: number;
}

export type BalanceProgress = Record<string, BalanceProgressEntry | undefined>;

/** The challenge fields the balance math needs. */
export interface BalanceChallenge {
  id: string;
  points: number;
  /** Challenge scoring.hints_used_penalty. */
  hintsPenalty: number;
}

/**
 * Points banked by completed challenges, capped at each challenge's max points
 * (so a time_bonus that pushes finalScore above points is not double counted).
 */
export function bankedPoints(
  progress: BalanceProgress,
  challenges: BalanceChallenge[],
): number {
  let total = 0;
  for (const c of challenges) {
    const p = progress[c.id];
    if (!p?.completed) continue;
    total += Math.min(p.bestScore ?? 0, c.points);
  }
  return total;
}

/**
 * Hint holds currently placed by still-unfinished challenges. Each open hint on
 * an in-progress challenge reserves its penalty, which will be deducted from
 * that challenge's score when it is solved.
 */
export function hintHolds(
  progress: BalanceProgress,
  challenges: BalanceChallenge[],
): number {
  let total = 0;
  for (const c of challenges) {
    const p = progress[c.id];
    if (!p || p.completed) continue;
    total += (p.hintsUsed ?? 0) * c.hintsPenalty;
  }
  return total;
}

/** Free balance available to place new hint holds. Never negative. */
export function availableBalance(
  progress: BalanceProgress,
  challenges: BalanceChallenge[],
): number {
  return Math.max(0, bankedPoints(progress, challenges) - hintHolds(progress, challenges));
}

/**
 * Points available to place NEW hint holds on `challengeId`: banked points from
 * completed challenges, minus holds placed by every OTHER unfinished challenge.
 *
 * This challenge's own hold is deliberately excluded — it is exactly what a new
 * hint would add, so it is the amount the gate compares a hint's cost against.
 * Compare against `hintCost(challenge, k)` to explain why a hint is locked.
 * (Negative only if a hand-edited progress file is over-committed; the gate
 * treats that as "everything locked".)
 */
export function availableForChallenge(
  progress: BalanceProgress,
  challenges: BalanceChallenge[],
  challengeId: string,
): number {
  const banked = bankedPoints(progress, challenges);
  let holds = 0;
  for (const ch of challenges) {
    if (ch.id === challengeId) continue;
    const e = progress[ch.id];
    if (!e || e.completed) continue;
    holds += (e.hintsUsed ?? 0) * ch.hintsPenalty;
  }
  return banked - holds;
}

/**
 * Whether hint `k` (1-based, cumulative: opening hint 3 sets hintsUsed to 3)
 * may be revealed on `challengeId`.
 *
 * Re-viewing already-opened hints (k <= hintsUsed) is always allowed. Otherwise
 * the budget this challenge can draw on (`availableForChallenge`) must cover the
 * hint's cost. A completed challenge adds no new hold — its points are already
 * banked and `bestScore` only ever rises — so it just needs a non-negative
 * balance. Net effect: the total hint holds across every in-progress challenge
 * can never exceed the points banked so far.
 */
export function canOpenHint(
  progress: BalanceProgress,
  challenges: BalanceChallenge[],
  challengeId: string,
  k: number,
): boolean {
  const c = challenges.find((x) => x.id === challengeId);
  if (!c) return false;

  const p = progress[challengeId];
  const used = p?.hintsUsed ?? 0;
  if (k <= used) return true; // already paid for

  const budget = availableForChallenge(progress, challenges, challengeId);
  return budget >= (p?.completed ? 0 : c.hintsPenalty * k);
}

/** Cost in points to reveal hint `k` on a challenge (cumulative). */
export function hintCost(challenge: BalanceChallenge, k: number): number {
  return challenge.hintsPenalty * k;
}
