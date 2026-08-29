import { Link } from 'react-router-dom';
import { CodeBlock } from '../../components/CodeBlock.js';

const vuln1_bad = '# No notification configured\n# Failing builds are only visible if someone checks the dashboard\n# Security scans run but nobody reads the results';
const vuln1_good = '# GitHub Actions with Slack notification\n- name: Notify on failure\n  if: failure()\n  uses: slackapi/slack-github-action@v1\n  with:\n    payload: |\n      {\n        "text": "Build failed: ${{ github.repository }}@${{ github.ref_name }}"\n      }';

const vuln2_bad = 'steps:\n  - name: Security scan\n    run: security-scan.sh\n    continue-on-error: true  # Masks failures\n\n  - name: Deploy\n    run: deploy.sh\n    if: always()  # Deploys even if scan failed';
const vuln2_good = 'steps:\n  - name: Security scan\n    run: |\n      security-scan.sh\n      if [ $? -ne 0 ]; then\n        echo "Security scan failed"\n        exit 1\n      fi\n\n  - name: Deploy\n    run: deploy.sh\n    if: success()  # Only deploys if scan passed';

const vuln3_bad = 'steps:\n  - name: Debug\n    run: |\n      echo "DB_PASS=$DB_PASS"\n      printenv | grep SECRET\n      curl -H "Authorization: $TOKEN" https://api.example.com | jq .';
const vuln3_good = 'steps:\n  - name: Debug\n    run: |\n      echo "DB_PASS is set: $([ -n "$DB_PASS" ] && echo yes || echo no)"\n      # Never print env vars containing secrets\n      # Use redaction filters in your CI system';

const vuln4_bad = '# No deployment logging\n# No change tracking\n# No record of who applied what infrastructure changes';
const vuln4_good = '# Terraform Cloud audit logging\nterraform {\n  cloud {\n    organization = "my-org"\n    workspaces {\n      name = "production"\n    }\n  }\n}\n\n# GitHub Actions deployment audit\n- name: Log deployment\n  run: |\n    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) DEPLOY ${{ github.actor }} ${{ github.sha }}" >> deploy-audit.log';

const vuln5_bad = '# No health check configured\n# Load balancer sends traffic to broken instances\n# No automatic rollback on failure';
const vuln5_good = '# Kubernetes with health checks\nspec:\n  containers:\n  - name: app\n    livenessProbe:\n      httpGet:\n        path: /health\n        port: 8080\n      initialDelaySeconds: 10\n      periodSeconds: 30\n    readinessProbe:\n      httpGet:\n        path: /ready\n        port: 8080\n      initialDelaySeconds: 5\n      periodSeconds: 10';

const alertRules = '# Prometheus alerting rule\ngroups:\n- name: security\n  rules:\n  - alert: SecurityScanFailed\n    expr: security_scan_passed == 0\n    for: 5m\n    labels:\n      severity: critical\n    annotations:\n      summary: "Security scan failed on {{ $labels.repo }}"\n      description: "Security scan has been failing for more than 5 minutes"\n\n  - alert: UnauthorizedDeploy\n    expr: rate(deployments_total{authorized="false"}[1h]) > 0\n    labels:\n      severity: critical\n    annotations:\n      summary: "Unauthorized deployment attempt detected"';

const logSanitize = '# Node.js log sanitization example\nconst sensitiveKeys = ["password", "token", "secret", "key", "authorization"];\n\nfunction sanitize(obj) {\n  if (typeof obj !== "object" || obj === null) return obj;\n  const clean = {};\n  for (const [k, v] of Object.entries(obj)) {\n    if (sensitiveKeys.some(s => k.toLowerCase().includes(s))) {\n      clean[k] = "[REDACTED]";\n    } else {\n      clean[k] = sanitize(v);\n    }\n  }\n  return clean;\n}\n\nconsole.log(JSON.stringify(sanitize(requestBody)));';

