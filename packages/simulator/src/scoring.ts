import type { ScoreResult } from '@cicd-lab/shared';

export interface ScoreInput {
  basePoints: number;
  hintsUsed: number;
  hintsPenalty: number;
  timeBonus: number;
  estimatedTime: string;
  /** Fraction of checks required to pass (0..1). */
  threshold: number;
  passedChecks: number;
  totalChecks: number;
  /** Wall-clock solve time in ms (first touch → pass). Absent = no bonus. */
  elapsedMs?: number;
  /** Total hints the challenge offers. Used to charge "solution = all hints". */
  totalHints?: number;
  /**
   * True once the learner revealed the solution. The solution is charged as if
   * every hint had been used (max hint penalty) and forfeits the time bonus —
   * so copying the answer never out-scores a real solve.
   */
  solutionViewed?: boolean;
}

/**
 * Parse an estimated time like "10m" or "1.5h" into milliseconds.
 * Returns 0 when unparseable (bonus then never applies).
 */
export function parseEstimatedTime(s: string): number {
  const minutes = /^\s*(\d+(?:\.\d+)?)\s*m(?:in(?:ute)?s?)?\s*$/i.exec(s || '');
  if (minutes) return parseFloat(minutes[1]) * 60_000;
  const hours = /^\s*(\d+(?:\.\d+)?)\s*h(?:r|our)?s?\s*$/i.exec(s || '');
  if (hours) return parseFloat(hours[1]) * 3_600_000;
  return 0;
}

/** Coerce any value into a 0..1 threshold, defaulting to 1 (all must pass). */
export function clampThreshold(t: unknown): number {
  const n = typeof t === 'number' && Number.isFinite(t) ? t : 1;
  return Math.min(1, Math.max(0, n));
}

/**
 * Fair scoring: partial points proportional to checks fixed (so fixing
 * 3 of 4 issues scores above zero), pass/fail from the threshold, and the
 * configured time_bonus only when solved within estimatedTime.
 */
export function computeScore(input: ScoreInput): ScoreResult {
  const totalChecks = Math.max(0, Math.floor(input.totalChecks));
  const passedChecks = Math.min(totalChecks, Math.max(0, Math.floor(input.passedChecks)));
  const partialRatio = totalChecks === 0 ? 0 : passedChecks / totalChecks;
  const passed = partialRatio >= input.threshold;
  const basePartial = Math.round(input.basePoints * partialRatio);

  // Viewing the solution is charged as if every hint had been used, so the
  // full-answer shortcut never scores better than solving with hints.
  const solutionViewed = input.solutionViewed === true;
  const totalHints = Math.max(0, Math.floor(input.totalHints ?? 0));
  const hintsUsed = solutionViewed
    ? Math.max(input.hintsUsed, totalHints)
    : input.hintsUsed;

  const totalDeductions = Math.max(0, hintsUsed) * Math.max(0, input.hintsPenalty);
  const afterDeductions = Math.max(0, basePartial - totalDeductions);
  const estimatedMs = parseEstimatedTime(input.estimatedTime);
  const timeBonusAwarded =
    !solutionViewed &&
    passed &&
    input.elapsedMs != null &&
    Number.isFinite(input.elapsedMs) &&
    estimatedMs > 0 &&
    input.elapsedMs <= estimatedMs
      ? Math.max(0, input.timeBonus)
      : 0;

  return {
    basePoints: input.basePoints,
    hintsUsed,
    hintsPenalty: input.hintsPenalty,
    totalDeductions,
    finalScore: afterDeductions + timeBonusAwarded,
    passed,
    passedChecks,
    totalChecks,
    partialRatio,
    timeBonusAwarded,
    threshold: input.threshold,
  };
}
