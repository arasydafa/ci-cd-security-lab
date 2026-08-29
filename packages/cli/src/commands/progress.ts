import fs from 'fs';
import path from 'path';
import os from 'os';
import { ChallengeManager } from '@cicd-lab/simulator';
import chalk from 'chalk';

interface ProgressData {
  [challengeId: string]: {
    attempts: number;
    hintsUsed: number;
    bestScore: number;
    completed: boolean;
    completedAt?: string;
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

export function progressCommand(): void {
  const progress = loadProgress();
  const manager = new ChallengeManager();
  const allChallenges = manager.getAll();

  const completed = Object.entries(progress).filter(([, p]) => p.completed);
  const attempted = Object.entries(progress).filter(([, p]) => p.attempts > 0);
  const totalEarned = completed.reduce((sum, [id, p]) => {
    const challenge = allChallenges.find((c) => c.id === id);
    return sum + (challenge ? Math.min(p.bestScore, challenge.points) : 0);
  }, 0);
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
  console.log(`  Total score:         ${chalk.cyan(totalEarned.toString())} / ${totalPossible} pts`);
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

      console.log(`  ${status} ${c.id.padEnd(30)} ${score.padStart(5)} / ${c.points.toString().padStart(3)} pts${hints}${attempts}`);
    }
  }

  console.log(chalk.dim(`\n  Progress saved to: ${getProgressFile()}\n`));
}
