import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type {
  AppData,
  DraftExercise,
  LocalDate,
  MobilitySession,
  RoutineId,
  Settings,
  StrengthCheckin,
  StrengthWorkoutId,
  WorkoutSession,
} from '../types';
import { usePersistentState } from '../hooks/usePersistentState';
import { repository, STORAGE_KEY } from '../utils/storage';
import { createEmptyData } from '../utils/validation';
import { createId } from '../utils/id';
import { today } from '../utils/date';
import { draftFor, draftToResults } from '../utils/workoutDraft';
import { MOBILITY_ROUTINES } from '../data/mobility';

export interface CompleteWorkoutInput {
  date: LocalDate;
  durationSeconds: number;
  notes: string;
}

export interface AppDataApi {
  data: AppData;
  saveError: string | null;
  loadIssues: string[];
  dismissLoadIssues: () => void;
  updateSettings: (patch: Partial<Settings>) => void;

  startWorkout: (type: StrengthWorkoutId) => void;
  updateDraftExercise: (exerciseId: string, patch: Partial<Omit<DraftExercise, 'exerciseId'>>) => void;
  setDraftNotes: (notes: string) => void;
  discardWorkout: () => void;
  /** Logs the active workout exactly once. Returns null if there is nothing to log. */
  completeWorkout: (input: CompleteWorkoutInput) => WorkoutSession | null;
  logMinimumWorkout: (input: CompleteWorkoutInput & { exerciseIds: string[] }) => WorkoutSession;
  deleteWorkoutSession: (id: string) => void;

  startMobility: (routineId: RoutineId) => void;
  markMobilityMovement: (movementId: string, outcome: 'done' | 'skipped') => void;
  goToMobilityIndex: (index: number) => void;
  cancelMobility: () => void;
  finishMobility: (input: { durationSeconds: number; date: LocalDate; notes?: string }) => MobilitySession | null;
  logMobilityManually: (input: { routineId: RoutineId; exercisesCompleted: string[]; durationSeconds: number; date: LocalDate; notes: string }) => MobilitySession;
  deleteMobilitySession: (id: string) => void;

  addCheckin: (input: Omit<StrengthCheckin, 'id'>) => StrengthCheckin;
  deleteCheckin: (id: string) => void;

  replaceAllData: (data: AppData) => void;
  resetAllData: () => void;
}

