# Scenario: State in Version Control

Your CI pipeline runs `terraform apply` and then commits the `.tfstate` file back to git "for safekeeping." This is a critical mistake.

Terraform state files contain:
- All resource attributes (including sensitive ones)
- Database passwords, API keys, and certificates in plaintext
- Infrastructure topology that aids attackers

Additionally, multiple developers running terraform simultaneously cause state file merge conflicts, potentially corrupting your infrastructure.

**Your mission:** Remove the `git add *.tfstate` step and configure remote state storage instead.
