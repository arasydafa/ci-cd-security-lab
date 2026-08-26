# Hint 2: The fix

Remove `git add *.tfstate` from the workflow. Add `*.tfstate` and `.terraform/` to `.gitignore`. Configure a remote backend (S3, GCS, Terraform Cloud) in your `backend "s3" {}` block.
