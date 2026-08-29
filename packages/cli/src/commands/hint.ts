import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ChallengeManager } from '@cicd-lab/simulator';
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

function saveProgress(data: ProgressData): void {
  fs.writeFileSync(getProgressFile(), JSON.stringify(data, null, 2), 'utf-8');
}

export function hintCommand(manager: ChallengeManager, challengeId: string, hintNum?: string): void {
  const challenge = manager.getById(challengeId);

  if (!challenge) {
    console.log(chalk.red(`\n  Challenge "${challengeId}" not found.\n`));
    return;
  }

  if (!hintNum) {
    const progress = loadProgress();
    const hintsUsed = progress[challengeId]?.hintsUsed || 0;

    console.log(chalk.bold(`\n  Hints for "${challenge.title}"`));
    console.log(chalk.dim(`  ${challenge.paths.hints.length} hint(s) available, ${hintsUsed} already used\n`));
    for (let i = 0; i < challenge.paths.hints.length; i++) {
      const marker = i < hintsUsed ? chalk.yellow(' ✓') : '';
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
  const progress = loadProgress();
  const prev = progress[challengeId];
  const newHintsUsed = Math.max(prev?.hintsUsed || 0, index + 1);
  progress[challengeId] = {
    attempts: prev?.attempts || 0,
    hintsUsed: newHintsUsed,
    bestScore: prev?.bestScore || 0,
    completed: prev?.completed || false,
    completedAt: prev?.completedAt,
  };
  saveProgress(progress);

  const potentialScore = Math.max(0, challenge.points - (newHintsUsed * challenge.scoring.hints_used_penalty));

  console.log(chalk.bold(`\n  Hint ${hintNum} for "${challenge.title}"\n`));
  const lines = hint.split('\n');
  for (const line of lines) {
    console.log(`  ${line}`);
  }
  console.log(chalk.yellow(`\n  Hints used: ${newHintsUsed}/${challenge.paths.hints.length}`));
  console.log(chalk.dim(`  Penalty: -${challenge.scoring.hints_used_penalty} pts per hint`));
  console.log(chalk.dim(`  Potential score if passed now: ${potentialScore} / ${challenge.points}\n`));
}
