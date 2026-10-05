# Scenario: Silent Scanner

Your pipeline runs a Trivy vulnerability scan on every push. The scan works —
but the SARIF file it produces is never uploaded anywhere. No upload means no
code-scanning alerts: the Security tab stays empty, nobody is notified, and
the run badge stays green while known vulnerabilities sit in your
dependencies.

The upload step is what turns scanner output into alerts, and it needs the
`security-events: write` permission — without it the upload is rejected with
`Resource not accessible by integration`, green run and all.

**Your mission:** Upload the SARIF results with the alerting permission so
findings surface where humans look.

## Key concepts
- Scanner output alone creates zero alerts — only an upload does
- `github/codeql-action/upload-sarif` needs `sarif_file` plus `security-events: write`
- Green runs mean nothing if results never reach the Security tab
