import { Checklist, RefHeader, RelatedChallenges, Vuln } from '../../components/Reference.js';
import { CodeBlock } from '../../components/CodeBlock.js';

const vuln1_bad = '# terraform.tfstate committed to Git\n# Contains:\n# - database_password\n# - aws_access_key\n# - private_key';
const vuln1_good = '# .gitignore\nterraform.tfstate\nterraform.tfstate.*\n*.tfvars\n.terraform/\n\n# Use remote state with encryption\nterraform {\n  backend "s3" {\n    bucket = "my-tf-state"\n    key    = "prod/terraform.tfstate"\n    region = "us-east-1"\n    encrypt = true\n    dynamodb_table = "terraform-locks"\n  }\n}';

const vuln2_bad = 'resource "aws_s3_bucket" "data" {\n  bucket = "my-company-data"\n}\n\nresource "aws_s3_bucket_acl" "data" {\n  bucket = aws_s3_bucket.data.id\n  acl    = "public-read"\n}';
const vuln2_good = 'resource "aws_s3_bucket" "data" {\n  bucket = "my-company-data"\n}\n\nresource "aws_s3_bucket_public_access_block" "data" {\n  bucket = aws_s3_bucket.data.id\n  block_public_acls       = true\n  block_public_policy     = true\n  ignore_public_acls      = true\n  restrict_public_buckets = true\n}\n\nresource "aws_s3_bucket_server_side_encryption_configuration" "data" {\n  bucket = aws_s3_bucket.data.id\n  rule {\n    apply_server_side_encryption_by_default {\n      sse_algorithm = "aws:kms"\n    }\n  }\n}';

const vuln3_bad = '{\n  "Effect": "Allow",\n  "Action": "*",\n  "Resource": "*"\n}';
const vuln3_good = '{\n  "Effect": "Allow",\n  "Action": [\n    "s3:GetObject",\n    "s3:PutObject"\n  ],\n  "Resource": "arn:aws:s3:::my-bucket/*"\n}';

const vuln4_bad = 'variable "aws_access_key" {\n  default = "AKIAIOSFODNN7EXAMPLE"\n}\n\nvariable "db_password" {\n  default = "supersecret123"\n}';
const vuln4_good = 'variable "aws_access_key" {\n  description = "AWS access key from environment"\n  type        = string\n  sensitive   = true\n}\n\nvariable "db_password" {\n  description = "Database password from secrets manager"\n  type        = string\n  sensitive   = true\n}\n\n# Use environment variables or a secrets manager\ndata "aws_secretsmanager_secret_version" "db" {\n  secret_id = "prod/db/password"\n}';

const remoteState = 'terraform {\n  backend "s3" {\n    bucket         = "company-terraform-state"\n    key            = "prod/infrastructure.tfstate"\n    region         = "us-east-1"\n    encrypt        = true\n    dynamodb_table = "terraform-state-locks"\n  }\n}\n\n# State is encrypted with SSE-S3 or SSE-KMS\n# DynamoDB table provides optimistic locking\n# Access controlled via IAM policies on the S3 bucket';

const leastPrivilege = 'resource "aws_iam_role" "app" {\n  name = "app-role"\n\n  assume_role_policy = jsonencode({\n    Version = "2012-10-17"\n    Statement = [{\n      Effect    = "Allow"\n      Principal = { Service = "ec2.amazonaws.com" }\n      Action    = "sts:AssumeRole"\n    }]\n  })\n}\n\nresource "aws_iam_role_policy" "app_s3" {\n  name = "app-s3-access"\n  role = aws_iam_role.app.id\n\n  policy = jsonencode({\n    Version = "2012-10-17"\n    Statement = [{\n      Effect   = "Allow"\n      Action   = ["s3:GetObject", "s3:PutObject"]\n      Resource = "arn:aws:s3:::app-bucket/*"\n    }]\n  })\n}';

const sensitiveVar = 'variable "database_password" {\n  type      = string\n  sensitive = true  # Won\'t appear in plan output\n}\n\n# Use with secrets manager\ndata "aws_secretsmanager_secret_version" "db" {\n  secret_id = "prod/database/password"\n}\n\nresource "aws_db_instance" "main" {\n  password = data.aws_secretsmanager_secret_version.db.secret_string\n  # ...\n}';

export function Terraform() {
  return (
    <div className="space-y-10">
      <RefHeader
        title="Terraform Security"
        lede="Terraform manages cloud infrastructure as code. A misconfigured resource — an open S3 bucket, a wildcard IAM policy, or a leaked state file — can expose your entire cloud environment."
      />

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Common Vulnerabilities</h2>
        <Vuln num={1} title="State Files in Git" description="Terraform state files contain all resource attributes, including secrets, database passwords, and API keys. Committing them to Git exposes every secret your infrastructure uses." bad={vuln1_bad} good={vuln1_good} />
        <Vuln num={2} title="Public S3 Buckets" description="S3 buckets with public read or write ACLs expose data to the internet. AWS has numerous incidents of leaked data through misconfigured S3 buckets." bad={vuln2_bad} good={vuln2_good} />
        <Vuln num={3} title="Wildcard IAM Policies" description="IAM policies with Action: * or Resource: * grant maximum privileges. If credentials leak, attackers have full access to the AWS account." bad={vuln3_bad} good={vuln3_good} />
        <Vuln num={4} title="Hardcoded Credentials in Variables" description="Storing AWS keys, database passwords, or API tokens in .tfvars files or variable defaults exposes them in version control." bad={vuln4_bad} good={vuln4_good} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Secure Patterns</h2>

        <h3 className="text-lg font-bold mb-2 text-ot-text">Remote State with Encryption and Locking</h3>
        <p className="text-ot-muted mb-3">
          Use a remote backend with encryption at rest and DynamoDB locking to prevent concurrent modifications.
        </p>
        <CodeBlock code={remoteState} language="bash" />

        <h3 className="text-lg font-bold mb-2 text-ot-text mt-6">Least-Privilege IAM with Terraform</h3>
        <p className="text-ot-muted mb-3">
          Define IAM policies with specific actions and resources. Use data sources to reference existing policies.
        </p>
        <CodeBlock code={leastPrivilege} language="bash" />

        <h3 className="text-lg font-bold mb-2 text-ot-text mt-6">Sensitive Variable Marking</h3>
        <p className="text-ot-muted mb-3">
          Mark sensitive variables to prevent them from appearing in plan output or state logs.
        </p>
        <CodeBlock code={sensitiveVar} language="bash" />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Hardening Checklist</h2>
        <Checklist items={[
          'Never commit terraform.tfstate or .tfvars to Git',
          'Use remote state with encryption (S3 + KMS)',
          'Enable state locking with DynamoDB',
          'Mark all secret variables as sensitive = true',
          'Use IAM policies with specific actions and resources',
          'Enable S3 bucket public access blocks',
          'Enable server-side encryption on all S3 buckets',
          'Use tfsec or checkov for static analysis',
          'Review plans carefully before applying',
          'Use workspaces or directory structure to isolate environments',
          'Store secrets in AWS Secrets Manager, not in code',
          'Enable CloudTrail logging for all API calls',
        ]} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Related Challenges</h2>
        <RelatedChallenges
          items={[
            { id: 'tf-state-in-git', label: 'State in Git' },
            { id: 'tf-public-s3', label: 'Public S3 Bucket' },
            { id: 'tf-iam-wildcard', label: 'IAM Wildcard' },
          ]}
        />
      </section>
    </div>
  );
}
