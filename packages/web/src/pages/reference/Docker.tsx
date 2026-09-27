import { Checklist, RefHeader, RelatedChallenges, Vuln } from '../../components/Reference.js';
import { CodeBlock } from '../../components/CodeBlock.js';

const vuln1_bad = 'FROM node:20\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["node", "server.js"]';
const vuln1_good = 'FROM node:20-slim\nWORKDIR /app\nRUN addgroup --system app && adduser --system --ingroup app app\nCOPY --chown=app:app . .\nUSER app\nCMD ["node", "server.js"]';

const vuln2_bad = 'FROM node:20\nENV DB_PASSWORD=supersecret\nENV AWS_KEY=AKIAIOSFODNN7EXAMPLE\nCOPY . .\nCMD ["node", "server.js"]';
const vuln2_good = 'FROM node:20-slim\nWORKDIR /app\nCOPY . .\n# Use Docker secrets or mount at runtime\n# docker run --secret id=dbpass,src=dbpass.txt\nCMD ["node", "server.js"]';

const vuln3_bad = 'docker run -v /var/run/docker.sock:/var/run/docker.sock docker:dind';
const vuln3_good = '# Use Docker-in-Docker (dind) with limited scope, or use rootless Docker\n# If socket mount is required, restrict with AppArmor/SELinux profiles\ndocker run --security-opt apparmor=docker-stricted docker:dind';

const vuln4_bad = 'FROM node:latest\nFROM python:3\nFROM ubuntu';
const vuln4_good = 'FROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0\n# Tag for humans, digest for builds — refresh with imagetools inspect';

const vuln5_bad = 'docker run --privileged myimage';
const vuln5_good = '# Grant only the specific capability needed\ndocker run --cap-drop ALL --cap-add NET_ADMIN myimage';

const vuln6_bad = '- run: docker build -t ghcr.io/example/myapp:v1 .\n- run: docker push ghcr.io/example/myapp:v1  # anyone can overwrite this tag';
const vuln6_good = '- uses: sigstore/cosign-installer@v4\n- run: cosign sign --yes ghcr.io/example/myapp:v1  # keyless via OIDC\n# Consumers verify before running: cosign verify --certificate-identity-regexp ...';

const multiStage = '# Build stage\nFROM node:20-slim AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nRUN npm run build\n\n# Production stage\nFROM node:20-slim\nRUN addgroup --system app && adduser --system --ingroup app app\nWORKDIR /app\nCOPY --from=builder --chown=app:app /app/dist ./dist\nCOPY --from=builder --chown=app:app /app/node_modules ./node_modules\nUSER app\nEXPOSE 3000\nHEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:3000/health || exit 1\nCMD ["node", "dist/server.js"]';

const secretsCompose = '# Docker Compose with secrets\nservices:\n  app:\n    image: myapp:1.0.0\n    secrets:\n      - db_password\n      - api_key\n    environment:\n      DB_PASSWORD_FILE: /run/secrets/db_password\n      API_KEY_FILE: /run/secrets/api_key\n\nsecrets:\n  db_password:\n    file: ./secrets/db_password.txt\n  api_key:\n    file: ./secrets/api_key.txt';

const readOnlyFs = 'docker run --read-only --tmpfs /tmp:rw,noexec,nosuid myapp\n\n# In docker-compose.yml:\nservices:\n  app:\n    image: myapp:1.0.0\n    read_only: true\n    tmpfs:\n      - /tmp:rw,noexec,nosuid';

const digestPin = '# Tag for humans, digest for builds\nFROM node:20-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0\n\n# Refresh without pulling:\n#   docker buildx imagetools inspect node:20-slim\n# Automate with Dependabot: package-ecosystem "docker" bumps tag+digest on schedule';

const cosignFlow = 'permissions:\n  contents: read\n  packages: write\n  id-token: write  # keyless signing via OIDC, no long-lived keys\n\nsteps:\n  - uses: sigstore/cosign-installer@v4\n  - run: docker push ghcr.io/example/myapp:v1\n  - run: cosign sign --yes ghcr.io/example/myapp:v1\n\n# Verify before deploying:\n# cosign verify --certificate-identity-regexp "https://github.com/example/*" ghcr.io/example/myapp:v1';

