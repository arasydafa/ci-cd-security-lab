import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'js-yaml';
import type { Challenge, ChallengeLevel, ChallengeTopic, SecurityFinding } from '@cicd-lab/shared';
import { parseWorkflow } from './parser.js';
import { simulate, type SimulationOptions } from './simulator.js';
import { type SimulationContext, createContext } from './environment.js';

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
    const meta = yaml.load(metaRaw) as Record<string, unknown>;

    const hintFiles: string[] = [];
    const hintsDir = path.join(dirPath, 'hints');
    if (fs.existsSync(hintsDir)) {
      const hintEntries = fs.readdirSync(hintsDir).filter((f) => f.endsWith('.md'));
      for (const h of hintEntries) {
        hintFiles.push(path.join(hintsDir, h));
      }
    }

    return {
      id: meta.id as string,
      title: meta.title as string,
      level,
      topic: (meta.topic as ChallengeTopic) || 'github-actions',
      category: (meta.category as Challenge['category']) || 'security',
      estimatedTime: (meta.estimated_time as string) || '15m',
      points: (meta.points as number) || 100,
      description: (meta.description as string) || '',
      tags: (meta.tags as string[]) || [],
      validation: {
        type: (meta.validation as Record<string, unknown>)?.type as Challenge['validation']['type'] || 'workflow-check',
        expected: ((meta.validation as Record<string, unknown>)?.expected as any[]) || [],
      },
      scoring: {
        hints_used_penalty: ((meta.scoring as Record<string, unknown>)?.hints_used_penalty as number) || 25,
        time_bonus: ((meta.scoring as Record<string, unknown>)?.time_bonus as number) || 50,
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

  async runSimulation(challengeId: string, workflowYaml?: string, hintsUsed = 0): Promise<SimulationResult> {
    const yamlContent = workflowYaml || this.getVulnerableWorkflow(challengeId);
    if (!yamlContent) {
      throw new Error(`No workflow found for challenge ${challengeId}`);
    }

    const workflow = parseWorkflow(yamlContent);
    const result = await simulate({ workflow });

    const challenge = this.getById(challengeId);
    const validation = challenge ? this.validate(challenge, result, yamlContent) : { passed: false, checks: [] };

    const score = this.calculateScore(challenge, validation.passed, hintsUsed);

    return { result, validation, score };
  }

  private calculateScore(
    challenge: Challenge | undefined,
    passed: boolean,
    hintsUsed: number
  ): import('@cicd-lab/shared').ScoreResult {
    if (!challenge) {
      return { basePoints: 0, hintsUsed: 0, hintsPenalty: 0, totalDeductions: 0, finalScore: 0, passed: false };
    }

    const basePoints = challenge.points;
    const penalty = challenge.scoring.hints_used_penalty;
    const totalDeductions = hintsUsed * penalty;
    const finalScore = passed ? Math.max(0, basePoints - totalDeductions) : 0;

    return {
      basePoints,
      hintsUsed,
      hintsPenalty: penalty,
      totalDeductions,
      finalScore,
      passed,
    };
  }

  private validate(
    challenge: Challenge,
    result: import('@cicd-lab/shared').WorkflowResult,
    yamlContent: string
  ): ValidationResponse {
    const checks: ValidationCheck[] = [];

    for (const expectation of challenge.validation.expected) {
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
}
