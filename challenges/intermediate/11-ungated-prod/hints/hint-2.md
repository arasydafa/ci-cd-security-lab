# Hint 2: The fix

Add `environment: production` to the `deploy-prod` job. Make sure the name
matches the protected environment in Settings exactly — a typo creates a
brand-new unprotected environment instead of gating anything.
