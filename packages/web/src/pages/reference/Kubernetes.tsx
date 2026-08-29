import { Link } from 'react-router-dom';
import { CodeBlock } from '../../components/CodeBlock.js';

const vuln1_bad = 'apiVersion: v1\nkind: Pod\nspec:\n  containers:\n  - name: app\n    image: myapp\n    securityContext:\n      privileged: true';
const vuln1_good = 'apiVersion: v1\nkind: Pod\nspec:\n  containers:\n  - name: app\n    image: myapp\n    securityContext:\n      allowPrivilegeEscalation: false\n      readOnlyRootFilesystem: true\n      runAsNonRoot: true\n      capabilities:\n        drop: ["ALL"]';

const vuln2_bad = '# No NetworkPolicy resources defined\n# All pods can communicate freely\n# Default: allow all ingress and egress';
const vuln2_good = 'apiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny-ingress\nspec:\n  podSelector: {}\n  policyTypes:\n  - Ingress\n---\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: allow-app-only\nspec:\n  podSelector:\n    matchLabels:\n      app: myapp\n  ingress:\n  - from:\n    - podSelector:\n        matchLabels:\n          app: frontend';

const vuln3_bad = 'apiVersion: rbac.authorization.k8s.io/v1\nkind: ClusterRoleBinding\nmetadata:\n  name: admin-binding\nsubjects:\n- kind: User\n  name: developer\n  apiGroup: rbac.authorization.k8s.io\nroleRef:\n  kind: ClusterRole\n  name: cluster-admin\n  apiGroup: rbac.authorization.k8s.io';
const vuln3_good = 'apiVersion: rbac.authorization.k8s.io/v1\nkind: RoleBinding\nmetadata:\n  name: dev-binding\n  namespace: development\nsubjects:\n- kind: User\n  name: developer\n  apiGroup: rbac.authorization.k8s.io\nroleRef:\n  kind: Role\n  name: deployment-manager\n  apiGroup: rbac.authorization.k8s.io';

const vuln4_bad = 'apiVersion: v1\nkind: Pod\nspec:\n  containers:\n  - name: app\n    image: myapp\n  # serviceAccountToken is auto-mounted by default';
const vuln4_good = 'apiVersion: v1\nkind: Pod\nspec:\n  automountServiceAccountToken: false\n  serviceAccountName: restricted-sa\n  containers:\n  - name: app\n    image: myapp';

const podSecurity = 'apiVersion: v1\nkind: Namespace\nmetadata:\n  name: production\n  labels:\n    pod-security.kubernetes.io/enforce: restricted\n    pod-security.kubernetes.io/audit: restricted\n    pod-security.kubernetes.io/warn: restricted';

const networkSeg = '# Default deny all ingress\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: default-deny-ingress\n  namespace: production\nspec:\n  podSelector: {}\n  policyTypes:\n  - Ingress\n---\n# Allow frontend → backend\napiVersion: networking.k8s.io/v1\nkind: NetworkPolicy\nmetadata:\n  name: allow-frontend-to-backend\n  namespace: production\nspec:\n  podSelector:\n    matchLabels:\n      app: backend\n  ingress:\n  - from:\n    - podSelector:\n        matchLabels:\n          app: frontend\n    ports:\n    - port: 8080\n      protocol: TCP';

const rbac = 'apiVersion: rbac.authorization.k8s.io/v1\nkind: Role\nmetadata:\n  name: deployment-manager\n  namespace: development\nrules:\n- apiGroups: ["apps"]\n  resources: ["deployments"]\n  verbs: ["get", "list", "update", "patch"]\n- apiGroups: [""]\n  resources: ["pods", "services"]\n  verbs: ["get", "list"]';

export function Kubernetes() {
  return (
    <div className="space-y-10">
      <div>
        <Link to="/reference" className="text-sm text-gray-500 hover:text-gray-300 transition-colors mb-4 inline-block">
          ← Reference
        </Link>
        <h1 className="text-3xl font-bold mb-3">Kubernetes Security</h1>
        <p className="text-gray-400 text-lg">
          Kubernetes orchestrates containers at scale, but its complex configuration surface creates
          many opportunities for misconfiguration. A single privileged pod or overly broad RBAC rule
          can compromise an entire cluster.
        </p>
      </div>

      <section>
        <h2 className="text-2xl font-bold mb-4">Common Vulnerabilities</h2>
        <Vuln num={1} title="Privileged Pods" description="Running pods in privileged mode gives them full access to the host kernel, devices, and filesystem. This is equivalent to root on the node." bad={vuln1_bad} good={vuln1_good} />
        <Vuln num={2} title="Missing Network Policies" description="Without NetworkPolicies, all pods can communicate with each other by default. A compromised pod can reach every service in the cluster." bad={vuln2_bad} good={vuln2_good} />
        <Vuln num={3} title="RBAC Privilege Escalation" description="Overly broad ClusterRoleBindings or wildcard permissions allow users to escalate privileges, create new roles, or access all secrets." bad={vuln3_bad} good={vuln3_good} />
        <Vuln num={4} title="Service Account Token Exposure" description="Automounting service account tokens into every pod gives pods access to the Kubernetes API even when they don't need it." bad={vuln4_bad} good={vuln4_good} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Secure Patterns</h2>

        <h3 className="text-lg font-bold mb-2">Pod Security Standards</h3>
        <p className="text-gray-400 mb-3">
          Use Pod Security Admission to enforce baseline or restricted profiles at the namespace level.
        </p>
        <CodeBlock code={podSecurity} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6">Network Segmentation</h3>
        <p className="text-gray-400 mb-3">
          Define default-deny policies and explicitly allow only required communication paths.
        </p>
        <CodeBlock code={networkSeg} language="yaml" />

        <h3 className="text-lg font-bold mb-2 mt-6">Least-Privilege RBAC</h3>
        <p className="text-gray-400 mb-3">
          Create namespace-scoped roles with only the verbs and resources needed.
        </p>
        <CodeBlock code={rbac} language="yaml" />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Hardening Checklist</h2>
        <Checklist items={[
          'Enforce Pod Security Standards (restricted profile)',
          'Set allowPrivilegeEscalation: false on all containers',
          'Use readOnlyRootFilesystem where possible',
          'Drop all Linux capabilities, add only what\'s needed',
          'Define default-deny NetworkPolicies per namespace',
          'Use namespace-scoped RoleBindings, not ClusterRoleBindings',
          'Disable automountServiceAccountToken when not needed',
          'Scan images with Trivy or Snyk before deployment',
          'Enable audit logging on the API server',
          'Use image pull secrets, never public registries for internal images',
          'Set resource requests and limits on every container',
          'Run containers as non-root (runAsNonRoot: true)',
        ]} />
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Related Challenges</h2>
        <div className="grid grid-cols-1 gap-3">
          {[
            { id: 'k8s-privileged-pod', label: 'Privileged Pod' },
            { id: 'k8s-no-network-policy', label: 'No Network Policy' },
            { id: 'k8s-rbac-escalation', label: 'RBAC Escalation' },
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
