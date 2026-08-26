# Scenario: IAM Wildcard Policies

Your Terraform creates an IAM policy with `"Action": "*"` and `"Resource": "*"`. This grants the entity (user, role, or service) full access to every AWS service and resource.

This is equivalent to giving someone the AWS root credentials. If the credentials leak (via compromised CI, leaked env var, or social engineering), the attacker can:
- Access all S3 buckets
- Modify any infrastructure
- Create backdoor IAM users
- Exfiltrate all data

**Your mission:** Replace wildcards with specific actions and resource ARNs. Only grant what the application actually needs.

## Example of least-privilege
Instead of `"Action": "*"`, use `"Action": ["s3:GetObject", "s3:PutObject"]`
Instead of `"Resource": "*"`, use `"Resource": "arn:aws:s3:::my-bucket/*"`
