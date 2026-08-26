# Hint 1: Static vs OIDC

Look for hardcoded `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the workflow. These should be replaced with OIDC-based authentication using `role-to-assume`.
