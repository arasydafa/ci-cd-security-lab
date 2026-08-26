# Scenario: Permissions Overkill

Your team's workflow has `permissions: write-all` at the top level. This was added "just in case" but it means every job in the workflow can modify your code, create releases, and access Actions secrets.

A malicious dependency in your npm packages could exploit these broad permissions to push code directly to main.

**Your mission:** Restrict permissions to only what each job actually needs.
