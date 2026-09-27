import { Checklist, RefHeader, RelatedChallenges, Vuln } from '../../components/Reference.js';
import { CodeBlock } from '../../components/CodeBlock.js';

const vuln1_bad = 'steps:\n  - name: Deploy\n    run: deploy.sh\n    env:\n      AWS_ACCESS_KEY: AKIAIOSFODNN7EXAMPLE\n      AWS_SECRET_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
const vuln1_good = 'steps:\n  - name: Deploy\n    run: deploy.sh\n    env:\n      AWS_ACCESS_KEY: ${{ secrets.AWS_ACCESS_KEY }}\n      AWS_SECRET_KEY: ${{ secrets.AWS_SECRET_KEY }}';

const vuln2_bad = 'permissions: write-all\n\n# Or worse — no permissions block at all (defaults to write-all)';
const vuln2_good = 'permissions:\n  contents: read\n  packages: write\n  # Only grant what this specific job needs';

const vuln3_bad = '- uses: actions/checkout@main\n- uses: actions/setup-node@v2\n- uses: some-org/some-action@latest';
const vuln3_good = '- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1\n- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8  # v4.0.2';

const vuln4_bad = '- name: Build\n  run: |\n    echo "Processing PR: ${{ github.event.pull_request.title }}"\n    echo "${{ github.event.issue.body }}" > /tmp/context.txt';
const vuln4_good = '- name: Build\n  env:\n    PR_TITLE: ${{ github.event.pull_request.title }}\n  run: |\n    echo "Processing PR: $PR_TITLE"\n    # Use env vars, not direct interpolation in run blocks';

const vuln5_bad = '- name: Install\n  run: |\n    curl -sSL https://example.com/install.sh | bash\n    wget -qO- https://example.com/setup.py | python3';
const vuln5_good = '- name: Install\n  run: |\n    curl -sSL https://example.com/install.sh -o install.sh\n    echo "expected_sha256  install.sh" | sha256sum -c -\n    bash install.sh';

const vuln6_bad = 'env:\n  GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}\n  AWS_KEY: ${{ secrets.AWS_KEY }}\n  DB_PASS: ${{ secrets.DB_PASS }}\n  ALL_SECRETS: ${{ toJSON(secrets) }}';
const vuln6_good = 'steps:\n  - name: Deploy\n    env:\n      AWS_KEY: ${{ secrets.AWS_KEY }}\n    run: deploy.sh\n  # Only pass secrets to the steps that need them';

const vuln7_bad = 'on:\n  release:\n    types: [published]\njobs:\n  release:\n    steps:\n      - uses: actions/cache@v4  # shared across runs!\n        with:\n          path: ~/.npm\n          key: npm-deps-${{ hashFiles(\'package-lock.json\') }}\n      - run: npm publish';
const vuln7_good = 'on:\n  release:\n    types: [published]\njobs:\n  release:\n    steps:\n      # No cache in release jobs — install fresh every time\n      - run: npm ci\n      - run: npm publish';

const vuln8_bad = 'on: pull_request_target\njobs:\n  test:\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          repository: ${{ github.event.pull_request.head.repo.full_name }}\n          ref: ${{ github.event.pull_request.head.sha }}\n      - run: npm ci && npm test  # attacker code, your secrets';
const vuln8_good = 'on: pull_request  # fork code, read-only token, no secrets\njobs:\n  test:\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm ci && npm test';

const vuln9_bad = 'jobs:\n  deploy-prod:\n    runs-on: ubuntu-latest\n    steps:\n      - run: ./deploy.sh --target prod  # no gate: any push deploys';
const vuln9_good = 'jobs:\n  deploy-prod:\n    runs-on: ubuntu-latest\n    environment: production  # reviewers + branch policy in Settings\n    steps:\n      - run: ./deploy.sh --target prod';

const vuln10_bad = 'jobs:\n  publish:\n    steps:\n      - run: npm publish  # no proof these bytes came from this pipeline';
const vuln10_good = 'permissions:\n  id-token: write\n  attestations: write\njobs:\n  publish:\n    steps:\n      - uses: anchore/sbom-action@v0\n      - uses: actions/attest@v4\n        with:\n          subject-path: dist/**\n      - run: npm publish';

