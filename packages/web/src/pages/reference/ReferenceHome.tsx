import { Link } from 'react-router-dom';

const topics = [
  {
    path: '/reference/github-actions',
    icon: '⚙️',
    title: 'GitHub Actions',
    description: 'Workflow security, secrets management, permissions, and supply chain defense.',
    challenges: 12,
    color: 'blue',
  },
  {
    path: '/reference/docker',
    icon: '🐳',
    title: 'Docker',
    description: 'Image hardening, secrets handling, socket mounts, and rootless containers.',
    challenges: 3,
    color: 'cyan',
  },
  {
    path: '/reference/kubernetes',
    icon: '☸️',
    title: 'Kubernetes',
    description: 'RBAC, network policies, pod security, and service account management.',
    challenges: 3,
    color: 'purple',
  },
  {
    path: '/reference/terraform',
    icon: '🏗️',
    title: 'Terraform',
    description: 'State file security, IAM policies, S3 bucket hardening, and resource configuration.',
    challenges: 3,
    color: 'orange',
  },
  {
    path: '/reference/monitoring',
    icon: '📊',
    title: 'Monitoring',
    description: 'Alerting, build status notifications, log hygiene, and secrets prevention.',
    challenges: 3,
    color: 'green',
  },
];

const colorMap: Record<string, string> = {
  blue: 'bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40',
  cyan: 'bg-cyan-500/10 border-cyan-500/20 hover:border-cyan-500/40',
  purple: 'bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40',
  orange: 'bg-orange-500/10 border-orange-500/20 hover:border-orange-500/40',
  green: 'bg-green-500/10 border-green-500/20 hover:border-green-500/40',
};

export function ReferenceHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Security Reference</h1>
        <p className="text-gray-400">
          Comprehensive security guides for CI/CD technologies. Each guide covers common
          vulnerabilities, secure patterns, and hardening checklists.
        </p>
      </div>

      <div className="grid gap-4">
        {topics.map((t) => (
          <Link
            key={t.path}
            to={t.path}
            className={`block rounded-xl p-5 border transition-all hover:shadow-lg ${colorMap[t.color]}`}
          >
            <div className="flex items-start gap-4">
              <span className="text-3xl">{t.icon}</span>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-lg font-bold">{t.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-dark-700 text-gray-400 border border-dark-600">
                    {t.challenges} challenges
                  </span>
                </div>
                <p className="text-sm text-gray-400">{t.description}</p>
              </div>
              <span className="text-gray-600 group-hover:text-gray-400 transition-colors">→</span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
