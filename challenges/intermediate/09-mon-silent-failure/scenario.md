# Scenario: Silent Failure

Your deploy pipeline has `continue-on-error: true` on critical steps like testing, security scanning, and deployment verification. The pipeline "succeeds" even when tests fail, vulnerabilities are found, or health checks fail.

The team only discovers issues when users report them — hours or days after deployment. There are no alerts, no notifications, no Slack messages. Failures vanish into the void.

**Your mission:** Remove `continue-on-error: true` from critical steps and add a failure notification step that alerts the team.
