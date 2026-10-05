import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import type { Challenge, ChallengeLevel, ChallengeTopic, SecurityFinding } from '@cicd-lab/shared';
import { parseWorkflow } from './parser.js';
import { simulate, type SimulationOptions } from './simulator.js';
import { type SimulationContext, createContext } from './environment.js';
import { predicateCheck } from './predicates.js';
import { clampThreshold, computeScore } from './scoring.js';
import { parseChallengeMeta } from './schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CHALLENGES_DIR = path.resolve(__dirname, '..', '..', '..', 'challenges');

export class ChallengeManager {
  private challenges: Map<string, Challenge> = new Map();
  private loaded = false;

  loadAll(): void {
    if (this.loaded) return;

    const levels: ChallengeLevel[] = ['beginner', 'intermediate', 'advanced'];

    for (const level of levels) {
      const levelDir = path.join(CHALLENGES_DIR, level);
      if (!fs.existsSync(levelDir)) continue;

      const dirs = fs.readdirSync(levelDir, { withFileTypes: true })
        .filter((d) => d.isDirectory());

      for (const dir of dirs) {
        const challengePath = path.join(levelDir, dir.name);
        try {
          const challenge = this.loadChallenge(challengePath, level);
          if (challenge) {
            this.challenges.set(challenge.id, challenge);
          }
        } catch (e) {
          console.error(`Failed to load challenge ${dir.name}:`, e);
        }
      }
    }

    this.loaded = true;
  }

  private loadChallenge(dirPath: string, level: ChallengeLevel): Challenge | null {
    const metaPath = path.join(dirPath, 'challenge.yml');
    if (!fs.existsSync(metaPath)) return null;

    const metaRaw = fs.readFileSync(metaPath, 'utf-8');
    const meta = parseChallengeMeta(yaml.load(metaRaw), metaPath);
    if (meta.level && meta.level !== level) {
      throw new Error(`Challenge "${meta.id}" declares level "${meta.level}" but lives in "${level}/"`);
    }

    const hintFiles: string[] = [];
    const hintsDir = path.join(dirPath, 'hints');
    if (fs.existsSync(hintsDir)) {
      const hintEntries = fs.readdirSync(hintsDir).filter((f) => f.endsWith('.md'));
      for (const h of hintEntries) {
        hintFiles.push(path.join(hintsDir, h));
      }
    }

    return {
      id: meta.id,
      title: meta.title,
      level,
      topic: meta.topic,
      category: meta.category,
      estimatedTime: meta.estimated_time,
      points: meta.points,
      description: meta.description,
      tags: meta.tags,
      prerequisites: meta.prerequisites,
      objectives: meta.objectives,
      references: meta.references,
      validation: {
        type: meta.validation.type,
        expected: meta.validation.expected,
      },
      scoring: {
        hints_used_penalty: meta.scoring.hints_used_penalty,
        time_bonus: meta.scoring.time_bonus,
        pass_threshold: clampThreshold(meta.scoring.pass_threshold),
      },
      paths: {
        vulnerable: path.join(dirPath, 'vulnerable', 'workflow.yml'),
        solution: path.join(dirPath, 'solution', 'workflow.yml'),
        scenario: path.join(dirPath, 'scenario.md'),
        hints: hintFiles,
      },
    };
  }

  getAll(): Challenge[] {
    this.loadAll();
    return Array.from(this.challenges.values());
  }

  getById(id: string): Challenge | undefined {
    this.loadAll();
    return this.challenges.get(id);
  }

  getByLevel(level: ChallengeLevel): Challenge[] {
    return this.getAll().filter((c) => c.level === level);
  }

  getByTopic(topic: ChallengeTopic): Challenge[] {
    return this.getAll().filter((c) => c.topic === topic);
  }

  getVulnerableWorkflow(challengeId: string): string | undefined {
    const challenge = this.getById(challengeId);
    if (!challenge) return undefined;
    if (!fs.existsSync(challenge.paths.vulnerable)) return undefined;
    return fs.readFileSync(challenge.paths.vulnerable, 'utf-8');
  }

  getSolutionWorkflow(challengeId: string): string | undefined {
    const challenge = this.getById(challengeId);
    if (!challenge) return undefined;
    if (!fs.existsSync(challenge.paths.solution)) return undefined;
    return fs.readFileSync(challenge.paths.solution, 'utf-8');
  }

  getHint(challengeId: string, hintIndex: number): string | undefined {
    const challenge = this.getById(challengeId);
    if (!challenge) return undefined;
    if (hintIndex < 0 || hintIndex >= challenge.paths.hints.length) return undefined;
    return fs.readFileSync(challenge.paths.hints[hintIndex], 'utf-8');
  }

  getScenario(challengeId: string): string | undefined {
    const challenge = this.getById(challengeId);
    if (!challenge) return undefined;
    if (!fs.existsSync(challenge.paths.scenario)) return undefined;
    return fs.readFileSync(challenge.paths.scenario, 'utf-8');
  }