const AppDataContext = createContext<AppDataApi | null>(null);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const [initial] = useState(() => repository.load());
  const [loadIssues, setLoadIssues] = useState<string[]>(initial.issues);
  const usedInitial = useRef(false);

  const read = useCallback(() => {
    if (!usedInitial.current) {
      usedInitial.current = true;
      return initial.data;
    }
    return repository.load().data;
  }, [initial]);

  const [data, setData, saveError] = usePersistentState<AppData>({ key: STORAGE_KEY, read, write: repository.save });

  // Guards against logging the same in-progress workout twice (e.g. a double click).
  const loggedDrafts = useRef(new Set<string>());
  const loggedMobility = useRef(new Set<string>());
  const dataRef = useRef(data);
  useLayoutEffect(() => {
    dataRef.current = data;
  }, [data]);

  const updateSettings = useCallback((patch: Partial<Settings>) => setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })), [setData]);

  const startWorkout = useCallback((type: StrengthWorkoutId) => setData((d) => ({ ...d, activeWorkout: draftFor(type) })), [setData]);

  const updateDraftExercise = useCallback(
    (exerciseId: string, patch: Partial<Omit<DraftExercise, 'exerciseId'>>) =>
      setData((d) => {
        if (!d.activeWorkout) return d;
        return {
          ...d,
          activeWorkout: {
            ...d.activeWorkout,
            exercises: d.activeWorkout.exercises.map((e) => (e.exerciseId === exerciseId ? { ...e, ...patch } : e)),
          },
        };
      }),
    [setData],
  );

  const setDraftNotes = useCallback(
    (notes: string) => setData((d) => (d.activeWorkout ? { ...d, activeWorkout: { ...d.activeWorkout, notes } } : d)),
    [setData],
  );

  const discardWorkout = useCallback(() => setData((d) => ({ ...d, activeWorkout: null })), [setData]);

  const completeWorkout = useCallback(
    (input: CompleteWorkoutInput): WorkoutSession | null => {
      const draft = dataRef.current.activeWorkout;
      if (!draft || loggedDrafts.current.has(draft.startedAt)) return null;
      loggedDrafts.current.add(draft.startedAt);
      const session: WorkoutSession = {
        id: createId('workout'),
        date: input.date,
        workoutType: draft.workoutType,
        startedAt: draft.startedAt,
        completedAt: new Date().toISOString(),
        durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
        completed: true,
        exerciseResults: draftToResults(draft),
        notes: input.notes.trim(),
      };
      setData((d) =>
        d.activeWorkout?.startedAt === draft.startedAt ? { ...d, activeWorkout: null, workoutSessions: [...d.workoutSessions, session] } : d,
      );
      return session;
    },
    [setData],
  );

  const logMinimumWorkout = useCallback(
    (input: CompleteWorkoutInput & { exerciseIds: string[] }): WorkoutSession => {
      const session: WorkoutSession = {
        id: createId('minimum'),
        date: input.date,
        workoutType: 'minimum',
        startedAt: null,
        completedAt: new Date().toISOString(),
        durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
        completed: true,
        exerciseResults: input.exerciseIds.map((id) => ({ exerciseId: id, setsCompleted: 1, repsPerSet: [], holdDurationSeconds: null, completed: true })),
        notes: input.notes.trim(),
      };
      setData((d) => ({ ...d, workoutSessions: [...d.workoutSessions, session] }));
      return session;
    },
    [setData],
  );

  const deleteWorkoutSession = useCallback(
    (id: string) => setData((d) => ({ ...d, workoutSessions: d.workoutSessions.filter((s) => s.id !== id) })),
    [setData],
  );

  const startMobility = useCallback(
    (routineId: RoutineId) =>
      setData((d) => ({ ...d, activeMobility: { routineId, startedAt: new Date().toISOString(), index: 0, completedIds: [], skippedIds: [] } })),
    [setData],
  );

  const markMobilityMovement = useCallback(
    (movementId: string, outcome: 'done' | 'skipped') =>
      setData((d) => {
        const a = d.activeMobility;
        if (!a) return d;
        const total = MOBILITY_ROUTINES[a.routineId].movements.length;
        const completedIds = a.completedIds.filter((x) => x !== movementId);
        const skippedIds = a.skippedIds.filter((x) => x !== movementId);
        if (outcome === 'done') completedIds.push(movementId);
        else skippedIds.push(movementId);
        return { ...d, activeMobility: { ...a, completedIds, skippedIds, index: Math.min(total, a.index + 1) } };
      }),
    [setData],
  );

  const goToMobilityIndex = useCallback(
    (index: number) =>
      setData((d) => {
        const a = d.activeMobility;
        if (!a) return d;
        const total = MOBILITY_ROUTINES[a.routineId].movements.length;
        return { ...d, activeMobility: { ...a, index: Math.max(0, Math.min(total, index)) } };
      }),
    [setData],
  );

  const cancelMobility = useCallback(() => setData((d) => ({ ...d, activeMobility: null })), [setData]);

  const finishMobility = useCallback(
    (input: { durationSeconds: number; date: LocalDate; notes?: string }): MobilitySession | null => {
      const active = dataRef.current.activeMobility;
      if (!active || loggedMobility.current.has(active.startedAt)) return null;
      loggedMobility.current.add(active.startedAt);
      const session: MobilitySession = {
        id: createId('mobility'),
        date: input.date,
        routineId: active.routineId,
        durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
        completed: true,
        exercisesCompleted: [...active.completedIds],
        notes: input.notes?.trim() || undefined,
        completedAt: new Date().toISOString(),
      };
      setData((d) =>
        d.activeMobility?.startedAt === active.startedAt ? { ...d, activeMobility: null, mobilitySessions: [...d.mobilitySessions, session] } : d,
      );
      return session;
    },
    [setData],
  );

  const logMobilityManually = useCallback(
    (input: { routineId: RoutineId; exercisesCompleted: string[]; durationSeconds: number; date: LocalDate; notes: string }): MobilitySession => {
      const session: MobilitySession = {
        id: createId('mobility'),
        date: input.date,
        routineId: input.routineId,
        durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
        completed: true,
        exercisesCompleted: input.exercisesCompleted,
        completedAt: new Date().toISOString(),
        notes: input.notes.trim() || undefined,
      };
      setData((d) => ({ ...d, mobilitySessions: [...d.mobilitySessions, session] }));
      return session;
    },
    [setData],
  );

  const deleteMobilitySession = useCallback(
    (id: string) => setData((d) => ({ ...d, mobilitySessions: d.mobilitySessions.filter((s) => s.id !== id) })),
    [setData],
  );

  const addCheckin = useCallback(
    (input: Omit<StrengthCheckin, 'id'>): StrengthCheckin => {
      const checkin: StrengthCheckin = { ...input, id: createId('checkin'), notes: input.notes.trim() };
      setData((d) => ({ ...d, checkins: [...d.checkins, checkin] }));
      return checkin;
    },
    [setData],
  );

  const deleteCheckin = useCallback((id: string) => setData((d) => ({ ...d, checkins: d.checkins.filter((c) => c.id !== id) })), [setData]);

  const replaceAllData = useCallback((next: AppData) => setData(next), [setData]);

  const resetAllData = useCallback(() => {
    repository.clear();
    const fresh = createEmptyData();
    fresh.settings.planStartDate = today();
    setData(fresh);
  }, [setData]);

  const dismissLoadIssues = useCallback(() => setLoadIssues([]), []);

  const api = useMemo<AppDataApi>(
    () => ({
      data,
      saveError,
      loadIssues,
      dismissLoadIssues,
      updateSettings,
      startWorkout,
      updateDraftExercise,
      setDraftNotes,
      discardWorkout,
      completeWorkout,
      logMinimumWorkout,
      deleteWorkoutSession,
      startMobility,
      markMobilityMovement,
      goToMobilityIndex,
      cancelMobility,
      finishMobility,
      logMobilityManually,
      deleteMobilitySession,
      addCheckin,
      deleteCheckin,
      replaceAllData,
      resetAllData,
    }),
    [
      data, saveError, loadIssues, dismissLoadIssues, updateSettings, startWorkout, updateDraftExercise, setDraftNotes, discardWorkout,
      completeWorkout, logMinimumWorkout, deleteWorkoutSession, startMobility, markMobilityMovement, goToMobilityIndex, cancelMobility,
      finishMobility, logMobilityManually, deleteMobilitySession, addCheckin, deleteCheckin, replaceAllData, resetAllData,
    ],
  );

  return <AppDataContext.Provider value={api}>{children}</AppDataContext.Provider>;
}

export function useAppData(): AppDataApi {
  const ctx = useContext(AppDataContext);
  if (!ctx) throw new Error('useAppData must be used inside AppDataProvider');
  return ctx;
}