export function Docker() {
  return (
    <div className="space-y-10">
      <RefHeader
        title="Docker Security"
        lede="Docker containers are everywhere in CI/CD — building images, running tests, deploying applications. A misconfigured Dockerfile or runtime can give attackers root access to your build host or production systems."
      />

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Common Vulnerabilities</h2>
        <Vuln num={1} title="Running as Root" description="Containers running as root can escape to the host if a vulnerability is exploited. The default Docker user is root." bad={vuln1_bad} good={vuln1_good} />
        <Vuln num={2} title="Secrets in Environment Variables" description="Secrets passed as ENV are baked into image layers and visible via docker history or inspection." bad={vuln2_bad} good={vuln2_good} />
        <Vuln num={3} title="Docker Socket Mount" description="Mounting /var/run/docker.sock gives the container full control over the Docker daemon — equivalent to root on the host." bad={vuln3_bad} good={vuln3_good} />
        <Vuln num={4} title="Unpinned Base Images" description="Using :latest or mutable tags means your build environment changes without notice. Pin tag@digest so the name resolves to exact bytes." bad={vuln4_bad} good={vuln4_good} />
        <Vuln num={5} title="Privileged Mode" description="The --privileged flag disables all security mechanisms including seccomp, AppArmor, and capabilities." bad={vuln5_bad} good={vuln5_good} />
        <Vuln num={6} title="Unsigned Images" description="Pushed tags are mutable pointers. Without a signature, registries and clusters accept whatever the tag currently points at." bad={vuln6_bad} good={vuln6_good} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Secure Patterns</h2>

        <h3 className="text-lg font-bold mb-2 text-ot-text">Multi-Stage Build with Non-Root User</h3>
        <p className="text-ot-muted mb-3">
          Multi-stage builds reduce attack surface by excluding build tools from production images.
          Always create a dedicated non-root user.
        </p>
        <CodeBlock code={multiStage} language="bash" />

        <h3 className="text-lg font-bold mb-2 text-ot-text mt-6">Docker Secrets at Runtime</h3>
        <p className="text-ot-muted mb-3">
          Never bake secrets into images. Use Docker secrets, mounted files, or a secrets manager.
        </p>
        <CodeBlock code={secretsCompose} language="yaml" />

        <h3 className="text-lg font-bold mb-2 text-ot-text mt-6">Read-Only Filesystem</h3>
        <p className="text-ot-muted mb-3">
          Run containers with a read-only filesystem to prevent write-based attacks.
        </p>
        <CodeBlock code={readOnlyFs} language="bash" />

        <h3 className="text-lg font-bold mb-2 text-ot-text mt-6">Pin Base Images to Digest</h3>
        <p className="text-ot-muted mb-3">
          A tag is a nickname that moves; a digest is the content address. Keep the tag for
          readability and let the digest enforce immutability.
        </p>
        <CodeBlock code={digestPin} language="dockerfile" />

        <h3 className="text-lg font-bold mb-2 text-ot-text mt-6">Sign Images with Keyless Cosign</h3>
        <p className="text-ot-muted mb-3">
          Keyless signing needs no managed keys — the workflow OIDC identity mints a
          short-lived certificate. Sign every pushed reference and verify before deploying.
        </p>
        <CodeBlock code={cosignFlow} language="yaml" />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Hardening Checklist</h2>
        <Checklist items={[
          'Always run as non-root user (USER directive)',
          'Use multi-stage builds to minimize attack surface',
          'Pin base images to digest (tag@sha256), refresh on schedule',
          'Never pass secrets via ENV — use secrets or mounted files',
          'Never mount Docker socket unless absolutely necessary',
          'Drop all capabilities, add only what\'s needed',
          'Use --read-only where possible',
          'Scan images for vulnerabilities (Trivy, Snyk, Grype)',
          'Sign images with cosign or Docker Content Trust',
          'Set resource limits (memory, CPU, pids)',
          'Use .dockerignore to exclude sensitive files',
          'Review and minimize EXPOSEd ports',
        ]} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4 text-ot-text">Related Challenges</h2>
        <RelatedChallenges
          items={[
            { id: 'docker-running-as-root', label: 'Container Escape: Running as Root' },
            { id: 'docker-secrets-in-env', label: 'Secrets in Environment' },
            { id: 'docker-socket-mount', label: 'Container Escape: Docker Socket Mount' },
            { id: 'docker-digest-pin', label: 'Pin the Base' },
            { id: 'cosign-sign', label: 'Sign the Image' },
          ]}
        />
      </section>
    </div>
  );
}
