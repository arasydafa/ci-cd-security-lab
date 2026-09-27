# Hint 1: Two missing pieces

This workflow fails OIDC twice. First, `configure-aws-credentials` asks for a
role but the workflow grants no `id-token: write`, so no OIDC token exists.
Second, the trust policy `sub` is `repo:my-org/*` — a wildcard that admits
every repository in the org.
