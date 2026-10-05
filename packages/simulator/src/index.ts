export { parseWorkflow, ParseError } from './parser.js';
export { simulate } from './simulator.js';
export { createContext, type SimulationContext } from './environment.js';
export { ChallengeManager, type SimulationResult, type ValidationResponse } from './challenges.js';
export { computeScore, clampThreshold, parseEstimatedTime, type ScoreInput } from './scoring.js';
export { parseChallengeMeta, ChallengeMetaSchema, type ChallengeMeta } from './schema.js';
export { registerRule, isKnownRule } from './rules.js';
export {
  listFixtures,
  cosmeticVariants,
  auditChallenge,
  auditAll,
  type FixtureRef,
  type CosmeticVariant,
  type ChallengeAudit,
} from './harness.js';
export { RULES, runRules, lineOf, defineRule, type DetectionRule, type RuleFinding } from './rules.js';