  async runSimulation(
    challengeId: string,
    workflowYaml?: string,
    hintsUsed = 0,
    elapsedMs?: number,
  ): Promise<SimulationResult> {
    const yamlContent = workflowYaml || this.getVulnerableWorkflow(challengeId);
    if (!yamlContent) {
      throw new Error(`No workflow found for challenge ${challengeId}`);
    }

    const workflow = parseWorkflow(yamlContent);
    const result = await simulate({ workflow, rawYaml: yamlContent });

    const challenge = this.getById(challengeId);
    const validation = challenge ? this.validate(challenge, result, yamlContent) : { passed: false, checks: [] };

    const passedChecks = validation.checks.filter((c) => c.passed).length;
    const score = challenge
      ? computeScore({
          basePoints: challenge.points,
          hintsUsed,
          hintsPenalty: challenge.scoring.hints_used_penalty,
          timeBonus: challenge.scoring.time_bonus,
          estimatedTime: challenge.estimatedTime,
          threshold: challenge.scoring.pass_threshold ?? 1,
          passedChecks,
          totalChecks: validation.checks.length,
          elapsedMs,
        })
      : {
          basePoints: 0,
          hintsUsed: 0,
          hintsPenalty: 0,
          totalDeductions: 0,
          finalScore: 0,
          passed: false,
          passedChecks: 0,
          totalChecks: validation.checks.length,
          partialRatio: 0,
          timeBonusAwarded: 0,
          threshold: 1,
        };

    // Pass/fail comes from the threshold (default: every check must pass),
    // so validation.passed and score.passed always agree.
    const synced = { ...validation, passed: score.passed };
    return { result, validation: synced, score };
  }

  private validate(
    challenge: Challenge,
    result: import('@cicd-lab/shared').WorkflowResult,
    yamlContent: string
  ): ValidationResponse {
    const checks: ValidationCheck[] = [];

    for (const expectation of challenge.validation.expected) {
      if (expectation.predicate) {
        const check = predicateCheck(expectation.predicate, { workflow: parseWorkflow(yamlContent), rawYaml: yamlContent }, { rules: expectation.rules });
        if (check) {
          checks.push(check);
        } else {
          checks.push({
            description: `Unknown predicate "${expectation.predicate}"`,
            passed: false,
            message: `Challenge configuration error: unknown predicate. Known: no-interpolation-in-run, all-uses-pinned, has-explicit-permissions, no-write-all, no-rule-findings.`,
          });
        }
        continue;
      }
      if (expectation.should_not_contain) {
        for (const pattern of expectation.should_not_contain) {
          const found = yamlContent.includes(pattern) || result.logs.some((l) => l.includes(pattern));
          checks.push({
            description: `Should not contain "${pattern}"${expectation.step ? ` in step ${expectation.step}` : ''}`,
            passed: !found,
            message: found ? `Found "${pattern}" in workflow` : undefined,
          });
        }
      }

      if (expectation.should_contain) {
        for (const pattern of expectation.should_contain) {
          const found = yamlContent.includes(pattern);
          checks.push({
            description: `Should contain "${pattern}"${expectation.step ? ` in step ${expectation.step}` : ''}`,
            passed: found,
            message: found ? undefined : `Missing "${pattern}" in workflow`,
          });
        }
      }

      if (expectation.status) {
        const jobResult = expectation.step
          ? result.jobs.find((j) => j.name === expectation.step)
          : result.jobs[0];

        if (jobResult) {
          checks.push({
            description: `Job "${jobResult.name}" should have status "${expectation.status}"`,
            passed: jobResult.status === expectation.status,
            message: jobResult.status === expectation.status
              ? undefined
              : `Job status is "${jobResult.status}", expected "${expectation.status}"`,
          });
        }
      }
    }

    // Always check for findings
    const criticalFindings = result.findings.filter((f) => f.severity === 'critical' || f.severity === 'high');
    if (criticalFindings.length > 0) {
      checks.push({
        description: 'No critical/high security findings',
        passed: false,
        message: `${criticalFindings.length} security issue(s) found:\n${criticalFindings.map((f) => `  - [${f.severity}] ${f.message}`).join('\n')}`,
      });
    } else {
      checks.push({
        description: 'No critical/high security findings',
        passed: true,
      });
    }

    const passed = checks.every((c) => c.passed);
    return { passed, checks };
  }
}

export interface SimulationResult {
  result: import('@cicd-lab/shared').WorkflowResult;
  validation: ValidationResponse;
  score: import('@cicd-lab/shared').ScoreResult;
}

export interface ValidationResponse {
  passed: boolean;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  description: string;
  passed: boolean;
  message?: string;
  /** Attacker-view explanation shown when the check fails. */
  whyItMatters?: string;
  /** Deep link to the learning guide, e.g. `/reference/github-actions`. */
  reference?: string;
}
