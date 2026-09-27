# Scenario: Ungated Prod

Your pipeline builds on every push to `main` and then deploys straight to
production. There is no `environment:` on the deploy job, which means none of
GitHub's deployment protections apply: no required reviewers, no wait timer,
no branch policy, and production secrets are available to every run
immediately.

Any commit that lands on `main` — including a compromised dependency update or
a mistaken merge — reaches production with zero human oversight.

**Your mission:** Gate the production deploy job behind the `production`
environment (required reviewers and branch policy are configured there in
repository Settings).

## Key concepts
- `environment: production` pauses the job until protection rules pass
- Rules live in Settings, the workflow only names the environment
- A missing environment name silently creates an unprotected one — use the exact name
