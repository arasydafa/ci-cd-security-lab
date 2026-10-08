import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ChallengeManager } from '@cicd-lab/simulator';
import {
  availableBalance,
  availableForChallenge,
  bankedPoints,
  canOpenHint,
  hintCost,
  hintHolds,
  type BalanceChallenge,
  type BalanceProgress,
} from '@cicd-lab/shared';
import chalk from 'chalk';

interface ProgressData {
  [challengeId: string]: {
    attempts: number;
    hintsUsed: number;
    bestScore: number;
    completed: boolean;
    completedAt?: string;
    solutionViewed?: boolean;
    startedAt?: string;
  };
}

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

export function hintCommand(manager: ChallengeManager, challengeId: string, hintNum?: string): void {
  const challenge = manager.getById(challengeId);

  if (!challenge) {
    console.log(chalk.red(`\n  Challenge "${challengeId}" not found.\n`));
    return;
  }

  // Balance view over every challenge, so the gate and the messages below use
  // the same math as the web UI (see @cicd-lab/shared/balance).
  const progress = loadProgress();
  const balanceChallenges: BalanceChallenge[] = manager.getAll().map((c) => ({
    id: c.id,
    points: c.points,
    hintsPenalty: c.scoring.hints_used_penalty,
  }));
  const balanceProgress = progress as BalanceProgress;

  if (!hintNum) {
    const hintsUsed = progress[challengeId]?.hintsUsed || 0;
    const free = availableBalance(balanceProgress, balanceChallenges);

    console.log(chalk.bold(`\n  Hints for "${challenge.title}"`));
    console.log(chalk.dim(`  ${challenge.paths.hints.length} hint(s) available, ${hintsUsed} already used`));
    console.log(chalk.dim(`  Balance: ${free} pts free (${bankedPoints(balanceProgress, balanceChallenges)} banked, ${hintHolds(balanceProgress, balanceChallenges)} held by open hints)\n`));
    for (let i = 0; i < challenge.paths.hints.length; i++) {
      const marker = i < hintsUsed ? chalk.yellow(' ✓') : chalk.dim(` (-${challenge.scoring.hints_used_penalty} pts)`);
      console.log(chalk.dim(`    cicd-lab hint ${challengeId} ${i + 1}${marker}`));
    }
    console.log();
    return;
  }

  const index = parseInt(hintNum, 10) - 1;
  const hint = manager.getHint(challengeId, index);

  if (!hint) {
    console.log(chalk.red(`\n  Hint ${hintNum} not available. ${challenge.paths.hints.length} hint(s) exist.\n`));
    return;
  }

  // Track hint usage
  const prev = progress[challengeId];
  const newHintsUsed = Math.max(prev?.hintsUsed || 0, index + 1);

  // Gate: opening a hint holds hints_used_penalty points per hint from your
  // balance. If the free balance can't cover the new total hold, the hint stays
  // locked — solve challenges to bank points first. The message quotes the same
  // budget/cost the gate compares, so the numbers always add up.
  if (!canOpenHint(balanceProgress, balanceChallenges, challengeId, newHintsUsed)) {
    const budget = Math.max(0, availableForChallenge(balanceProgress, balanceChallenges, challengeId));
    const cost = hintCost({ id: challengeId, points: challenge.points, hintsPenalty: challenge.scoring.hints_used_penalty }, newHintsUsed);
    console.log(chalk.red(`\n  Hint ${hintNum} is locked — not enough points.`));
    console.log(chalk.dim(`  Opening ${newHintsUsed} hint(s) here costs ${cost} pts, but only ${budget} pts are available for this challenge.`));
    console.log(chalk.dim(`  Solve more challenges to bank points, then unlock hints. Run "cicd-lab progress" to see your balance.\n`));
    return;
  }

  progress[challengeId] = {
    attempts: prev?.attempts || 0,
    hintsUsed: newHintsUsed,
    bestScore: prev?.bestScore || 0,
    completed: prev?.completed || false,
    completedAt: prev?.completedAt,
    solutionViewed: prev?.solutionViewed,
    startedAt: prev?.startedAt || new Date().toISOString(),
  };
  saveProgress(progress);

  const potentialScore = Math.max(0, challenge.points - (newHintsUsed * challenge.scoring.hints_used_penalty));
  const freeAfter = availableBalance(progress as BalanceProgress, balanceChallenges);

  console.log(chalk.bold(`\n  Hint ${hintNum} for "${challenge.title}"\n`));
  const lines = hint.split('\n');
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log(chalk.yellow(`\n  Hints used: ${newHintsUsed}/${challenge.paths.hints.length}`));
  console.log(chalk.dim(`  Penalty: -${challenge.scoring.hints_used_penalty} pts per hint`));
  console.log(chalk.dim(`  Potential score if passed now: ${potentialScore} / ${challenge.points}`));
  console.log(chalk.dim(`  Balance after: ${freeAfter} pts free\n`));
}
