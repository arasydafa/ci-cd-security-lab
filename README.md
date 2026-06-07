# CI/CD Security Lab

Demonstrates how a malicious pull request can take over your GitHub Actions pipeline — and what the secure version actually looks like.

This repo has intentionally vulnerable workflows. Don't run them in a public repository.

## What's in here

```
.github/workflows/
├── insecure-deploy.yml    ← common production mistakes
├── secure-deploy.yml      ← the fix (real build, OIDC, checksums)
├── malicious-pr.yml       ← 5-stage attack chain on PR
└── pr-scan.yml            ← safe CodeQL scan on PRs

src/index.js               ← attack target for supply-chain demo
.env.example               ← placeholder credentials
package.json               ← minimal Node.js project
```

## The workflows

### `malicious-pr.yml` — the attack

Runs on every PR to `main`. Five jobs chained to simulate a real compromise:

1. **Recon** — dumps `env`, lists repo files, fingerprints the runner
2. **Credential Harvesting** — greps for AWS keys, checks `.npmrc`, `.env`, `~/.ssh`
3. **Persistence** — writes a backdoor script, adds a `@reboot` crontab entry
4. **Supply-Chain Injection** — appends malicious code to `src/index.js`
5. **Exfiltration** — POSTs the modified source to an attacker-controlled server

Open the file and read the steps. Each one is a single `run:` block so it's easy to follow.

### `insecure-deploy.yml` — the anti-pattern

A deploy pipeline with nearly every mistake you'll see in the wild:
- Hardcoded AWS keys in the YAML
- `permissions: write-all`
- Secrets echoed to workflow logs
- Scripts downloaded and executed without verification
- Build failures swallowed with `|| echo`

Every line has a `# !WARNING!` comment pointing out what's wrong.

### `secure-deploy.yml` — the fix

A real build-and-deploy pipeline that actually runs:
- `npm ci` for reproducible installs from `package-lock.json`
- `npm audit` to catch vulnerable dependencies
- `npm run build` (the actual build script, not an echo)
- SHA256 checksums computed and verified across jobs
- OIDC-based AWS auth via `aws-actions/configure-aws-credentials` — no static keys
- `::add-mask::` applied before any sensitive value hits the logs
- Least-privilege permissions on every job

Compare it side-by-side with `insecure-deploy.yml` to see what each fix addresses.

### `pr-scan.yml` — safe PR scanning

Runs CodeQL analysis on PRs without granting the contributor access to secrets or write permissions. Uses `contents: read` + `security-events: write` only.

## Running the lab

1. Fork this repo — **keep it private**
2. Create a branch, make a PR
3. Watch `malicious-pr.yml` execute the full attack chain in Actions
4. Compare with `secure-deploy.yml` on a push to `main`

## What to take away

- An untrusted PR gets code execution on your runner. If your workflow has broad permissions, that's game over.
- Forked PRs get a read-only token by default, but a lot of repos override this.
- Hardcoded secrets in YAML live in git history forever. Use GitHub Secrets or OIDC.
- Pin actions to a version tag at minimum. Full commit SHA for production.
- Separate build, test, and deploy. Give each job the minimum permissions it needs.
- Verify artifacts before deploying them.

## References

- [GitHub Actions security hardening](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)
- [OWASP CI/CD Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html)
- [OIDC with AWS](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [SLSA Framework](https://slsa.dev)

---

Built by [@arasydafa](https://github.com/arasydafa) for educational and red team training purposes.
