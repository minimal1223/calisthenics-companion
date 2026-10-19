import { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import type { PageId } from './types';
import { AppDataProvider, useAppData } from './state/AppDataContext';
import { TimerProvider, useSharedTimer } from './state/TimerContext';
import { ToastProvider } from './state/ToastContext';
import { useHashRoute } from './hooks/useHashRoute';
import { Navigation } from './components/Navigation';
import { MiniTimer } from './components/Timer';
import { Overview } from './pages/Overview';
import { Workouts } from './pages/Workouts';
import { TimerPage } from './pages/TimerPage';
import { Mobility } from './pages/Mobility';
import { Progress } from './pages/Progress';
import { Settings } from './pages/Settings';
import { SAFETY_DISCLAIMER } from './data/plan';

function useThemeAndMotion() {
  const { data } = useAppData();
  const { theme, reducedMotion } = data.settings;

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const apply = () => {
      const resolved = theme === 'system' ? (media?.matches ? 'dark' : 'light') : theme;
      root.dataset.theme = resolved;
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'dark' ? '#141914' : '#F5F6F1');
    };
    apply();
    media?.addEventListener?.('change', apply);
    return () => media?.removeEventListener?.('change', apply);
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.motion = reducedMotion ? 'reduce' : 'auto';
  }, [reducedMotion]);
}

function Shell() {
  const [route, navigate] = useHashRoute();
  const { data, saveError, loadIssues, dismissLoadIssues } = useAppData();
  const timer = useSharedTimer();
  const mainRef = useRef<HTMLElement>(null);
  const firstRender = useRef(true);
  useThemeAndMotion();

  // Move focus to the new screen for keyboard and screen-reader users.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo({ top: 0 });
    mainRef.current?.focus({ preventScroll: true });
  }, [route.page]);

  // Progress is saved on every change, so leaving is only risky when saving has failed.
  useEffect(() => {
    if (!saveError) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [saveError]);

  const badges: Partial<Record<PageId, string>> = {};
  if (data.activeWorkout) badges.workouts = 'workout in progress';
  if (timer.isActive) badges.timer = 'timer active';
  if (data.activeMobility) badges.mobility = 'routine in progress';

  const go = (page: PageId, sub?: string | null) => navigate(page, sub ?? null);

  return (
    <div className="app">
      <a className="skip-link" href="#main" onClick={(e) => { e.preventDefault(); mainRef.current?.focus(); }}>
        Skip to content
      </a>
      <Navigation active={route.page} onNavigate={(p) => go(p)} badges={badges} />
      <main id="main" ref={mainRef} tabIndex={-1} className="main">
        {loadIssues.length > 0 && (
          <div className="notice notice--warning banner" role="status">
            <AlertTriangle size={18} aria-hidden />
            <div>
              <p>
                <strong>Some saved data needed attention.</strong>
              </p>
              <ul className="bullets small">
                {loadIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
            <button type="button" className="icon-button" onClick={dismissLoadIssues} aria-label="Dismiss message">
              <X size={16} aria-hidden />
            </button>
          </div>
        )}
        {saveError && route.page !== 'settings' && (
          <p className="notice notice--error banner" role="alert">
            <AlertTriangle size={18} aria-hidden /> {saveError}
          </p>
        )}

        {route.page === 'overview' && <Overview navigate={go} />}
        {route.page === 'workouts' && <Workouts sub={route.sub} navigate={go} />}
        {route.page === 'timer' && <TimerPage />}
        {route.page === 'mobility' && <Mobility sub={route.sub} navigate={go} />}
        {route.page === 'progress' && <Progress navigate={go} />}
        {route.page === 'settings' && <Settings />}

        <footer className="footer">
          <p>{SAFETY_DISCLAIMER} Stop any exercise that causes pain.</p>
        </footer>
      </main>
      {route.page !== 'timer' && <MiniTimer onOpen={() => go('timer')} />}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppDataProvider>
        <TimerProvider>
          <Shell />
        </TimerProvider>
      </AppDataProvider>
    </ToastProvider>
  );
}
