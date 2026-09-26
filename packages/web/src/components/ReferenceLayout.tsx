import { NavLink, Outlet } from 'react-router-dom';
import { Activity, Container, Github, Layers, Ship } from 'lucide-react';

const topics = [
  { path: '/reference/github-actions', label: 'GitHub Actions', icon: Github },
  { path: '/reference/docker', label: 'Docker', icon: Container },
  { path: '/reference/kubernetes', label: 'Kubernetes', icon: Ship },
  { path: '/reference/terraform', label: 'Terraform', icon: Layers },
  { path: '/reference/monitoring', label: 'Monitoring', icon: Activity },
];

const linkClassName = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-2 px-3 py-2 rounded-ot-sm text-sm transition-colors ${
    isActive
      ? 'bg-navy-bg text-navy-text font-medium'
      : 'text-ot-muted hover:text-ot-text hover:bg-ot-surface'
  }`;

export function ReferenceLayout() {
  return (
    <div className="flex gap-8 min-h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0">
        <div className="sticky top-8">
          <h2 className="text-sm font-bold text-ot-muted uppercase tracking-wider mb-3 px-3">
            Security Reference
          </h2>
          <nav className="space-y-0.5">
            <NavLink to="/reference" end className={linkClassName}>
              Overview
            </NavLink>
            {topics.map((t) => {
              const Icon = t.icon;
              return (
                <NavLink key={t.path} to={t.path} className={linkClassName}>
                  <Icon size={16} aria-hidden className="shrink-0" />
                  {t.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </aside>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="max-w-3xl">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
