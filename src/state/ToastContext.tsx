import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, AlertTriangle, X } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastApi {
  notify: (message: string, tone?: ToastTone) => void;
  /** Urgent announcement for screen readers (e.g. timer completion). */
  announce: (message: string) => void;
}

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [alertText, setAlertText] = useState('');
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const handle = timers.current.get(id);
    if (handle) window.clearTimeout(handle);
    timers.current.delete(id);
  }, []);

  const notify = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId.current++;
      setToasts((list) => [...list.slice(-2), { id, message, tone }]);
      timers.current.set(id, window.setTimeout(() => dismiss(id), tone === 'error' ? 8000 : 4000));
    },
    [dismiss],
  );

  const announce = useCallback((message: string) => {
    setAlertText('');
    window.setTimeout(() => setAlertText(message), 50);
  }, []);

  useEffect(() => {
    const handles = timers.current;
    return () => handles.forEach((h) => window.clearTimeout(h));
  }, []);

  return (
    <ToastContext.Provider value={{ notify, announce }}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="false">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.tone}`}>
            {t.tone === 'error' ? <AlertTriangle size={18} aria-hidden /> : <CheckCircle2 size={18} aria-hidden />}
            <span>{t.message}</span>
            <button type="button" className="icon-button icon-button--small" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
      <div className="visually-hidden" role="alert" aria-live="assertive">
        {alertText}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
