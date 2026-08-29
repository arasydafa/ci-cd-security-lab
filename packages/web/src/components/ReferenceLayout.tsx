import { NavLink, Outlet } from 'react-router-dom';

const topics = [
  { path: '/reference/github-actions', label: 'GitHub Actions', icon: '⚙️' },
  { path: '/reference/docker', label: 'Docker', icon: '🐳' },
  { path: '/reference/kubernetes', label: 'Kubernetes', icon: '☸️' },
  { path: '/reference/terraform', label: 'Terraform', icon: '🏗️' },
  { path: '/reference/monitoring', label: 'Monitoring', icon: '📊' },
];

export function ReferenceLayout() {
  return (
    <div className="flex gap-8 min-h-[calc(100vh-8rem)]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0">
        <div className="sticky top-8">
          <h2 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">
            Security Reference
          </h2>
          <nav className="space-y-0.5">
            <NavLink
              to="/reference"
              end
              className={({ isActive }) =>
                `block px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-green-500/10 text-green-400 font-medium'
                    : 'text-gray-400 hover:text-white hover:bg-dark-700'
                }`
              }
            >
              Overview
            </NavLink>
            {topics.map((t) => (
              <NavLink
                key={t.path}
                to={t.path}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-green-500/10 text-green-400 font-medium'
                      : 'text-gray-400 hover:text-white hover:bg-dark-700'
                  }`
                }
              >
                <span className="text-base">{t.icon}</span>
                {t.label}
              </NavLink>
            ))}
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
