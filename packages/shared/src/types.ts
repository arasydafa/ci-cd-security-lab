// ─── Challenge Types ───────────────────────────────────────────

export type ChallengeLevel = 'beginner' | 'intermediate' | 'advanced';
export type ChallengeTopic = 'github-actions' | 'docker' | 'kubernetes' | 'terraform' | 'monitoring';
export type ChallengeCategory = 'security' | 'best-practice' | 'performance';

export interface Challenge {
  id: string;
  title: string;
  level: ChallengeLevel;
  topic: ChallengeTopic;
  category: ChallengeCategory;
  estimatedTime: string;
  points: number;
  description: string;
  tags: string[];
  validation: ValidationConfig;
  scoring: ScoringConfig;
  paths: {
    vulnerable: string;
    solution: string;
    scenario: string;
    hints: string[];
  };
}

export interface ValidationConfig {
  type: 'workflow-check' | 'file-check' | 'output-check';
  expected: ValidationExpectation[];
}

export interface ValidationExpectation {
  step?: string;
  status?: 'success' | 'failure';
  should_contain?: string[];
  should_not_contain?: string[];
  file?: string;
  content?: string;
}

export interface ScoringConfig {
  hints_used_penalty: number;
  time_bonus: number;
}

// ─── Workflow Types (GitHub Actions subset) ────────────────────

export interface WorkflowFile {
  name?: string;
  on: TriggerConfig;
  env?: Record<string, string>;
  permissions?: PermissionsConfig | string;
  jobs: Record<string, Job>;
}

export type TriggerConfig = string | string[] | {
  push?: { branches?: string[]; paths?: string[] };
  pull_request?: { branches?: string[]; types?: string[] };
  schedule?: { cron: string }[];
  workflow_dispatch?: Record<string, unknown>;
};

export interface PermissionsConfig {
  contents?: 'read' | 'write' | 'none';
  actions?: 'read' | 'write' | 'none';
  packages?: 'read' | 'write' | 'none';
  'id-token'?: 'read' | 'write' | 'none';
  [key: string]: string | undefined;
}

export interface Job {
  name?: string;
  'runs-on': string | string[];
  needs?: string | string[];
  if?: string;
  permissions?: PermissionsConfig | string;
  env?: Record<string, string>;
  steps: Step[];
}

export interface Step {
  name?: string;
  uses?: string;
  run?: string;
  shell?: string;
  with?: Record<string, string>;
  env?: Record<string, string>;
  id?: string;
  'continue-on-error'?: boolean;
}

// ─── Simulation Types ──────────────────────────────────────────

export type StepStatus = 'success' | 'failure' | 'skipped' | 'running';

export interface StepResult {
  name: string;
  status: StepStatus;
  output: string;
  duration: number;
  startTime: string;
  endTime: string;
}

export interface JobResult {
  name: string;
  status: StepStatus;
  steps: StepResult[];
  startTime: string;
  endTime: string;
}

export interface WorkflowResult {
  success: boolean;
  jobs: JobResult[];
  totalDuration: number;
  startTime: string;
  endTime: string;
  logs: string[];
  findings: SecurityFinding[];
}

export interface SecurityFinding {
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  message: string;
  line?: number;
  file?: string;
  remediation?: string;
}

// ─── API Types ─────────────────────────────────────────────────

export interface ApiResponse<T> {
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
  timestamp: string;
}

export interface ChallengeListItem {
  id: string;
  title: string;
  level: ChallengeLevel;
  topic: ChallengeTopic;
  category: ChallengeCategory;
  points: number;
  estimatedTime: string;
  completed: boolean;
}

export interface UserProgress {
  challengeId: string;
  status: 'not-started' | 'in-progress' | 'completed';
  attempts: number;
  hintsUsed: number;
  bestScore: number;
  completedAt?: string;
}

export interface SimulationRequest {
  challengeId: string;
  workflowYaml: string;
}

export interface SimulationResponse {
  result: WorkflowResult;
  validation: ValidationResult;
}

export interface ValidationResult {
  passed: boolean;
  checks: ValidationCheck[];
}

export interface ValidationCheck {
  description: string;
  passed: boolean;
  message?: string;
}
