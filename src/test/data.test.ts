import { describe, expect, it } from 'vitest';
import { createEmptyData, validateAppData } from '../utils/validation';
import { buildBackup, parseBackup } from '../utils/exportImport';
import { repository, STORAGE_KEY } from '../utils/storage';

const validSession = {
  id: 'w1',
  date: '2026-10-05',
  workoutType: 'A',
  startedAt: '2026-10-05T17:00:00.000Z',
  completedAt: '2026-10-05T17:20:00.000Z',
  durationSeconds: 1200,
  completed: true,
  exerciseResults: [{ exerciseId: 'pushups', setsCompleted: 2, repsPerSet: [6, 6], holdDurationSeconds: null, completed: true }],
  notes: '',
};

describe('backup export/import', () => {
  it('round-trips an exported backup', () => {
    const data = createEmptyData();
    data.workoutSessions.push(validSession as never);
    const text = JSON.stringify(buildBackup(data));
    const result = parseBackup(text);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.workoutSessions).toHaveLength(1);
      expect(result.summary.workouts).toBe(1);
    }
  });

  it('rejects invalid JSON', () => {
    const result = parseBackup('{not json');
    expect(result).toEqual({ ok: false, errors: ['This file is not valid JSON.'] });
  });

  it('rejects files from other apps', () => {
    const result = parseBackup(JSON.stringify({ app: 'something-else', version: 1 }));
    expect(result.ok).toBe(false);
  });

  it('rejects the whole import when any record is invalid (strict)', () => {
    const data = createEmptyData();
    const bad = { ...validSession, id: 'w2', date: '2026-13-40' };
    const result = parseBackup(JSON.stringify({ ...buildBackup(data), workoutSessions: [validSession, bad] }));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors.join(' ')).toMatch(/invalid/i);
  });

  it('rejects unsupported versions', () => {
    const result = parseBackup(JSON.stringify({ ...buildBackup(createEmptyData()), version: 99 }));
    expect(result.ok).toBe(false);
  });
});

describe('storage repository', () => {
  it('returns clean data when nothing is stored', () => {
    const { data, issues } = repository.load();
    expect(data.workoutSessions).toEqual([]);
    expect(issues).toEqual([]);
  });

  it('keeps a copy of corrupted storage and starts fresh instead of crashing', () => {
    localStorage.setItem(STORAGE_KEY, '{"broken":');
    const { data, issues } = repository.load();
    expect(data.workoutSessions).toEqual([]);
    expect(issues.length).toBeGreaterThan(0);
    const backups = Object.keys(localStorage).filter((k) => k.startsWith(`${STORAGE_KEY}:corrupt-`));
    expect(backups).toHaveLength(1);
  });

  it('drops individual invalid records when loading (lenient) and reports them', () => {
    const stored = { ...createEmptyData(), workoutSessions: [validSession, { id: 'x' }] };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    const { data, issues } = repository.load();
    expect(data.workoutSessions).toHaveLength(1);
    expect(issues.join(' ')).toMatch(/skipped/);
  });

  it('migrates a payload without a version field', () => {
    const { version: _omit, ...rest } = createEmptyData();
    void _omit;
    const result = validateAppData(rest, { strict: true });
    expect(result.ok).toBe(true);
  });
});
