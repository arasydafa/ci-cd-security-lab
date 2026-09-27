# Scenario: Pwn Request

Your workflow triggers on `pull_request_target` so it can label PRs and post
results. To test the actual PR code, it checks out the fork's head commit —
then runs `npm ci` and `npm test` on it.

That combination is a **pwn request**: `pull_request_target` runs in the base
repository context with a write token and access to secrets, but the code it
executes comes from the untrusted fork. Any fork author can run arbitrary code
with your secrets by opening a PR.

Since June 2026 `actions/checkout` v7 refuses fork checkouts under
`pull_request_target` by default — but older pins and manual `git fetch`
patterns stay exploitable, and the design flaw remains yours to fix.

**Your mission:** Stop executing fork code in the privileged context. Run
untrusted builds under the `pull_request` event instead.

## Key concepts
- `pull_request_target` = base code, write token, secrets available
- `pull_request` (from forks) = fork code, read-only token, no secrets
- Checking out `head.sha` or `pull/N/merge` under the target event crosses the trust boundary