const vuln11_bad = '- run: echo "${{ toJSON(secrets) }}"  # every secret, one log line, forever';
const vuln11_good = '- name: Deploy\n  env:\n    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}  # one secret, one step\n  run: ./deploy.sh';

const permExample = 'name: CI\non: push\npermissions: {}  # Start empty\n\njobs:\n  test:\n    permissions:\n      contents: read\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test\n\n  deploy:\n    permissions:\n      contents: read\n      id-token: write   # For OIDC\n      packages: write   # For GHCR\n    needs: test\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: ./deploy.sh';

const pinExample = '# Pin to SHA, not tag\n- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1\n- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8  # v4.0.2\n\n# Add to .github/dependabot.yml to auto-update pins\nversion: 2\nupdates:\n  - package-ecosystem: "github-actions"\n    directory: "/"\n    schedule:\n      interval: "weekly"';

const injectionExample = '# DANGEROUS — direct interpolation\n- run: echo "${{ github.event.issue.body }}"\n\n# SAFE — env var indirection\n- run: echo "$ISSUE_BODY"\n  env:\n    ISSUE_BODY: ${{ github.event.issue.body }}';

const cacheExample = '# Release jobs restore NO caches — poisoned entries ship with the release\n- run: npm ci       # fresh, deterministic from the lockfile\n- run: npm publish\n\n# If you must probe a cache, use lookup-only (never download untrusted bytes)\n- uses: actions/cache/restore@v4\n  with:\n    path: ~/.npm\n    key: npm-deps-${{ hashFiles(\'package-lock.json\') }}\n    lookup-only: true';

const pwnExample = '# PWN REQUEST — fork code with base secrets (never do this)\non: pull_request_target\n- uses: actions/checkout@v4\n  with:\n    ref: ${{ github.event.pull_request.head.sha }}\n\n# SAFE — untrusted builds under pull_request (read-only, no secrets)\non: pull_request\n- uses: actions/checkout@v4\n# checkout v7+ also refuses fork checkouts under pull_request_target by default';

const envExample = '# UNGATED — any push that reaches this job ships to production\njobs:\n  deploy-prod:\n    runs-on: ubuntu-latest\n    steps:\n      - run: ./deploy.sh --target prod\n\n# GATED — pauses for reviewers + branch policy (set in Settings > Environments)\njobs:\n  deploy-prod:\n    runs-on: ubuntu-latest\n    environment: production\n    steps:\n      - run: ./deploy.sh --target prod';

const attestExample = '# Attest every release artifact + ship an SBOM\npermissions:\n  contents: read\n  id-token: write      # keyless signing via OIDC\n  attestations: write  # persist the attestation\n\nsteps:\n  - uses: anchore/sbom-action@v0\n  - uses: actions/attest@v4\n    with:\n      subject-path: dist/**\n  - run: npm publish';

const oidcExample = '# COMPLETE OIDC — token permission plus scoped trust (both required)\npermissions:\n  contents: read\n  id-token: write  # mints the OIDC token for role assumption\n\nsteps:\n  - uses: aws-actions/configure-aws-credentials@v4\n    with:\n      role-to-assume: arn:aws:iam::123456789012:role/deploy\n      aws-region: us-east-1\n\n# Trust policy (IAM side): admit exactly one repo and branch\n# "StringEquals": {"token.actions.githubusercontent.com:sub": "repo:org/app:ref:refs/heads/main"}';

const lifecycleExample = '# Secrets lifecycle: scope per step, mask computed values, rotate exposed ones\n- name: Deploy\n  env:\n    DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}  # one secret, one step\n  run: ./deploy.sh\n\n# Never serialize the whole context: echo "${{ toJSON(secrets) }}" prints everything\n# Prefer short-lived credentials (OIDC) over static tokens that never expire';

