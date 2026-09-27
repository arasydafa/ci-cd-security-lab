import type { Job, ValidationCheck, WorkflowFile } from '@cicd-lab/shared';
import { RULES, runRules, type RuleFinding } from './rules.js';

export interface PredicateOutcome {
  passed: boolean;
  message?: string;
  whyItMatters?: string;
  reference?: string;
}

export interface PredicateContext {
  workflow: WorkflowFile;
  rawYaml: string;
}

function findingsForRules(ctx: PredicateContext, ids: string[]): RuleFinding[] {
  const wanted = new Set(ids);
  return runRules(ctx).filter((f) => wanted.has(f.ruleId));
}

function ruleById(id: string) {
  return RULES.find((r) => r.id === id);
}

function outcomeFromFindings(
  description: string,
  hits: RuleFinding[],
  fallbackWhy: string,
  fallbackRef?: string,
): PredicateOutcome & { description: string } {
  if (hits.length === 0) return { description, passed: true };
  const first = ruleById(hits[0].ruleId);
  return {
    description,
    passed: false,
    message: hits
      .map((h) => `  - ${h.message}${h.line ? ` (line ${h.line})` : ''}`)
      .join('\n'),
    whyItMatters: first?.whyItMatters || fallbackWhy,
    reference: first?.reference || fallbackRef,
  };
}

const PREDICATES: Record<
  string,
  (ctx: PredicateContext, params?: { rules?: string[] }) => PredicateOutcome & { description: string }
> = {
  'no-interpolation-in-run': (ctx) =>
    outcomeFromFindings(
      'No untrusted context interpolated into run: scripts',
      findingsForRules(ctx, ['interpolation-in-run']),
      'Expressions are substituted before the shell starts, so attacker-controlled values become live shell code.',
    ),

  'all-uses-pinned': (ctx) =>
    outcomeFromFindings(
      'All third-party actions pinned to full commit SHAs',
      findingsForRules(ctx, ['unpinned-uses']),
      'Mutable tags can be moved to malicious code after you review them.',
    ),

  'has-explicit-permissions': (ctx) => {
    const topLevel = ctx.workflow.permissions !== undefined;
    const anyJob = Object.values(ctx.workflow.jobs).some(
      (job) => (job as Job).permissions !== undefined,
    );
    return topLevel || anyJob
      ? { description: 'Token permissions declared explicitly', passed: true }
      : {
          description: 'Token permissions declared explicitly',
          passed: false,
          message: 'No permissions: block at workflow or job level',
          whyItMatters:
            'Without an explicit block the job inherits broad repository defaults.',
          reference: '/reference/github-actions',
        };
  },

  'no-write-all': (ctx) => {
    const dump = JSON.stringify({
      top: ctx.workflow.permissions,
      jobs: Object.values(ctx.workflow.jobs).map((j) => (j as Job).permissions),
    });
    return dump.includes('write-all')
      ? {
          description: 'No write-all permission grants',
          passed: false,
          message: 'Found a "write-all" grant in permissions',
          whyItMatters:
            'A compromised step with write-all can modify code, releases, and secrets.',
          reference: '/reference/github-actions',
        }
      : { description: 'No write-all permission grants', passed: true };
  },

  'no-rule-findings': (ctx, params) =>
    outcomeFromFindings(
      `No findings from rules: ${(params?.rules || []).join(', ') || 'none'}`,
      findingsForRules(ctx, params?.rules || []),
      'The flagged patterns are known-unsafe; restructure the workflow to remove them.',
    ),
};

export function evaluatePredicate(
  id: string,
  ctx: PredicateContext,
  params?: { rules?: string[] },
): (PredicateOutcome & { description: string }) | null {
  const fn = PREDICATES[id];
  if (!fn) return null;
  return fn(ctx, params);
}

export function predicateCheck(
  id: string,
  ctx: PredicateContext,
  params?: { rules?: string[] },
): ValidationCheck | null {
  const outcome = evaluatePredicate(id, ctx, params);
  if (!outcome) return null;
  return {
    description: outcome.description,
    passed: outcome.passed,
    message: outcome.message,
    whyItMatters: outcome.whyItMatters,
    reference: outcome.reference,
  };
}

export function knownPredicates(): string[] {
  return Object.keys(PREDICATES);
}
