# Scenario: Debugging Gone Wrong

A developer added a debugging step to figure out why the build was failing. The step dumps all environment variables to the CI logs using `env | grep` and `printenv`.

Unfortunately, CI logs are stored indefinitely and are accessible to anyone with repository read access. Every secret — AWS keys, API tokens, database passwords — is now exposed in plaintext.

**Your mission:** Remove the environment dump step to prevent credential leakage.

## What's at risk?
- All CI/CD secrets exposed in logs
- AWS account compromise
- Third-party API abuse
