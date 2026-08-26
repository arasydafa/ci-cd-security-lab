# Scenario: OIDC Misconfiguration

Your team moved from static AWS credentials to OIDC federation — great! But the OIDC trust policy is overly broad. It allows ANY repository in your GitHub organization to assume the deployment role.

A malicious repo in your org could use this role to access your production AWS resources.

**Your mission:** Configure OIDC properly with the `aws-actions/configure-aws-credentials` action and ensure the workflow uses role assumption instead of static credentials.