export function GitHubActions() {
  return (
    <div className="space-y-10">
      <RefHeader
        title="GitHub Actions Security"
        lede="GitHub Actions is the most widely used CI/CD platform. Its flexibility — reusable workflows, marketplace actions, and repository secrets — makes it a prime target for supply chain attacks and misconfigurations."
      />

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Common Vulnerabilities</h2>
        <Vuln num={1} title="Hardcoded Secrets" description="Credentials, API keys, or tokens embedded directly in workflow files. Anyone with read access to the repository can see them." bad={vuln1_bad} good={vuln1_good} />
        <Vuln num={2} title="Overly Broad Permissions" description="Workflows with write-all or permissions that exceed what the job needs. A compromised step can modify code, create releases, or access all secrets." bad={vuln2_bad} good={vuln2_good} />
        <Vuln num={3} title="Unpinned Action Versions" description="Using mutable tags like @main or @v2 means a compromised action update runs automatically in your pipeline." bad={vuln3_bad} good={vuln3_good} />
        <Vuln num={4} title="Script Injection" description="User-controlled inputs (PR titles, issue bodies, branch names) injected into workflow scripts can execute arbitrary code." bad={vuln4_bad} good={vuln4_good} />
        <Vuln num={5} title="Unsafe Dependency Downloads" description="Downloading and executing scripts from external sources without verification. A compromised CDN or repo can inject malware." bad={vuln5_bad} good={vuln5_good} />
        <Vuln num={6} title="Excessive Environment Variable Exposure" description="Dumping all secrets into environment variables exposes them to every step, including third-party actions." bad={vuln6_bad} good={vuln6_good} />
        <Vuln num={7} title="Cache Poisoning in Release Jobs" description="Caches are shared across runs. An entry poisoned by a low-privilege run is restored by the release job and shipped with production credentials — the chain behind CVE-2026-45321." bad={vuln7_bad} good={vuln7_good} />
        <Vuln num={8} title="Pwn Requests via pull_request_target" description="Checking out fork code under pull_request_target executes attacker code with a write token and secrets. Checkout v7+ refuses this by default; older pins stay exploitable." bad={vuln8_bad} good={vuln8_good} />
        <Vuln num={9} title="Ungated Production Deploys" description="A deploy job with no environment: key skips required reviewers, wait timers, and branch policies — any push that reaches it ships to production." bad={vuln9_bad} good={vuln9_good} />
        <Vuln num={10} title="Unattested Releases" description="Published artifacts with no provenance or SBOM give consumers no way to tell your bytes from an impostor substitution." bad={vuln10_bad} good={vuln10_good} />
        <Vuln num={11} title="Secrets Mass Exposure" description="Serializing the whole secrets context prints every secret at once. One log line then exposes the full lifetime of all credentials." bad={vuln11_bad} good={vuln11_good} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Secure Patterns</h2>

        <h3 className="text-lg font-bold mb-2 text-ot-text">Least-Privilege Permissions</h3>
        <p className="text-ot-muted mb-3">
          Set permissions at the workflow level, then narrow per-job. Start with{' '}
          <code className="text-success">permissions: {'{}'}</code> (empty) and add only what's needed.
        </p>
        <CodeBlock code={permExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6 text-ot-text">Pin Actions to Full SHA</h3>
        <p className="text-ot-muted mb-3">
          Use the full 40-character commit SHA. Add a comment with the version for readability.
          Dependabot can automate updates.
        </p>
        <CodeBlock code={pinExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6 text-ot-text">Protect Against Script Injection</h3>
        <p className="text-ot-muted mb-3">
          Never interpolate GitHub context values directly in <code className="text-success">run:</code>{' '}
          blocks. Pass them through environment variables instead.
        </p>
        <CodeBlock code={injectionExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6 text-ot-text">Keep Caches Out of Release Jobs</h3>
        <p className="text-ot-muted mb-3">
          Release and publish jobs must not restore caches written by less-trusted runs.
          Since June 2026 untrusted triggers get a read-only cache, but shared entries from
          other branches remain a poisoning vector — install fresh on every release.
        </p>
        <CodeBlock code={cacheExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6 text-ot-text">Defuse Pwn Requests</h3>
        <p className="text-ot-muted mb-3">
          Run untrusted fork code under the <code className="text-success">pull_request</code> event
          (read-only token, no secrets). Reserve <code className="text-success">pull_request_target</code> for
          metadata-only work or gate it on a maintainer-added label.
        </p>
        <CodeBlock code={pwnExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6 text-ot-text">Gate Production with Environments</h3>
        <p className="text-ot-muted mb-3">
          Name the protected environment in the job; configure required reviewers, wait timers,
          and branch policy in repository Settings. A misspelled name silently creates an
          unprotected environment instead.
        </p>
        <CodeBlock code={envExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6 text-ot-text">Attest Provenance and Ship an SBOM</h3>
        <p className="text-ot-muted mb-3">
          Bind every release artifact to its source, commit, and build with a signed
          attestation, and document dependencies with an SBOM so vulnerable libraries
          stay visible.
        </p>
        <CodeBlock code={attestExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6 text-ot-text">Wire Real OIDC: Permission Plus Scoped Trust</h3>
        <p className="text-ot-muted mb-3">
          OIDC needs both halves: the workflow permission that mints the token, and a
          trust policy that admits exactly one repository and branch. A wildcard subject
          delegates your role to strangers.
        </p>
        <CodeBlock code={oidcExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6 text-ot-text">Run a Secrets Lifecycle</h3>
        <p className="text-ot-muted mb-3">
          Create secrets in a manager, distribute one per step, mask computed values,
          and rotate anything that ever touched logs. Static credentials work until
          manually revoked — assume exposed ones already leaked.
        </p>
        <CodeBlock code={lifecycleExample} language="yaml" />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Hardening Checklist</h2>
        <Checklist items={[
          'Set permissions: {} at workflow level, narrow per-job',
          'Pin all actions to full SHA with version comments',
          'Store secrets in GitHub Secrets, never in code',
          'Use environment variables for GitHub context in run blocks',
          'Avoid pull_request_target unless absolutely necessary',
          'Enable branch protection — require PR reviews for main',
          'Use OpenID Connect (OIDC) for cloud authentication instead of long-lived keys',
          'Audit third-party actions before using them',
          'Run minimal, ephemeral runners for sensitive jobs',
          'Enable secret scanning and push protection',
          'Restore no caches in release and publish jobs',
          'Never check out fork refs under pull_request_target',
          'Gate every production deploy behind a protected environment',
          'Attest release artifacts and ship an SBOM',
          'Scope OIDC trust to one repo and branch — never repo:org/*',
          'Reference single secrets per step; never serialize the secrets context',
        ]} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Related Challenges</h2>
        <RelatedChallenges
          columns={2}
          items={[
            { id: 'secrets-leak', label: 'Secrets Leak' },
            { id: 'permissions-overkill', label: 'Permissions Overkill' },
            { id: 'unsafe-deps', label: 'Unsafe Dependencies' },
            { id: 'error-swallowing', label: 'Error Swallowing' },
            { id: 'unverified-script', label: 'Unverified Script' },
            { id: 'env-dumping', label: 'Env Dumping' },
            { id: 'self-hosted-risk', label: 'Self-Hosted Risk' },
            { id: 'reusable-workflow-injection', label: 'Reusable Workflow Injection' },
            { id: 'supply-chain-attack', label: 'Supply Chain Attack' },
            { id: 'artifact-tampering', label: 'Artifact Tampering' },
            { id: 'script-injection', label: 'Script Injection' },
            { id: 'oidc-misconfig', label: 'OIDC Misconfig' },
            { id: 'cache-poisoning', label: 'Cache Poisoning' },
            { id: 'pr-target-pwn', label: 'Pwn Request' },
            { id: 'ungated-prod', label: 'Ungated Prod' },
            { id: 'slsa-provenance', label: 'Prove the Build' },
            { id: 'secrets-lifecycle', label: 'Secrets Lifecycle' },
          ]}
        />
      </section>
    </div>
  );
}
