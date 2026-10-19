import type { AppData } from '../types';
import { today } from './date';
import { validateAppData } from './validation';

export const BACKUP_APP_ID = 'calisthenics-companion';
export const MAX_IMPORT_BYTES = 5 * 1024 * 1024;

export interface BackupFile extends AppData {
  app: typeof BACKUP_APP_ID;
  exportedAt: string;
}

export function buildBackup(data: AppData, now: Date = new Date()): BackupFile {
  return { app: BACKUP_APP_ID, exportedAt: now.toISOString(), ...data };
}

export function backupFilename(now: Date = new Date()): string {
  return `calisthenics-companion-backup-${today(now)}.json`;
}

/** Triggers a client-side download. Nothing is sent to a server. */
export function downloadBackup(data: AppData): string {
  const filename = backupFilename();
  const blob = new Blob([JSON.stringify(buildBackup(data), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}

export interface ImportSummary {
  workouts: number;
  minimum: number;
  mobility: number;
  checkins: number;
  planStartDate: string;
}

export type ParseBackupResult = { ok: true; data: AppData; summary: ImportSummary; issues: string[] } | { ok: false; errors: string[] };

/** Parses and strictly validates backup text. Never touches current data. */
export function parseBackup(text: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, errors: ['This file is not valid JSON.'] };
  }
  if (typeof parsed === 'object' && parsed !== null && 'app' in parsed && (parsed as { app: unknown }).app !== BACKUP_APP_ID) {
    return { ok: false, errors: ['This file is not a Calisthenics Companion backup.'] };
  }
  const result = validateAppData(parsed, { strict: true });
  if (!result.ok) return result;
  const d = result.data;
  return {
    ok: true,
    data: d,
    issues: result.issues,
    summary: {
      workouts: d.workoutSessions.filter((s) => s.workoutType !== 'minimum' && s.completed).length,
      minimum: d.workoutSessions.filter((s) => s.workoutType === 'minimum' && s.completed).length,
      mobility: d.mobilitySessions.filter((s) => s.completed).length,
      checkins: d.checkins.length,
      planStartDate: d.settings.planStartDate,
    },
  };
}

export async function readBackupFile(file: File): Promise<ParseBackupResult> {
  if (file.size > MAX_IMPORT_BYTES) return { ok: false, errors: ['This file is too large to be a backup (over 5 MB).'] };
  if (file.size === 0) return { ok: false, errors: ['This file is empty.'] };
  try {
    return parseBackup(await file.text());
  } catch {
    return { ok: false, errors: ['The file could not be read.'] };
  }
}
