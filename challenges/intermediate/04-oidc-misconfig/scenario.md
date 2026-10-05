# Scenario: OIDC Misconfiguration

Your team moved from static AWS credentials to OIDC federation — but the setup
is wrong in two ways. First, the workflow never grants `id-token: write`, so
GitHub mints no OIDC token for the role assumption. Second, the role trust
policy uses a wildcard subject — `repo:my-org/*` — so ANY repository in your
organization can assume the deployment role.

A malicious repo in your org can mint a token for your role and access
production AWS resources with a trusted identity.

**Your mission:** Complete the OIDC wiring with `id-token: write`, and scope
the trust policy `sub` condition to exactly one repository and branch.

## Key concepts
- `role-to-assume` needs `permissions: id-token: write` to mint the token
- The trust policy `sub` decides WHO may assume the role — wildcards delegate it to strangers
- `StringEquals` with `repo:org/app:ref:refs/heads/main` admits exactly one ref
