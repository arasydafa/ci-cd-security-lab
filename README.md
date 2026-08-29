# CI/CD Security Lab

An interactive learning platform for CI/CD security. Simulate vulnerable GitHub Actions workflows, identify security issues, and learn to build secure pipelines.

## What's Inside

### Simulation Engine
- Parses real GitHub Actions YAML syntax
- Executes steps locally with sandboxed shell execution
- Detects security vulnerabilities (secrets leaks, supply chain risks, permissions issues)
- Validates user fixes against challenge requirements

### 24 Hands-On Challenges

**Beginner (10)**

| Challenge | Topic | Concept | Points |
|-----------|-------|---------|--------|
| Don't Leak Your Secrets | GitHub Actions | Hardcoded credentials in workflow | 100 |
| Too Much Power | GitHub Actions | Overly broad permissions | 75 |
| Trust No One | GitHub Actions | Unpinned action versions | 100 |
| Don't Swallow Errors | GitHub Actions | Silenced build failures | 75 |
| Verify Before You Run | GitHub Actions | Unverified remote scripts | 100 |
| Env Dumping | GitHub Actions | Leaking env variables | 100 |
| Container Escape: Running as Root | Docker | Containers running as root | 100 |
| Privileged Pod | Kubernetes | Pods with privileged access | 100 |
| State in Git | Terraform | TF state files in repo | 100 |
| Silent Pipeline | Monitoring | No build status notifications | 100 |

**Intermediate (9)**

| Challenge | Topic | Concept | Points |
|-----------|-------|---------|--------|
| Supply Chain Defense | GitHub Actions | Multi-stage attack detection | 200 |
| Artifact Integrity | GitHub Actions | Missing checksums | 150 |
| Script Injection Defense | GitHub Actions | GitHub context injection | 150 |
| OIDC Trust Done Right | GitHub Actions | AWS credential management | 150 |
| Self-Hosted Risk | GitHub Actions | Runner compromise exposure | 150 |
| Secrets in Environment | Docker | Secrets leaked via env vars | 150 |
| No Network Policy | Kubernetes | Missing network isolation | 150 |
| Public S3 Bucket | Terraform | Exposed cloud storage | 150 |
| Silent Failures | Monitoring | Unnotified pipeline failures | 150 |

**Advanced (5)**

| Challenge | Topic | Concept | Points |
|-----------|-------|---------|--------|
| Reusable Workflow Injection | GitHub Actions | Cross-workflow injection | 200 |
| Container Escape: Docker Socket Mount | Docker | Host socket exposure | 200 |
| RBAC Escalation | Kubernetes | Privilege escalation paths | 200 |
| IAM Wildcard | Terraform | Overly permissive IAM policies | 200 |
| Logging Secrets | Monitoring | Sensitive data in logs | 200 |

### Topics Covered

| Topic | Challenges | Difficulty Range |
|-------|-----------|-----------------|
| GitHub Actions | 12 | Beginner → Advanced |
| Docker | 3 | Beginner → Advanced |
| Kubernetes | 3 | Beginner → Advanced |
| Terraform | 3 | Beginner → Advanced |
| Monitoring | 3 | Beginner → Advanced |

### Two Interfaces

**CLI** — Fast, terminal-native workflow:
```bash
cicd-lab list                    # List all challenges
cicd-lab start secrets-leak      # View challenge details
cicd-lab run -c secrets-leak     # Run simulation
cicd-lab hint secrets-leak 1     # Get a hint
```

**Web UI** — Browser-based with rich visualization:
```bash
npm run web        # Start dev server on :5173
npm run serve      # Start API server on :3001
```

## Quick Start

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run the CLI
npm run sim -- list
npm run sim -- start secrets-leak

# Or start the web UI
npm run web
```

## Project Structure

```
ci-cd-security-lab/
├── packages/
│   ├── shared/        # TypeScript types shared across packages
│   ├── simulator/     # Core simulation engine
│   ├── cli/           # Command-line interface
│   ├── server/        # REST API server
│   └── web/           # React web interface
├── challenges/
│   ├── beginner/      # 10 challenges
│   ├── intermediate/  # 9 challenges
│   └── advanced/      # 5 challenges
└── .github/workflows/ # Demo workflows (the original lab content)
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 18+ |
| Language | TypeScript |
| Monorepo | Turborepo |
| Simulation | js-yaml, child_process |
| CLI | Commander.js, Chalk |
| API | Express.js, Zod |
| Web | React 18, Vite, Tailwind CSS, Prism.js |
| Database | SQLite (Phase 2) |

## Development

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Start development
npm run web        # Web UI dev server
npm run serve      # API server
```

## License

MIT
