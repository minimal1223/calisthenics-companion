import { useId, useState, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from './ConfirmDialog';
import { isValidLocalDate, today } from '../utils/date';

export interface LogSessionValues {
  date: string;
  durationSeconds: number;
  notes: string;
}

interface LogSessionDialogProps {
  open: boolean;
  title: string;
  confirmLabel: string;
  defaultMinutes: number;
  defaultNotes?: string;
  summary?: ReactNode;
  /** Returns a warning (e.g. possible duplicate) for the chosen date, or null. */
  warningFor?: (date: string) => ReactNode | null;
  onConfirm: (values: LogSessionValues) => void;
  onCancel: () => void;
}

export const MAX_SESSION_MINUTES = 240;

/** Explicit confirmation step before anything is logged, with editable date, duration, and notes. */
export function LogSessionDialog(props: LogSessionDialogProps) {
  if (!props.open) return null;
  return <LogSessionDialogInner {...props} />;
}

function LogSessionDialogInner({ title, confirmLabel, defaultMinutes, defaultNotes = '', summary, warningFor, onConfirm, onCancel }: LogSessionDialogProps) {
  const id = useId();
  const [date, setDate] = useState(today());
  const [minutes, setMinutes] = useState(String(Math.max(1, Math.min(MAX_SESSION_MINUTES, Math.round(defaultMinutes)))));
  const [notes, setNotes] = useState(defaultNotes);

  const minutesNum = Number(minutes);
  const minutesError =
    minutes.trim() === '' || !Number.isFinite(minutesNum) || minutesNum < 1 || minutesNum > MAX_SESSION_MINUTES
      ? `Enter a duration between 1 and ${MAX_SESSION_MINUTES} minutes.`
      : null;
  const dateError = !isValidLocalDate(date) ? 'Choose a valid date.' : date > today() ? 'The date cannot be in the future.' : null;
  const warning = !dateError && warningFor ? warningFor(date) : null;

  return (
    <ConfirmDialog
      open
      title={title}
      confirmLabel={confirmLabel}
      cancelLabel="Not yet"
      confirmDisabled={Boolean(minutesError || dateError)}
      onCancel={onCancel}
      onConfirm={() => {
        if (minutesError || dateError) return;
        onConfirm({ date, durationSeconds: Math.round(minutesNum * 60), notes });
      }}
    >
      {summary}
      <div className="form-grid">
        <div className="field">
          <label htmlFor={`${id}-date`}>Date</label>
          <input id={`${id}-date`} type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} aria-invalid={Boolean(dateError)} aria-describedby={dateError ? `${id}-date-err` : undefined} />
          {dateError && <p id={`${id}-date-err`} className="field__error">{dateError}</p>}
        </div>
        <div className="field">
          <label htmlFor={`${id}-min`}>Duration (minutes)</label>
          <input
            id={`${id}-min`}
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_SESSION_MINUTES}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            aria-invalid={Boolean(minutesError)}
            aria-describedby={minutesError ? `${id}-min-err` : `${id}-min-hint`}
          />
          {minutesError ? <p id={`${id}-min-err`} className="field__error">{minutesError}</p> : <p id={`${id}-min-hint`} className="field__hint">Pre-filled from the time you started. Adjust if needed.</p>}
        </div>
      </div>
      <div className="field">
        <label htmlFor={`${id}-notes`}>Notes (optional)</label>
        <textarea id={`${id}-notes`} rows={3} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="How did it feel?" />
      </div>
      {warning && (
        <p className="notice notice--warning" role="note">
          <AlertTriangle size={18} aria-hidden /> <span>{warning}</span>
        </p>
      )}
    </ConfirmDialog>
  );
}
