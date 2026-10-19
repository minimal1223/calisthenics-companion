import { useId, useRef, useState } from 'react';
import { AlertTriangle, Download, HardDrive, RotateCcw, ShieldCheck, Upload, Volume2 } from 'lucide-react';
import type { ThemePreference } from '../types';
import { useAppData } from '../state/AppDataContext';
import { useToast } from '../state/ToastContext';
import { usePlan } from '../hooks/usePlan';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { downloadBackup, readBackupFile, type ImportSummary } from '../utils/exportImport';
import { formatLongDate, isValidLocalDate, today } from '../utils/date';
import { playChime, unlockAudio } from '../utils/sound';
import { SAFETY_DISCLAIMER, SAFETY_RULES } from '../data/plan';
import type { AppData } from '../types';

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

export function Settings() {
  const { data, updateSettings, replaceAllData, resetAllData, saveError } = useAppData();
  const { notify } = useToast();
  const { currentWeek, beforeStart, afterEnd } = usePlan();
  const id = useId();
  const fileInput = useRef<HTMLInputElement>(null);
  const timeAtFocus = useRef('');
  const s = data.settings;

  const [startDraft, setStartDraft] = useState(s.planStartDate);
  const [startError, setStartError] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [pendingImport, setPendingImport] = useState<{ data: AppData; summary: ImportSummary; fileName: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [soundTest, setSoundTest] = useState<string | null>(null);

  const saveStartDate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidLocalDate(startDraft)) {
      setStartError('Choose a valid date.');
      return;
    }
    setStartError(null);
    updateSettings({ planStartDate: startDraft });
    notify('Plan start date saved.');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportErrors([]);
    const result = await readBackupFile(file);
    if (!result.ok) {
      setImportErrors(result.errors);
      notify('Import failed. Your current data was not changed.', 'error');
      return;
    }
    setPendingImport({ data: result.data, summary: result.summary, fileName: file.name });
  };

  const exportData = () => {
    try {
      const name = downloadBackup(data);
      notify(`Backup exported successfully (${name}).`);
    } catch {
      notify('The backup could not be created in this browser.', 'error');
    }
  };

  return (
    <div className="page">
      <header className="page__header">
        <h1 className="page__title">Settings</h1>
        <p className="page__lead">Your plan, preferences, and data. Everything stays in this browser on this device.</p>
      </header>

      {saveError && (
        <p className="notice notice--error" role="alert">
          <AlertTriangle size={18} aria-hidden /> {saveError}
        </p>
      )}

      <div className="two-col">
        <div className="stack">
          <section className="card" aria-labelledby={`${id}-plan`}>
            <h2 id={`${id}-plan`} className="card__title">Plan</h2>
            <form className="form-row" onSubmit={saveStartDate} noValidate>
              <div className="field">
                <label htmlFor={`${id}-start`}>Plan start date</label>
                <input id={`${id}-start`} type="date" value={startDraft} onChange={(e) => setStartDraft(e.target.value)} aria-invalid={Boolean(startError)} aria-describedby={`${id}-start-h`} />
                <p id={`${id}-start-h`} className={startError ? 'field__error' : 'field__hint'}>
                  {startError ??
                    (beforeStart
                      ? `Week 1 begins ${formatLongDate(s.planStartDate)}.`
                      : afterEnd
                        ? 'The 12 weeks are complete. Pick a new date to start another cycle.'
                        : `Currently week ${currentWeek} of 12. Weeks advance by calendar, never by penalty.`)}
                </p>
              </div>
              <button type="submit" className="button button--secondary" disabled={startDraft === s.planStartDate}>
                Save date
              </button>
            </form>
            <p className="muted small">Changing the date only re-groups your weeks. Logged sessions are never deleted.</p>

            <div className="field">
              <label htmlFor={`${id}-time`}>Preferred workout time</label>
              <input
                id={`${id}-time`}
                type="time"
                value={s.preferredWorkoutTime}
                onFocus={() => (timeAtFocus.current = s.preferredWorkoutTime)}
                onChange={(e) => updateSettings({ preferredWorkoutTime: e.target.value })}
                onBlur={() => {
                  if (timeAtFocus.current !== s.preferredWorkoutTime) notify('Preferred time saved.');
                }}
              />
              <p className="field__hint">A personal anchor for your routine. The app doesn't send notifications.</p>
            </div>
          </section>

          <section className="card" aria-labelledby={`${id}-prefs`}>
            <h2 id={`${id}-prefs`} className="card__title">Preferences</h2>
            <fieldset className="fieldset">
              <legend>Theme</legend>
              <div className="segmented">
                {THEMES.map((t) => (
                  <label key={t.id} className={`segmented__option${s.theme === t.id ? ' is-active' : ''}`}>
                    <input type="radio" name={`${id}-theme`} value={t.id} checked={s.theme === t.id} onChange={() => updateSettings({ theme: t.id })} />
                    {t.label}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="switch">
              <input type="checkbox" checked={s.soundEnabled} onChange={(e) => updateSettings({ soundEnabled: e.target.checked })} />
              <span className="switch__track" aria-hidden />
              <span>
                <span className="switch__label">Timer sound</span>
                <span className="switch__hint">A soft chime when a countdown ends.</span>
              </span>
            </label>
            <button
              type="button"
              className="button button--ghost button--sm"
              onClick={() => {
                unlockAudio();
                window.setTimeout(() => setSoundTest(playChime() ? 'Chime played.' : 'Sound is not available in this browser. The timer will still show when time is up.'), 50);
              }}
            >
              <Volume2 size={16} aria-hidden /> Test sound
            </button>
            {soundTest && (
              <p className="small muted" role="status">
                {soundTest}
              </p>
            )}

            <label className="switch">
              <input type="checkbox" checked={s.reducedMotion} onChange={(e) => updateSettings({ reducedMotion: e.target.checked })} />
              <span className="switch__track" aria-hidden />
              <span>
                <span className="switch__label">Reduce motion</span>
                <span className="switch__hint">Turns off animations. Your system setting is always respected too.</span>
              </span>
            </label>
          </section>
        </div>

        <div className="stack">
          <section className="card" aria-labelledby={`${id}-data`}>
            <h2 id={`${id}-data`} className="card__title">
              <HardDrive size={18} aria-hidden /> Your data
            </h2>
            <p className="small">
              Saved in this browser's local storage — no account and no server. Storage is specific to this browser on this device, and clearing site data
              removes it. Export a backup to keep a copy or move to another device.
            </p>
            <div className="button-row">
              <button type="button" className="button button--primary" onClick={exportData}>
                <Download size={18} aria-hidden /> Export backup
              </button>
              <button type="button" className="button button--secondary" onClick={() => fileInput.current?.click()}>
                <Upload size={18} aria-hidden /> Import backup
              </button>
              <input ref={fileInput} type="file" accept="application/json,.json" className="visually-hidden" tabIndex={-1} aria-hidden onChange={onFile} />
            </div>
            {importErrors.length > 0 && (
              <div className="notice notice--error" role="alert">
                <AlertTriangle size={18} aria-hidden />
                <div>
                  <p>
                    <strong>That file couldn't be imported.</strong> Your current data was not changed.
                  </p>
                  <ul className="bullets">
                    {importErrors.slice(0, 6).map((err) => (
                      <li key={err}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </section>

          <section className="card card--danger" aria-labelledby={`${id}-reset`}>
            <h2 id={`${id}-reset`} className="card__title">Reset all data</h2>
            <p className="small">Removes all sessions, check-ins, and settings from this browser. Consider exporting a backup first.</p>
            <button type="button" className="button button--danger" onClick={() => setConfirmReset(true)}>
              <RotateCcw size={18} aria-hidden /> Reset all data
            </button>
          </section>

          <section className="card card--quiet" aria-labelledby={`${id}-safety`}>
            <h2 id={`${id}-safety`} className="card__title">
              <ShieldCheck size={18} aria-hidden /> Safety
            </h2>
            <p className="small">
              <strong>{SAFETY_DISCLAIMER}</strong>
            </p>
            <ul className="bullets small">
              {SAFETY_RULES.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      <ConfirmDialog
        open={pendingImport !== null}
        title="Replace your current data?"
        tone="danger"
        confirmLabel="Replace with backup"
        cancelLabel="Keep current data"
        onCancel={() => setPendingImport(null)}
        onConfirm={() => {
          if (pendingImport) {
            replaceAllData(pendingImport.data);
            setStartDraft(pendingImport.data.settings.planStartDate);
            notify('Backup imported successfully.');
          }
          setPendingImport(null);
        }}
      >
        {pendingImport && (
          <>
            <p>
              <strong>{pendingImport.fileName}</strong> is a valid backup containing:
            </p>
            <ul className="bullets">
              <li>{pendingImport.summary.workouts} strength sessions</li>
              <li>{pendingImport.summary.minimum} minimum sessions</li>
              <li>{pendingImport.summary.mobility} mobility sessions</li>
              <li>{pendingImport.summary.checkins} check-ins</li>
              <li>Plan start date {formatLongDate(pendingImport.summary.planStartDate)}</li>
            </ul>
            <p>Everything currently stored in this browser will be replaced. This can't be undone unless you've exported a backup.</p>
          </>
        )}
      </ConfirmDialog>

      <ConfirmDialog
        open={confirmReset}
        title="Reset all data?"
        tone="danger"
        confirmLabel="Reset everything"
        cancelLabel="Cancel"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          resetAllData();
          setConfirmReset(false);
          setStartDraft(today());
          notify('All data was reset. A fresh start — welcome back.', 'info');
        }}
      >
        <p>All workouts, mobility sessions, check-ins, and settings in this browser will be permanently removed.</p>
        <button type="button" className="button button--secondary button--sm" onClick={exportData}>
          <Download size={16} aria-hidden /> Export a backup first
        </button>
      </ConfirmDialog>
    </div>
  );
}
