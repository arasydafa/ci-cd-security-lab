import fs from 'fs';
import path from 'path';
import os from 'os';
import { ChallengeManager } from '@cicd-lab/simulator';
import {
  availableBalance,
  bankedPoints,
  hintHolds,
  type BalanceChallenge,
  type BalanceProgress,
} from '@cicd-lab/shared';
import chalk from 'chalk';

interface ProgressEntry {
  attempts: number;
  hintsUsed: number;
  bestScore: number;
  completed: boolean;
  completedAt?: string;
  solutionViewed?: boolean;
  startedAt?: string;
}

type ProgressData = Record<string, ProgressEntry>;

function getProgressFile(): string {
  return path.join(os.homedir(), '.cicd-lab-progress.json');
}

function loadProgress(): ProgressData {
  const file = getProgressFile();
  if (!fs.existsSync(file)) return {};
  try {
    return JSON.parse(fs.readFileSync(file, 'utf-8'));
  } catch {
    return {};
  }
}

function saveProgress(data: ProgressData): void {
  fs.writeFileSync(getProgressFile(), JSON.stringify(data, null, 2), 'utf-8');
}

export function isCleanSolve(e?: ProgressEntry): boolean {
  return !!e?.completed && (e.hintsUsed || 0) === 0 && !e.solutionViewed;
}

export function progressCommand(opts: { export?: string; import?: string } = {}): void {
  // Export: web-compatible JSON (same shape as localStorage cicd-lab-progress).
  if (opts.export) {
    const data = loadProgress();
    fs.writeFileSync(opts.export, JSON.stringify(data, null, 2), 'utf-8');
    console.log(chalk.green(`\n  Exported progress to ${opts.export}\n`));
    return;
  }

  // Import: merge, keeping best score and preserving solutionViewed.
  if (opts.import) {
    if (!fs.existsSync(opts.import)) {
      console.log(chalk.red(`\n  Import file "${opts.import}" not found.\n`));
      return;
    }
    let incoming: ProgressData;
    try {
      incoming = JSON.parse(fs.readFileSync(opts.import, 'utf-8'));
    } catch {
      console.log(chalk.red('\n  Import file is not valid JSON.\n'));
      return;
    }
    const current = loadProgress();
    for (const [id, entry] of Object.entries(incoming)) {
      const prev = current[id];
      if (!prev) {
        current[id] = entry;
        continue;
      }
      current[id] = {
        attempts: Math.max(prev.attempts || 0, entry.attempts || 0),
        hintsUsed: Math.max(prev.hintsUsed || 0, entry.hintsUsed || 0),
        bestScore: Math.max(prev.bestScore || 0, entry.bestScore || 0),
        completed: prev.completed || entry.completed,
        completedAt: prev.completedAt || entry.completedAt,
        solutionViewed: prev.solutionViewed || entry.solutionViewed,
        startedAt: prev.startedAt || entry.startedAt,
      };
    }
    saveProgress(current);
    console.log(chalk.green(`\n  Imported progress from ${opts.import}\n`));
    return;
  }

  const progress = loadProgress();
  const manager = new ChallengeManager();
  const allChallenges = manager.getAll();

  const completed = Object.entries(progress).filter(([, p]) => p.completed);
  const attempted = Object.entries(progress).filter(([, p]) => p.attempts > 0);
  const clean = Object.entries(progress).filter(([, p]) => isCleanSolve(p));
  const balanceChallenges: BalanceChallenge[] = allChallenges.map((c) => ({
    id: c.id,
    points: c.points,
    hintsPenalty: c.scoring.hints_used_penalty,
  }));
  const balanceProgress = progress as BalanceProgress;
  // Banked score (capped at each challenge's max) — same math as the web
  // Dashboard, so the two surfaces always agree.
  const totalEarned = bankedPoints(balanceProgress, balanceChallenges);
  const freeBalance = availableBalance(balanceProgress, balanceChallenges);
  const heldByHints = hintHolds(balanceProgress, balanceChallenges);
  const totalPossible = allChallenges.reduce((sum, c) => sum + c.points, 0);

  console.log(chalk.bold('\n  CI/CD Security Lab — Progress\n'));

  if (attempted.length === 0) {
    console.log(chalk.dim('  No challenges attempted yet.'));
    console.log(chalk.dim('  Start with: cicd-lab start secrets-leak\n'));
    return;
  }

  // Summary
  console.log(chalk.bold('  ─── Summary ───'));
  console.log(`  Challenges completed: ${chalk.green(completed.length.toString())} / ${allChallenges.length}`);
  console.log(`  Challenges attempted: ${chalk.yellow(attempted.length.toString())} / ${allChallenges.length}`);
  console.log(`  Clean solves (no hints, no solution): ${chalk.cyan(clean.length.toString())}`);
  console.log(`  Total score:         ${chalk.cyan(totalEarned.toString())} / ${totalPossible} pts`);
  console.log(`  Free balance:        ${chalk.cyan(freeBalance.toString())} pts${heldByHints > 0 ? chalk.dim(` (${heldByHints} held by open hints)`) : ''}`);
  console.log();

  // Per-challenge details
  console.log(chalk.bold('  ─── Challenges ───'));

  const grouped = {
    beginner: allChallenges.filter((c) => c.level === 'beginner'),
    intermediate: allChallenges.filter((c) => c.level === 'intermediate'),
    advanced: allChallenges.filter((c) => c.level === 'advanced'),
  };

  for (const [level, challenges] of Object.entries(grouped)) {
    const levelCompleted = challenges.filter((c) => progress[c.id]?.completed);
    if (levelCompleted.length === 0 && !challenges.some((c) => progress[c.id]?.attempts)) continue;

    const color = level === 'beginner' ? chalk.green : level === 'intermediate' ? chalk.yellow : chalk.red;
    console.log(color.bold(`\n  ${level.toUpperCase()}`));

    for (const c of challenges) {
      const p = progress[c.id];
      if (!p) continue;

      const status = p.completed ? chalk.green('✓') : chalk.yellow('○');
      const score = p.completed ? chalk.cyan(`${p.bestScore}`) : chalk.dim('—');
      const hints = p.hintsUsed > 0 ? chalk.dim(` [${p.hintsUsed} hints]`) : '';
      const attempts = p.attempts > 1 ? chalk.dim(` (${p.attempts} attempts)`) : '';
      const badge = isCleanSolve(p)
        ? chalk.green(' [clean]')
        : p.solutionViewed && p.completed
          ? chalk.dim(' [with-solution]')
          : '';

      console.log(`  ${status} ${c.id.padEnd(30)} ${score.padStart(5)} / ${c.points.toString().padStart(3)} pts${hints}${attempts}${badge}`);
    }
  }

  console.log(chalk.dim(`\n  Progress saved to: ${getProgressFile()}`));
  console.log(chalk.dim('  Sync with web: cicd-lab progress --export web.json (then Import in Dashboard)\n'));
}