const pipelineNotify = 'name: CI/CD Pipeline\non: push\n\njobs:\n  security-scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - name: Run Trivy vulnerability scanner\n        uses: aquasecurity/trivy-action@master\n        with:\n          image-ref: myapp:${{ github.sha }}\n          format: sarif\n          output: trivy-results.sarif\n      - name: Upload scan results\n        uses: github/codeql-action/upload-sarif@v3\n        with:\n          sarif_file: trivy-results.sarif\n\n  notify:\n    needs: security-scan\n    if: always()\n    runs-on: ubuntu-latest\n    steps:\n      - name: Slack notification\n        uses: slackapi/slack-github-action@v1\n        with:\n          payload: |\n            {\n              "text": "Pipeline ${{ needs.security-scan.result }}: ${{ github.repository }}"\n            }';

export function Monitoring() {
  return (
    <div className="space-y-10">
      <div>
        <Link to="/reference" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-block">
          ← Reference
        </Link>
        <h1 className="text-3xl font-bold mb-3">Monitoring & Observability Security</h1>
        <p className="text-gray-400 text-lg">
          Monitoring is the last line of defense. Without proper alerting, build status notifications,
          and log hygiene, security incidents go undetected — and secrets leak into logs that persist
          for years.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Common Vulnerabilities</h2>
        <Vuln num={1} title="No Build Status Notifications" description="When build failures go unnoticed, broken or vulnerable code can sit in production for days or weeks." bad={vuln1_bad} good={vuln1_good} />
        <Vuln num={2} title="Silent Pipeline Failures" description="Pipelines that swallow errors or use continue-on-error: true mask security failures." bad={vuln2_bad} good={vuln2_good} />
        <Vuln num={3} title="Secrets in Logs" description="Echoing secrets, printing environment variables, or logging API responses with credentials exposes them in CI/CD logs." bad={vuln3_bad} good={vuln3_good} />
        <Vuln num={4} title="No Audit Trail" description="Without logging who deployed what and when, incident response and compliance become impossible." bad={vuln4_bad} good={vuln4_good} />
        <Vuln num={5} title="Missing Health Checks" description="Deploying without health checks means broken or vulnerable versions stay in rotation, serving traffic and accumulating attacks." bad={vuln5_bad} good={vuln5_good} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Secure Patterns</h2>

        <h3 className="text-lg font-bold mb-2">Alert on Security Events</h3>
        <p className="text-gray-400 mb-3">
          Set up alerts for failed security scans, unauthorized deployments, and unusual access patterns.
        </p>
        <CodeBlock code={alertRules} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6">Log Sanitization</h3>
        <p className="text-gray-400 mb-3">
          Strip secrets and sensitive data before writing to logs. Use structured logging with redaction.
        </p>
        <CodeBlock code={logSanitize} language="bash" />

        <h3 className="text-lg font-bold mb-2 mt-6">Pipeline Notification Pattern</h3>
        <p className="text-gray-400 mb-3">
          Notify on success, failure, and security scan results. Route critical alerts to on-call.
        </p>
        <CodeBlock code={pipelineNotify} language="yaml" />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Hardening Checklist</h2>
        <Checklist items={[
          'Notify on all build failures and security scan results',
          'Never use continue-on-error: true on security steps',
          'Sanitize logs — strip secrets before writing',
          'Enable audit logging for all deployments',
          'Set up health checks and readiness probes',
          'Configure automatic rollback on failed health checks',
          'Centralize logs (ELK, Datadog, CloudWatch)',
          'Set retention policies on log storage',
          'Alert on unauthorized deployment attempts',
          'Monitor for secrets in logs with tools like gitleaks',
          'Track deployment frequency and success rate',
          'Document incident response procedures',
        ]} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Related Challenges</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'mon-no-build-status', label: 'No Build Status' },
            { id: 'mon-silent-failure', label: 'Silent Failures' },
            { id: 'mon-log-secrets', label: 'Logging Secrets' },
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
