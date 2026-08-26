# Scenario: Secrets Leak

You've just joined the team maintaining a Node.js application. While reviewing the CI pipeline, you notice the build step logs show AWS credentials in plaintext.

The previous developer hardcoded the AWS keys directly into the workflow YAML for "convenience." Every build since then has exposed these credentials in the GitHub Actions logs.

**Your mission:** Remove the hardcoded secrets and use GitHub's secrets mechanism instead.

## What's at risk?
- AWS account compromise
- Unauthorized resource access
- Potential data breach
