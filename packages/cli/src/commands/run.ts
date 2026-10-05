import fs from 'fs';
import path from 'path';
import os from 'os';
import type { ChallengeManager } from '@cicd-lab/simulator';
import { resolveExecMode } from '@cicd-lab/simulator';
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

export async function runCommand(
  manager: ChallengeManager,
  file: string | undefined,
  opts: { challenge?: string; exec?: string | boolean }
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

  // Load progress to get hints used; startedAt anchors the time_bonus clock.
  const progress = loadProgress();
  const hintsUsed = challengeId ? (progress[challengeId]?.hintsUsed || 0) : 0;
  const startedAt = challengeId
    ? (progress[challengeId]?.startedAt || new Date().toISOString())
    : new Date().toISOString();
  const elapsedMs = Math.max(0, Date.now() - new Date(startedAt).getTime());

  // Execution mode: dry-run unless explicitly opted in. --exec host runs
  // scripts on this machine (dangerous); --exec sandbox uses docker.
  const rawExec = typeof opts.exec === 'string' ? opts.exec.toLowerCase() : opts.exec ? 'host' : undefined;
  if (rawExec === 'sandbox' || rawExec === 'host' || rawExec === '1') {
    process.env.CICD_LAB_EXEC = rawExec === '1' ? 'host' : rawExec;
  } else if (rawExec !== undefined) {
    console.log(chalk.yellow(`\n  Unknown --exec mode "${opts.exec}" — falling back to dry-run.\n`));
  }

  console.log(chalk.bold('\n  Running simulation...\n'));
  if (resolveExecMode() === 'dry-run') {
    console.log(chalk.dim('  (dry-run: steps are simulated, nothing executes — use --exec host|sandbox to run for real)\n'));
  } else if (resolveExecMode() === 'host') {
    console.log(chalk.yellow('  (executing steps on THIS machine — untrusted code can harm it)\n'));
  }

  try {
    const result = await manager.runSimulation(challengeId || '', workflowYaml, hintsUsed, elapsedMs);

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
    console.log(chalk.dim(`  ${result.score.passedChecks}/${result.score.totalChecks} fixed`));
    console.log();

    // Print score
    const { score } = result;
    if (result.validation.passed) {
      console.log(chalk.green.bold('  ✓ Challenge PASSED!'));
      console.log(chalk.bold(`  Score: ${score.finalScore} / ${score.basePoints}`));
      if (score.totalDeductions > 0) {
        console.log(chalk.dim(`  (${score.hintsUsed} hint(s) used, -${score.totalDeductions} pts)`));
      }
      if (score.timeBonusAwarded > 0) {
        console.log(chalk.dim(`  (fast solve bonus: +${score.timeBonusAwarded} pts)`));
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
          solutionViewed: prev?.solutionViewed,
          startedAt,
        };
        saveProgress(progress);
      }
    } else {
      console.log(chalk.red.bold('  ✗ Challenge FAILED — fix the issues above and try again.'));
      console.log(chalk.dim(`  Partial score so far: ${score.finalScore} / ${score.basePoints} (${score.passedChecks}/${score.totalChecks} fixed)\n`));

      // Record attempt
      if (challengeId) {
        const prev = progress[challengeId];
        progress[challengeId] = {
          attempts: (prev?.attempts || 0) + 1,
          hintsUsed,
          bestScore: prev?.bestScore || 0,
          completed: false,
          solutionViewed: prev?.solutionViewed,
          startedAt,
        };
        saveProgress(progress);
      }
    }
  } catch (error) {
    console.log(chalk.red(`\n  Error: ${(error as Error).message}\n`));
  }
}
