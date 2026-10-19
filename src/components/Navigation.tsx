import { Activity, Dumbbell, LayoutDashboard, LineChart, Settings as SettingsIcon, Timer as TimerIcon, type LucideIcon } from 'lucide-react';
import type { PageId } from '../types';

interface NavItem {
  id: PageId;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard },
  { id: 'workouts', label: 'Workouts', icon: Dumbbell },
  { id: 'timer', label: 'Timer', icon: TimerIcon },
  { id: 'mobility', label: 'Mobility', icon: Activity },
  { id: 'progress', label: 'Progress', icon: LineChart },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
];

interface NavigationProps {
  active: PageId;
  onNavigate: (page: PageId) => void;
  /** Small status markers, e.g. a workout or timer in progress. */
  badges?: Partial<Record<PageId, string>>;
}

export function Navigation({ active, onNavigate, badges = {} }: NavigationProps) {
  return (
    <nav className="nav" aria-label="Main">
      <div className="nav__brand">
        <span className="nav__logo" aria-hidden>
          <svg viewBox="0 0 64 64" width="28" height="28">
            <rect width="64" height="64" rx="16" fill="currentColor" />
            <path d="M18 40c4-10 9-15 14-15s10 5 14 15" fill="none" stroke="var(--primary)" strokeWidth="5" strokeLinecap="round" />
            <circle cx="32" cy="18" r="5" fill="var(--primary)" />
          </svg>
        </span>
        <span className="nav__name">
          Calisthenics
          <br />
          Companion
        </span>
      </div>
      <ul className="nav__list">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = id === active;
          const badge = badges[id];
          return (
            <li key={id}>
              <a
                href={`#/${id}`}
                className={`nav__link${isActive ? ' is-active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(id);
                }}
              >
                <span className="nav__icon">
                  <Icon size={20} aria-hidden />
                  {badge && <span className="nav__dot" aria-hidden />}
                </span>
                <span className="nav__label">{label}</span>
                {badge && <span className="visually-hidden"> ({badge})</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
