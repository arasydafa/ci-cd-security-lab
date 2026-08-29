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

export async function runCommand(
  manager: ChallengeManager,
  file: string | undefined,
  opts: { challenge?: string }
): Promise<void> {
  const challengeId = opts.challenge;

  if (!challengeId && !file) {
    console.log(chalk.red('\n  Provide a challenge ID with -c <id> or a YAML file path.\n'));
    console.log(chalk.dim('  Examples:'));
    console.log(chalk.dim('    cicd-lab run -c secrets-leak'));
    console.log(chalk.dim('    cicd-lab run fixed.yml -c secrets-leak\n'));
    return;
  }

  let workflowYaml: string | undefined;

  if (file) {
    if (!fs.existsSync(file)) {
      console.log(chalk.red(`\n  File "${file}" not found.\n`));
      return;
    }
    workflowYaml = fs.readFileSync(file, 'utf-8');
  }

  // Load progress to get hints used
  const progress = loadProgress();
  const hintsUsed = challengeId ? (progress[challengeId]?.hintsUsed || 0) : 0;

  console.log(chalk.bold('\n  Running simulation...\n'));

  try {
    const result = await manager.runSimulation(challengeId || '', workflowYaml, hintsUsed);

    // Print execution logs
    for (const log of result.result.logs) {
      console.log(chalk.dim(`  ${log}`));
    }
    console.log();

    // Print findings
    if (result.result.findings.length > 0) {
      console.log(chalk.bold('  ─── Security Findings ───'));
      for (const finding of result.result.findings) {
        const icon = finding.severity === 'critical' ? chalk.red('!!') :
          finding.severity === 'high' ? chalk.red('!') :
          finding.severity === 'medium' ? chalk.yellow('!') :
          chalk.dim('-');
        console.log(`  ${icon} [${finding.severity.toUpperCase()}] ${finding.message}`);
        if (finding.remediation) {
          console.log(chalk.dim(`    → ${finding.remediation}`));
        }
      }
      console.log();
    }

    // Print validation
    console.log(chalk.bold('  ─── Validation ───'));
    for (const check of result.validation.checks) {
      const icon = check.passed ? chalk.green('✓') : chalk.red('✗');
      console.log(`  ${icon} ${check.description}`);
      if (check.message) {
        console.log(chalk.dim(`    ${check.message}`));
      }
    }
    console.log();

    // Print score
    const { score } = result;
    if (result.validation.passed) {
      console.log(chalk.green.bold('  ✓ Challenge PASSED!'));
      console.log(chalk.bold(`  Score: ${score.finalScore} / ${score.basePoints}`));
      if (score.totalDeductions > 0) {
        console.log(chalk.dim(`  (${score.hintsUsed} hint(s) used, -${score.totalDeductions} pts)`));
      }
      console.log();

      // Save progress
      if (challengeId) {
        const prev = progress[challengeId];
        const newBest = prev ? Math.max(prev.bestScore, score.finalScore) : score.finalScore;
        progress[challengeId] = {
          attempts: (prev?.attempts || 0) + 1,
          hintsUsed,
          bestScore: newBest,
          completed: true,
          completedAt: new Date().toISOString(),
        };
        saveProgress(progress);
      }
    } else {
      console.log(chalk.red.bold('  ✗ Challenge FAILED — fix the issues above and try again.\n'));

      // Record attempt
      if (challengeId) {
        const prev = progress[challengeId];
        progress[challengeId] = {
          attempts: (prev?.attempts || 0) + 1,
          hintsUsed,
          bestScore: prev?.bestScore || 0,
          completed: false,
        };
        saveProgress(progress);
      }
    }
  } catch (error) {
    console.log(chalk.red(`\n  Error: ${(error as Error).message}\n`));
  }
}
