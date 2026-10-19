import type { AppData } from '../types';
import { createEmptyData, validateAppData } from './validation';

export const STORAGE_KEY = 'calisthenics-companion:data';
export const TIMER_STORAGE_KEY = 'calisthenics-companion:timer';

export interface LoadResult {
  data: AppData;
  /** Human-readable notes about recovered or skipped data. */
  issues: string[];
}

function safeStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

/**
 * Versioned localStorage repository. Reads are validated; corrupted payloads are kept
 * under a backup key (never silently destroyed) and the app starts from clean data.
 */
export const repository = {
  load(): LoadResult {
    const storage = safeStorage();
    if (!storage) {
      return { data: createEmptyData(), issues: ['Browser storage is unavailable, so changes will not be saved on this device.'] };
    }
    let raw: string | null;
    try {
      raw = storage.getItem(STORAGE_KEY);
    } catch {
      return { data: createEmptyData(), issues: ['Browser storage could not be read.'] };
    }
    if (raw === null) return { data: createEmptyData(), issues: [] };

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      preserveCorrupt(storage, raw);
      return { data: createEmptyData(), issues: ['Saved data was unreadable. A copy was kept in storage and the app started fresh.'] };
    }
    const result = validateAppData(parsed, { strict: false });
    if (!result.ok) {
      preserveCorrupt(storage, raw);
      return { data: createEmptyData(), issues: [...result.errors, 'A copy of the unreadable data was kept in storage and the app started fresh.'] };
    }
    return { data: result.data, issues: result.issues };
  },

  save(data: AppData): { ok: true } | { ok: false; error: string } {
    const storage = safeStorage();
    if (!storage) return { ok: false, error: 'Browser storage is unavailable.' };
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(data));
      return { ok: true };
    } catch (e) {
      const quota = e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22);
      return { ok: false, error: quota ? 'Browser storage is full. Export a backup to keep your data safe.' : 'Your latest change could not be saved to browser storage.' };
    }
  },

  clear(): void {
    const storage = safeStorage();
    try {
      storage?.removeItem(STORAGE_KEY);
      storage?.removeItem(TIMER_STORAGE_KEY);
    } catch {
      /* nothing else to do */
    }
  },
};

function preserveCorrupt(storage: Storage, raw: string) {
  try {
    storage.setItem(`${STORAGE_KEY}:corrupt-${Date.now()}`, raw);
  } catch {
    /* storage full — nothing more we can safely do */
  }
}
