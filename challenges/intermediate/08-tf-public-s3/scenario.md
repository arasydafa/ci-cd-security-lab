# Scenario: Public S3 Bucket

Your Terraform configuration creates an S3 bucket with `acl = "public-read"` and `block_public_acls = false`. The bucket is used to store application backups and log files.

Anyone on the internet can list and download the bucket contents. This includes:
- Application source code
- Database backups with credentials
- Log files with user data and PII
- Internal configuration files

This is one of the most common AWS misconfigurations and a frequent cause of data breaches.

**Your mission:** Change the ACL to private and enable public access blocks.
