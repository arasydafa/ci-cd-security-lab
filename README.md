# CI/CD Security Lab

An interactive learning platform for CI/CD security. Simulate vulnerable GitHub Actions workflows, identify security issues, and learn to build secure pipelines.

## What's Inside

### Simulation Engine
- Parses real GitHub Actions YAML syntax
- Executes steps locally with sandboxed shell execution
- Detects security vulnerabilities (secrets leaks, supply chain risks, permissions issues)
- Validates user fixes against challenge requirements

### 9 Hands-On Challenges

**Beginner (5)**
| Challenge | Concept | Points |
|-----------|---------|--------|
| Don't Leak Your Secrets | Hardcoded credentials in workflow | 100 |
| Too Much Power | Overly broad permissions | 75 |
| Trust No One | Unpinned action versions | 100 |
| Don't Swallow Errors | Silenced build failures | 75 |
| Verify Before You Run | Unverified remote scripts | 100 |

**Intermediate (4)**
| Challenge | Concept | Points |
|-----------|---------|--------|
| Supply Chain Defense | Multi-stage attack detection | 200 |
| Artifact Integrity | Missing checksums | 150 |
| Script Injection Defense | GitHub context injection | 150 |
| OIDC Trust Done Right | AWS credential management | 150 |

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
├── challenges/        # Challenge definitions (YAML + Markdown)
│   ├── beginner/
│   └── intermediate/
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
| Web | React 18, Vite, Tailwind CSS |
| Database | SQLite (Phase 2) |

## Development

```bash
# Install dependencies
npm install

# Build everything
npm run build

# Run tests
npm run test

# Start development
npm run web        # Web UI dev server
npm run serve      # API server
```

## License

MIT
