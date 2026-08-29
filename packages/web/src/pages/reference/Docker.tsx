import { Link } from 'react-router-dom';
import { CodeBlock } from '../../components/CodeBlock.js';

const vuln1_bad = 'FROM node:20\nWORKDIR /app\nCOPY . .\nRUN npm install\nCMD ["node", "server.js"]';
const vuln1_good = 'FROM node:20-slim\nWORKDIR /app\nRUN addgroup --system app && adduser --system --ingroup app app\nCOPY --chown=app:app . .\nUSER app\nCMD ["node", "server.js"]';

const vuln2_bad = 'FROM node:20\nENV DB_PASSWORD=supersecret\nENV AWS_KEY=AKIAIOSFODNN7EXAMPLE\nCOPY . .\nCMD ["node", "server.js"]';
const vuln2_good = 'FROM node:20-slim\nWORKDIR /app\nCOPY . .\n# Use Docker secrets or mount at runtime\n# docker run --secret id=dbpass,src=dbpass.txt\nCMD ["node", "server.js"]';

const vuln3_bad = 'docker run -v /var/run/docker.sock:/var/run/docker.sock docker:dind';
const vuln3_good = '# Use Docker-in-Docker (dind) with limited scope, or use rootless Docker\n# If socket mount is required, restrict with AppArmor/SELinux profiles\ndocker run --security-opt apparmor=docker-stricted docker:dind';

const vuln4_bad = 'FROM node:latest\nFROM python:3\nFROM ubuntu';
const vuln4_good = 'FROM node:20.11.1-slim\nFROM python:3.12.2-slim\nFROM ubuntu:22.04';

const vuln5_bad = 'docker run --privileged myimage';
const vuln5_good = '# Grant only the specific capability needed\ndocker run --cap-drop ALL --cap-add NET_ADMIN myimage';

const multiStage = '# Build stage\nFROM node:20-slim AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci --only=production\nCOPY . .\nRUN npm run build\n\n# Production stage\nFROM node:20-slim\nRUN addgroup --system app && adduser --system --ingroup app app\nWORKDIR /app\nCOPY --from=builder --chown=app:app /app/dist ./dist\nCOPY --from=builder --chown=app:app /app/node_modules ./node_modules\nUSER app\nEXPOSE 3000\nHEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:3000/health || exit 1\nCMD ["node", "dist/server.js"]';

const secretsCompose = '# Docker Compose with secrets\nservices:\n  app:\n    image: myapp:1.0.0\n    secrets:\n      - db_password\n      - api_key\n    environment:\n      DB_PASSWORD_FILE: /run/secrets/db_password\n      API_KEY_FILE: /run/secrets/api_key\n\nsecrets:\n  db_password:\n    file: ./secrets/db_password.txt\n  api_key:\n    file: ./secrets/api_key.txt';

const readOnlyFs = 'docker run --read-only --tmpfs /tmp:rw,noexec,nosuid myapp\n\n# In docker-compose.yml:\nservices:\n  app:\n    image: myapp:1.0.0\n    read_only: true\n    tmpfs:\n      - /tmp:rw,noexec,nosuid';

export function Docker() {
  return (
    <div className="space-y-10">
      <div>
        <Link to="/reference" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-block">
          ← Reference
        </Link>
        <h1 className="text-3xl font-bold mb-3">Docker Security</h1>
        <p className="text-gray-400 text-lg">
          Docker containers are everywhere in CI/CD — building images, running tests, deploying
          applications. A misconfigured Dockerfile or runtime can give attackers root access to your
          build host or production systems.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Common Vulnerabilities</h2>
        <Vuln num={1} title="Running as Root" description="Containers running as root can escape to the host if a vulnerability is exploited. The default Docker user is root." bad={vuln1_bad} good={vuln1_good} />
        <Vuln num={2} title="Secrets in Environment Variables" description="Secrets passed as ENV are baked into image layers and visible via docker history or inspection." bad={vuln2_bad} good={vuln2_good} />
        <Vuln num={3} title="Docker Socket Mount" description="Mounting /var/run/docker.sock gives the container full control over the Docker daemon — equivalent to root on the host." bad={vuln3_bad} good={vuln3_good} />
        <Vuln num={4} title="Unpinned Base Images" description="Using :latest or mutable tags means your build environment changes without notice." bad={vuln4_bad} good={vuln4_good} />
        <Vuln num={5} title="Privileged Mode" description="The --privileged flag disables all security mechanisms including seccomp, AppArmor, and capabilities." bad={vuln5_bad} good={vuln5_good} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Secure Patterns</h2>

        <h3 className="text-lg font-bold mb-2">Multi-Stage Build with Non-Root User</h3>
        <p className="text-gray-400 mb-3">
          Multi-stage builds reduce attack surface by excluding build tools from production images.
          Always create a dedicated non-root user.
        </p>
        <CodeBlock code={multiStage} language="bash" />

        <h3 className="text-lg font-bold mb-2 mt-6">Docker Secrets at Runtime</h3>
        <p className="text-gray-400 mb-3">
          Never bake secrets into images. Use Docker secrets, mounted files, or a secrets manager.
        </p>
        <CodeBlock code={secretsCompose} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6">Read-Only Filesystem</h3>
        <p className="text-gray-400 mb-3">
          Run containers with a read-only filesystem to prevent write-based attacks.
        </p>
        <CodeBlock code={readOnlyFs} language="bash" />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Hardening Checklist</h2>
        <Checklist items={[
          'Always run as non-root user (USER directive)',
          'Use multi-stage builds to minimize attack surface',
          'Pin base images to specific versions',
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
        <h2 className="text-2xl font-bold mb-4">Related Challenges</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'docker-running-as-root', label: 'Container Escape: Running as Root' },
            { id: 'docker-secrets-in-env', label: 'Secrets in Environment' },
            { id: 'docker-socket-mount', label: 'Container Escape: Docker Socket Mount' },
          ].map((c) => (
            <Link key={c.id} to={`/challenges/${c.id}`} className="text-sm text-gray-400 hover:text-green-400 transition-colors px-3 py-2 rounded-lg bg-dark-800 border border-dark-600 hover:border-green-500/30">
              {c.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

function Vuln({ num, title, description, bad, good }: { num: number; title: string; description: string; bad: string; good: string }) {
  return (
    <div className="mb-6 bg-dark-800 rounded-xl border border-dark-600 overflow-hidden">
      <div className="px-5 py-3 border-b border-dark-600">
        <h3 className="font-bold"><span className="text-red-400 mr-2">{num}.</span>{title}</h3>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        <div className="p-4 bg-red-500/5 border-r border-dark-600">
          <div className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2">Vulnerable</div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{bad}</pre>
        </div>
        <div className="p-4 bg-green-500/5">
          <div className="text-xs font-bold text-green-400 uppercase tracking-wider mb-2">Secure</div>
          <pre className="text-xs text-gray-300 whitespace-pre-wrap leading-relaxed">{good}</pre>
        </div>
      </div>
    </div>
  );
}

function Checklist({ items }: { items: string[] }) {
  return (
    <div className="bg-dark-800 rounded-xl border border-dark-600 p-5 space-y-2.5">
      {items.map((item, i) => (
        <label key={i} className="flex items-start gap-3 text-sm text-gray-300 cursor-default">
          <input type="checkbox" className="mt-1 rounded border-dark-600 bg-dark-700 text-green-500 focus:ring-green-500/50" readOnly />
          {item}
        </label>
      ))}
    </div>
  );
}
