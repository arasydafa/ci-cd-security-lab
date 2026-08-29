import { Link } from 'react-router-dom';
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

const permExample = 'name: CI\non: push\npermissions: {}  # Start empty\n\njobs:\n  test:\n    permissions:\n      contents: read\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: npm test\n\n  deploy:\n    permissions:\n      contents: read\n      id-token: write   # For OIDC\n      packages: write   # For GHCR\n    needs: test\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: ./deploy.sh';

const pinExample = '# Pin to SHA, not tag\n- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11  # v4.1.1\n- uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8  # v4.0.2\n\n# Add to .github/dependabot.yml to auto-update pins\nversion: 2\nupdates:\n  - package-ecosystem: "github-actions"\n    directory: "/"\n    schedule:\n      interval: "weekly"';

const injectionExample = '# DANGEROUS — direct interpolation\n- run: echo "${{ github.event.issue.body }}"\n\n# SAFE — env var indirection\n- run: echo "$ISSUE_BODY"\n  env:\n    ISSUE_BODY: ${{ github.event.issue.body }}';

export function GitHubActions() {
  return (
    <div className="space-y-10">
      <div>
        <Link to="/reference" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-block">
          ← Reference
        </Link>
        <h1 className="text-3xl font-bold mb-3">GitHub Actions Security</h1>
        <p className="text-gray-400 text-lg">
          GitHub Actions is the most widely used CI/CD platform. Its flexibility — reusable workflows,
          marketplace actions, and repository secrets — makes it a prime target for supply chain attacks
          and misconfigurations.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Common Vulnerabilities</h2>
        <Vuln num={1} title="Hardcoded Secrets" description="Credentials, API keys, or tokens embedded directly in workflow files. Anyone with read access to the repository can see them." bad={vuln1_bad} good={vuln1_good} />
        <Vuln num={2} title="Overly Broad Permissions" description="Workflows with write-all or permissions that exceed what the job needs. A compromised step can modify code, create releases, or access all secrets." bad={vuln2_bad} good={vuln2_good} />
        <Vuln num={3} title="Unpinned Action Versions" description="Using mutable tags like @main or @v2 means a compromised action update runs automatically in your pipeline." bad={vuln3_bad} good={vuln3_good} />
        <Vuln num={4} title="Script Injection" description="User-controlled inputs (PR titles, issue bodies, branch names) injected into workflow scripts can execute arbitrary code." bad={vuln4_bad} good={vuln4_good} />
        <Vuln num={5} title="Unsafe Dependency Downloads" description="Downloading and executing scripts from external sources without verification. A compromised CDN or repo can inject malware." bad={vuln5_bad} good={vuln5_good} />
        <Vuln num={6} title="Excessive Environment Variable Exposure" description="Dumping all secrets into environment variables exposes them to every step, including third-party actions." bad={vuln6_bad} good={vuln6_good} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Secure Patterns</h2>

        <h3 className="text-lg font-bold mb-2">Least-Privilege Permissions</h3>
        <p className="text-gray-400 mb-3">
          Set permissions at the workflow level, then narrow per-job. Start with{' '}
          <code className="text-green-400">permissions: {'{}'}</code> (empty) and add only what's needed.
        </p>
        <CodeBlock code={permExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6">Pin Actions to Full SHA</h3>
        <p className="text-gray-400 mb-3">
          Use the full 40-character commit SHA. Add a comment with the version for readability.
          Dependabot can automate updates.
        </p>
        <CodeBlock code={pinExample} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6">Protect Against Script Injection</h3>
        <p className="text-gray-400 mb-3">
          Never interpolate GitHub context values directly in <code className="text-green-400">run:</code>{' '}
          blocks. Pass them through environment variables instead.
        </p>
        <CodeBlock code={injectionExample} language="yaml" />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Hardening Checklist</h2>
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
        ]} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Related Challenges</h2>
        <div className="grid grid-cols-2 gap-3">
          {[
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
          ].map((c) => (
            <Link key={c.id} to={`/challenges/${c.id}`} className="text-sm text-gray-400 hover:text-green-400 transition-colors px-3 py-2 rounded-lg bg-dark-800 border border-dark-600 hover:border-green-500/30">
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Vuln({ num, title, description, bad, good }: { num: number; title: string; description: string; bad: string; good: string }) {
  return (
    <div className="mb-6 bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-600">
        <h3 className="font-bold"><span className="text-red-400 mr-2">{num}.</span>{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-4 bg-red-500/5 border-r border-dark-600">
          <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Vulnerable</div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{bad}</pre>
        </div>
        <div className="p-4 bg-green-500/5">
          <div className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Secure</div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{good}</pre>
        </div>
      </div>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 space-y-2.5">
      {items.map((item, i) => (
        <label key={i} className="flex items-start gap-3 text-sm text-gray-300 cursor-default">
          <input type="checkbox" className="mt-1 rounded border-dark-600 bg-dark-700 text-green-500 focus:ring-green-500/50" readOnly />
          {item}
        </label>
      ))}
    </div>
  );
}
