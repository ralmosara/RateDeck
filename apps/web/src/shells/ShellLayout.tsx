import { Link, useRouterState } from '@tanstack/react-router';
import { HealthPill } from '../shared/ui/HealthPill';
import { Icon } from '../shared/ui/Icon';
import { NAVIGATION } from './navigation';
import { useShell } from './ShellContext';
import s from './ShellLayout.module.css';
import { ImpersonationBar } from '../features/impersonation/ImpersonationBar';

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const { portal, theme, toggleTheme, setPortal } = useShell();
  const routerState = useRouterState();
  const sections = NAVIGATION[portal];

  return (
    <div className={s.layout}>
      {/* Sidebar Navigation */}
      <aside className={s.sidebar}>
        <div className={s.brand}>
          <div className={s.logo} aria-hidden="true" />
          <span className={s.brandName}>RateDeck</span>
          <span className={s.portalPill}>{portal}</span>
        </div>

        <nav className={s.nav}>
          {sections.map((sec) => (
            <div key={sec.title} className={s.navSection}>
              <h3 className={s.navSectionTitle}>{sec.title}</h3>
              <ul className={s.navList}>
                {sec.items.map((item) => {
                  const active = routerState.location.pathname === item.to;
                  return (
                    <li key={item.to}>
                      <Link to={item.to} className={active ? s.navLinkActive : s.navLink}>
                        <Icon name={item.icon} size={18} />
                        {item.label}
                        {item.phase > 0 && <span className={s.phaseChip}>P{item.phase}</span>}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={s.sidebarFoot}>
          <HealthPill />
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={s.main}>
        {/* Top bar with global controls */}
        <header className={s.topbar}>
          <div className={s.topbarLeft}>
            {/* Breadcrumbs or context could go here */}
          </div>
          <div className={s.topbarRight}>
            {portal === 'admin' && (
              <select
                className={s.portalSelect}
                value={portal}
                onChange={(e) => setPortal(e.target.value as any)}
                aria-label="Preview portal as"
              >
                <option value="admin">Admin View</option>
                <option value="reseller">Reseller View</option>
                <option value="customer">Customer View</option>
              </select>
            )}
            <button type="button" className={s.iconButton} onClick={toggleTheme} aria-label="Toggle theme">
              <Icon name={theme === 'dark' ? 'sun' : 'moon'} size={18} />
            </button>
            <div className={s.userAvatar}>
              <Icon name="users" size={16} />
            </div>
          </div>
        </header>
        <ImpersonationBar />
        <div className={s.content}>{children}</div>
      </main>
    </div>
  );
}
