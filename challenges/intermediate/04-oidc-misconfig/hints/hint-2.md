# Hint 2: The fix

Add `id-token: write` to permissions, then tighten the trust condition to
`"StringEquals": {"token.actions.githubusercontent.com:sub": "repo:my-org/my-app:ref:refs/heads/main"}`.
No wildcards — exactly one repo and branch may assume the role.
