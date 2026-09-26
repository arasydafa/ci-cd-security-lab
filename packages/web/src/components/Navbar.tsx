import { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { FlaskConical, Moon, Sun } from 'lucide-react';
import { Navbar as OmegaNavbar, toggleThemeReveal } from '@omega-os/ui';

export function Navbar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Lab ships dark by default (see index.html).
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.classList.contains('dark'),
  );

  /**
   * Toggles light/dark with a circular reveal from the clicked button.
   */
  const handleToggleTheme = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const x = e.clientX || window.innerWidth - 60;
      const y = e.clientY || 40;
      toggleThemeReveal(x, y, () => {
        const next = !dark;
        setDark(next);
        document.documentElement.classList.toggle('dark', next);
      });
    },
    [dark],
  );

  return (
    <div
      className="sticky top-0 z-50 border-b border-ot-border backdrop-blur-sm"
      style={{ background: 'color-mix(in srgb, var(--ot-bg) 85%, transparent)' }}
    >
      <div className="mx-auto max-w-7xl px-4 py-3">
        <OmegaNavbar
          brand={
            <>
              <span className="grid h-8 w-8 place-items-center rounded-ot-sm bg-navy text-sm font-bold text-white">
                <FlaskConical size={18} />
              </span>
              <span>
                <span className="block text-lg font-bold leading-none">CI/CD Security Lab</span>
                <span className="mt-0.5 block text-xs font-normal text-ot-muted">Pipeline security, hands-on</span>
              </span>
            </>
          }
          links={[
            { label: 'Dashboard', active: pathname === '/', onClick: () => navigate('/') },
            {
              label: 'Challenges',
              active: pathname.startsWith('/challenges'),
              onClick: () => navigate('/challenges'),
            },
            {
              label: 'Reference',
              active: pathname.startsWith('/reference'),
              onClick: () => navigate('/reference'),
            },
          ]}
          actions={
            <button
              type="button"
              onClick={handleToggleTheme}
              aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="grid h-8 w-8 place-items-center rounded-ot-sm text-ot-muted transition-all hover:bg-ot-surface hover:text-ot-text active:scale-90"
            >
              {dark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
          }
        />
      </div>
    </div>
  );
}
