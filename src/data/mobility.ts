import type { MobilityRoutine, RoutineId } from '../types';

export const MOBILITY_ROUTINES: Record<RoutineId, MobilityRoutine> = {
  warmup: {
    id: 'warmup',
    name: 'Pre-workout warm-up',
    durationMinutes: 5,
    description: 'Gently raise your temperature and move each joint before strength work.',
    movements: [
      { id: 'march', name: 'March in place', durationSeconds: 60, instructions: 'March at an easy pace and gradually raise body temperature.' },
      { id: 'arm_circles', name: 'Arm circles', durationSeconds: 30, instructions: 'Start with small circles and gradually increase their size.' },
      { id: 'wrist_circles', name: 'Wrist circles', durationSeconds: 30, instructions: 'Move both wrists gently in both directions.' },
      { id: 'ankle_rocks', name: 'Ankle rocks', durationSeconds: 60, instructions: 'Spend about 30 seconds on each side, keeping the heel down.' },
      { id: 'hip_hinges', name: 'Hip hinges', durationSeconds: 60, instructions: 'Move the hips backward while keeping the spine controlled.' },
      { id: 'cat_cow_w', name: 'Cat-cow', durationSeconds: 60, instructions: 'Slowly round and extend the spine through a comfortable range.' },
    ],
  },
  recovery: {
    id: 'recovery',
    name: 'Recovery and mobility',
    durationMinutes: 6,
    description: 'Easy movement for rest days or after a session. Comfortable ranges only.',
    movements: [
      { id: 'cat_cow_r', name: 'Cat-cow', durationSeconds: 60, instructions: 'Move gently with your breathing.' },
      { id: 'thoracic_rotations', name: 'Thoracic rotations', durationSeconds: 90, instructions: 'Rotate the upper back comfortably, switching sides halfway through.' },
      { id: 'hip_flexor', name: 'Hip flexor stretch', durationSeconds: 90, instructions: 'Use a mild stretch on each side without arching the lower back.' },
      { id: 'calf_stretch', name: 'Calf stretch', durationSeconds: 60, instructions: 'Spend 30 seconds per side with the heel down.' },
      { id: 'chest_doorway', name: 'Chest doorway stretch', durationSeconds: 60, instructions: 'Use a gentle stretch without forcing the shoulder.' },
      { id: 'slow_breathing', name: 'Slow breathing', durationSeconds: 60, instructions: 'Relax the shoulders and breathe comfortably.' },
    ],
  },
};

export const MOBILITY_SAFETY = [
  'Keep every movement comfortable and controlled.',
  'Avoid forced stretching and bouncing.',
  'Stop if you feel sharp pain, numbness, or tingling.',
  'Mobility supports how you move and feel; it is not a guaranteed way to prevent injury.',
];

export function movementName(id: string): string {
  for (const routine of Object.values(MOBILITY_ROUTINES)) {
    const found = routine.movements.find((m) => m.id === id);
    if (found) return found.name;
  }
  return id;
}
