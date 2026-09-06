# CI/CD Security Lab

> An interactive learning platform for CI/CD security. Simulate vulnerable GitHub Actions workflows, identify security issues, and learn to build secure pipelines.

<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.5-3178C6?logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite" alt="Vite">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Turborepo-2.0-3F8EF2?logo=turborepo" alt="Turborepo">
</p>

## Overview

CI/CD Security Lab is a hands-on simulator that teaches pipeline security through 24 challenges. Users analyze vulnerable GitHub Actions workflows, identify security flaws (secrets leaks, supply chain attacks, overly broad permissions), and learn to build secure pipelines. Supports both CLI and Web UI interfaces.

## Features

### Simulation Engine
- **Real YAML Parsing**: Parses actual GitHub Actions workflow syntax
- **Sandboxed Execution**: Runs steps locally with security controls
- **Vulnerability Detection**: Identifies secrets leaks, supply chain risks, permissions issues
- **Fix Validation**: Validates user fixes against challenge requirements

### 24 Hands-On Challenges

| Difficulty | Count | Topics |
|------------|-------|--------|
| Beginner | 10 | Hardcoded secrets, unpinned actions, root containers |
| Intermediate | 9 | Supply chain attacks, script injection, OIDC misconfig |
| Advanced | 5 | Cross-workflow injection, RBAC escalation, IAM wildcards |

**Topics Covered**: GitHub Actions (12), Docker (3), Kubernetes (3), Terraform (3), Monitoring (3)

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

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 | UI framework |
| TypeScript 5 | Type safety |
| Vite 5 | Build tool |
| Tailwind CSS 3 | Styling |
| Turborepo 2 | Monorepo management |
| Express.js | REST API server |
| Commander.js | CLI framework |
| Prism.js | Syntax highlighting |

## Getting Started

### Prerequisites
- Node.js 18+
- npm

### Installation

```bash
git clone https://github.com/arasydafa/ci-cd-security-lab.git
cd ci-cd-security-lab
npm install
```

### Development

```bash
npm run web        # Web UI dev server on :5173
npm run serve      # API server on :3001
```

### Build

```bash
npm run build
```

### Deploy to GitHub Pages

```bash
npm run build
# Copy dist/ contents to your gh-pages branch
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
├── src/
│   └── index.js       # Entry point
├── package.json
├── turbo.json
└── tsconfig.base.json
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built as an educational tool for learning CI/CD security
- Inspired by GitHub Actions security best practices
- Designed for DevOps engineers and security researchers

---

**Author**: Arasy Dafa Sulistya Kurniawan
