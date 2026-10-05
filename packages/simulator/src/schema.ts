import { z } from 'zod';
import { knownPredicates } from './predicates.js';
import { RULES } from './rules.js';

const KNOWN_RULE_IDS = new Set(RULES.map((r) => r.id));

const ReferenceSchema = z.object({
  page: z.enum(['github-actions', 'docker', 'kubernetes', 'terraform', 'monitoring']),
  label: z.string().min(1),
});

const ExpectationSchema = z
  .object({
    step: z.string().optional(),
    status: z.enum(['success', 'failure']).optional(),
    should_contain: z.array(z.string()).optional(),
    should_not_contain: z.array(z.string()).optional(),
    file: z.string().optional(),
    content: z.string().optional(),
    predicate: z.string().optional(),
    rules: z.array(z.string()).optional(),
  })
  .superRefine((exp, ctx) => {
    if (exp.predicate && !knownPredicates().includes(exp.predicate)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Unknown predicate "${exp.predicate}". Known: ${knownPredicates().join(', ')}.`,
      });
    }
    for (const rule of exp.rules || []) {
      if (!KNOWN_RULE_IDS.has(rule)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Unknown rule "${rule}". Register it with registerRule() first.`,
        });
      }
    }
    const hasLegacyCheck =
      exp.should_contain || exp.should_not_contain || exp.status || exp.content || exp.file;
    if (!exp.predicate && !hasLegacyCheck) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Expectation needs a predicate or a legacy check (should_contain/should_not_contain/status/content).',
      });
    }
  });

/**
 * Authoring contract for challenges/`<level>`/`<slug>`/challenge.yml.
 * Mirrors the Fase 2 learning-path requirements (objectives, references)
 * so CI rejects incomplete or misconfigured challenges.
 */
export const ChallengeMetaSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  topic: z.enum(['github-actions', 'docker', 'kubernetes', 'terraform', 'monitoring']).default('github-actions'),
  category: z.enum(['security', 'best-practice', 'performance']).default('security'),
  estimated_time: z.string().regex(/^\d+(\.\d+)?[mh]$/).default('15m'),
  points: z.number().int().positive().default(100),
  description: z.string().default(''),
  tags: z.array(z.string()).default([]),
  prerequisites: z.array(z.string()).default([]),
  objectives: z.array(z.string().min(11)).min(2),
  references: z.array(ReferenceSchema).min(1),
  validation: z.object({
    type: z.enum(['workflow-check', 'file-check', 'output-check']).default('workflow-check'),
    expected: z.array(ExpectationSchema).min(1),
  }),
  scoring: z
    .object({
      hints_used_penalty: z.number().default(25),
      time_bonus: z.number().default(50),
      pass_threshold: z.number().min(0).max(1).optional(),
    })
    .default({}),
});

export type ChallengeMeta = z.infer<typeof ChallengeMetaSchema>;

/** Parse a raw challenge.yml; throws a path-annotated Error on failure. */
export function parseChallengeMeta(raw: unknown, source = 'challenge.yml'): ChallengeMeta {
  const parsed = ChallengeMetaSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('; ');
    throw new Error(`Invalid ${source}: ${details}`);
  }
  return parsed.data;
}
