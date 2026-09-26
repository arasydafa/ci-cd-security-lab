import { Link } from 'react-router-dom';
import { Activity, ArrowRight, Container, Github, Layers, Ship } from 'lucide-react';
import { Badge, Card } from '@omega-os/ui';
import type { BadgeTone } from '@omega-os/ui';

const topics: {
  path: string;
  icon: typeof Github;
  title: string;
  description: string;
  challenges: number;
  tone: BadgeTone;
}[] = [
  {
    path: '/reference/github-actions',
    icon: Github,
    title: 'GitHub Actions',
    description: 'Workflow security, secrets management, permissions, and supply chain defense.',
    challenges: 12,
    tone: 'info',
  },
  {
    path: '/reference/docker',
    icon: Container,
    title: 'Docker',
    description: 'Image hardening, secrets handling, socket mounts, and rootless containers.',
    challenges: 3,
    tone: 'navy',
  },
  {
    path: '/reference/kubernetes',
    icon: Ship,
    title: 'Kubernetes',
    description: 'RBAC, network policies, pod security, and service account management.',
    challenges: 3,
    tone: 'grey',
  },
  {
    path: '/reference/terraform',
    icon: Layers,
    title: 'Terraform',
    description: 'State file security, IAM policies, S3 bucket hardening, and resource configuration.',
    challenges: 3,
    tone: 'warning',
  },
  {
    path: '/reference/monitoring',
    icon: Activity,
    title: 'Monitoring',
    description: 'Alerting, build status notifications, log hygiene, and secrets prevention.',
    challenges: 3,
    tone: 'success',
  },
];

const tileTones: Record<BadgeTone, string> = {
  info: 'bg-info-bg text-info',
  navy: 'bg-navy-bg text-navy-text',
  grey: 'bg-ot-surface-2 text-ot-muted',
  warning: 'bg-warning-bg text-warning',
  success: 'bg-success-bg text-success',
  danger: 'bg-danger-bg text-danger',
};

export function ReferenceHome() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2 text-ot-text">Security Reference</h1>
        <p className="text-ot-muted">
          Comprehensive security guides for CI/CD technologies. Each guide covers common
          vulnerabilities, secure patterns, and hardening checklists.
        </p>
      </div>

      <div className="grid gap-4">
        {topics.map((t) => {
          const Icon = t.icon;
          return (
            <Link key={t.path} to={t.path} className="group block">
              <Card className="ot-transition hover:border-navy hover:shadow-ot-md">
                <div className="flex items-start gap-4">
                  <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-ot-md ${tileTones[t.tone]}`}>
                    <Icon size={24} aria-hidden />
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-bold text-ot-text group-hover:text-navy-text transition-colors">
                        {t.title}
                      </h3>
                      <Badge tone="grey">{t.challenges} challenges</Badge>
                    </div>
                    <p className="text-sm text-ot-muted">{t.description}</p>
                  </div>
                  <ArrowRight
                    size={18}
                    aria-hidden
                    className="mt-1 shrink-0 text-ot-muted group-hover:text-navy-text transition-colors"
                  />
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
