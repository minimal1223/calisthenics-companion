import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';

export type WriteResult = { ok: true } | { ok: false; error: string };

export interface PersistentStateOptions<T> {
  /** localStorage key, used to detect changes made in other tabs. */
  key: string;
  /** Reads and validates the stored value (must never throw). */
  read: () => T;
  /** Writes the value; returns an error message when the write fails. */
  write: (value: T) => WriteResult;
}

/**
 * React state mirrored into browser storage. Every change is written after render;
 * write failures are surfaced (never swallowed) so the UI can warn the user.
 * Changes made in another tab are picked up through the `storage` event.
 */
export function usePersistentState<T>({ key, read, write }: PersistentStateOptions<T>): [T, Dispatch<SetStateAction<T>>, string | null] {
  const [value, setValue] = useState<T>(read);
  const [saveError, setSaveError] = useState<string | null>(null);
  const isFirst = useRef(true);
  const skipNextWrite = useRef(false);
  const readRef = useRef(read);
  const writeRef = useRef(write);

  useEffect(() => {
    readRef.current = read;
    writeRef.current = write;
  });

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    const result = writeRef.current(value);
    setSaveError(result.ok ? null : result.error);
  }, [value]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== key) return;
      skipNextWrite.current = true;
      setValue(readRef.current());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [key]);

  const set = useCallback<Dispatch<SetStateAction<T>>>((next) => setValue(next), []);
  return [value, set, saveError];
}
