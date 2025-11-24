# CI/CD Security Lab: Malicious Pull Request Injection

This repository is a **hands-on security lab** that demonstrates how a malicious contributor can weaponize GitHub Actions through a seemingly innocent pull request.  
It simulates a complete APT-style attack chain (recon → credential theft → persistence → code injection → exfiltration) when CI/CD pipelines are misconfigured.

You’ll also find side-by-side examples of insecure vs. secure workflows so you can instantly see what goes wrong and how to fix it.

**Everything here is intentionally vulnerable where marked — use only in a safe, private repository.**

## Repository Structure

```bash
.
├── .github/workflows/
│   ├── insecure-deploy.yml    # Classic "what not to do" pipeline
│   ├── secure-deploy.yml      # Production-grade secure pipeline
│   ├── malicious-pr.yml       # Full malicious PR attack chain
│   └── pr-scan.yml            # Safe PR analysis workflow
├── src/
│   └── index.js               # Target file for malicious injection
├── .env.example               # Never commit real secrets
├── package.json
├── package-lock.json
└── README.md
```

## Lab Scenarios

### malicious-pr.yml – The Attack Workflow
Triggered on every `pull_request` to `main`. Contains a realistic 5-stage attack:

| Stage                  | What the attacker does                                      | Real-world impact if this runs |
|-------------------------|--------------------------------------------------------------|--------------------------------|
| 1. Recon                | `env`, `ls -la`, enumerate runner                            | Full environment fingerprinting |
| 2. Credential Harvesting| Search for AWS keys, `.env`, `.npmrc`, `~/.ssh`              | Steal deploy credentials       |
| 3. Persistence          | Create hidden backdoor + `@reboot` cron job                  | Compromise self-hosted runners permanently |
| 4. Supply-Chain Injection| Append malicious code to `src/index.js`                     | Poison the codebase before merge |
| 5. Exfiltration         | POST stolen source/code to attacker-controlled C2 server     | Intellectual property theft    |

### insecure-deploy.yml – Real-world Anti-Pattern
Contains nearly every common mistake seen in production today:
- Hard-coded AWS credentials and bucket names
- `permissions: write-all`
- Logging secrets directly to workflow logs
- Running untrusted scripts
- No integrity checks, no secret masking

### secure-deploy.yml – Modern Secure Pipeline
Implements current (2025) best practices:
- Strict least-privilege permissions per job
- Build → artifact → deploy separation
- OIDC-based AWS authentication (`id-token: write`)
- Artifact checksum verification
- Secret masking with `::add-mask::`
- Pinned action versions, no untrusted code execution

### pr-scan.yml – Safe PR Inspection
Runs CodeQL on incoming PRs without giving the PR contributor access to secrets or write permissions.

## Key Takeaways

- A single untrusted pull request can compromise your entire pipeline if workflows are permissive
- Never use hardcoded secrets — always use GitHub Secrets or OIDC
- Forked PRs get a restricted token by default, but many repos still override this dangerously
- Separate build, test, and deploy stages with minimal permissions
- Always pin actions to a full length commit SHA in production
- Validate artifact integrity before deployment

## How to Use This Lab

1. Fork this repo (keep it private!)
2. Create a pull request from a new branch or a fork
3. Watch `malicious-pr.yml` automatically execute the full attack chain
4. Compare logs and behavior with `secure-deploy.yml`

## References & Further Reading

- GitHub Actions Security Hardening Guide  
  https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions
- OWASP CI/CD Security Cheat Sheet  
  https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html
- Using OpenID Connect with AWS  
  https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- SLSA Framework & Supply Chain Security  
  https://slsa.dev

Created and maintained by [@arasydafa](https://github.com/arasydafa) — **for educational and red team training purposes only**.
