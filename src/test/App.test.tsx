import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';
import { STORAGE_KEY } from '../utils/storage';
import type { AppData } from '../types';

function stored(): AppData {
  return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null') as AppData;
}

async function goTo(user: ReturnType<typeof userEvent.setup>, label: RegExp) {
  await user.click(screen.getByRole('link', { name: label }));
}

describe('Calisthenics Companion app', () => {
  it('opens every screen from the navigation', async () => {
    const user = userEvent.setup();
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Show up. Get stronger.' })).toBeInTheDocument();

    for (const [label, heading] of [
      [/^Workouts/, 'Workouts'],
      [/^Timer/, 'Timer'],
      [/^Mobility/, 'Mobility'],
      [/^Progress/, 'Progress'],
      [/^Settings/, 'Settings'],
      [/^Overview/, 'Show up. Get stronger.'],
    ] as const) {
      await goTo(user, label);
      expect(screen.getByRole('heading', { level: 1, name: heading })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('aria-current', 'page');
    }
  });

  it('shows the right exercises for Workout A and B', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /^Workouts/);
    expect(screen.getByRole('heading', { name: /Push-ups/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Dead bugs/ })).toBeInTheDocument();
    await user.click(screen.getByRole('tab', { name: /Workout B/ }));
    expect(screen.getByRole('heading', { name: /Reverse lunges/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Forearm plank/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Dead bugs/ })).not.toBeInTheDocument();
  });

  it('persists exercise progress across a refresh and logs the workout exactly once', async () => {
    const user = userEvent.setup();
    const first = render(<App />);
    await goTo(user, /^Workouts/);
    await user.click(screen.getByRole('button', { name: /Start Workout A/ }));
    await user.click(screen.getByRole('checkbox', { name: 'Mark Push-ups complete' }));
    await user.type(screen.getByRole('spinbutton', { name: /Push-ups set 1/ }), '7');

    // Simulated refresh: unmount and mount a fresh app reading from storage.
    first.unmount();
    render(<App />);
    expect(screen.getByRole('checkbox', { name: 'Mark Push-ups complete' })).toBeChecked();
    expect(screen.getByRole('spinbutton', { name: /Push-ups set 1/ })).toHaveValue(7);

    await user.click(screen.getByRole('button', { name: /Complete workout/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/1 of 5/)).toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Save workout' }));

    expect(await screen.findByText('Workout saved. Great job showing up!')).toBeInTheDocument();
    const data = stored();
    expect(data.workoutSessions).toHaveLength(1);
    expect(data.workoutSessions[0]).toMatchObject({ workoutType: 'A', completed: true });
    expect(data.workoutSessions[0].exerciseResults[0]).toMatchObject({ exerciseId: 'pushups', repsPerSet: [7], completed: true });
    expect(data.activeWorkout).toBeNull();
    expect(screen.getByRole('button', { name: /Start Workout A/ })).toBeInTheDocument();
  });

  it('warns about a possible duplicate on the same day', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /^Workouts/);
    for (let i = 0; i < 2; i++) {
      await user.click(screen.getByRole('button', { name: /Start Workout A/ }));
      await user.click(screen.getByRole('button', { name: /Complete workout/ }));
      if (i === 1) expect(within(screen.getByRole('dialog')).getByText(/already logged Workout A/)).toBeInTheDocument();
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save workout' }));
    }
    expect(stored().workoutSessions).toHaveLength(2);
  });

  it('logs minimum workouts separately from full strength sessions', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Start minimum workout/ }));
    const log = screen.getByRole('button', { name: /Log minimum session/ });
    expect(log).toBeDisabled();
    await user.click(screen.getByRole('checkbox', { name: /wall push-ups/i }));
    await user.click(log);
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save minimum session' }));

    const data = stored();
    expect(data.workoutSessions).toHaveLength(1);
    expect(data.workoutSessions[0].workoutType).toBe('minimum');

    await goTo(user, /^Overview/);
    const strengthCard = screen.getByRole('heading', { name: 'Strength sessions' }).closest('section')!;
    expect(within(strengthCard).getByText('0')).toBeInTheDocument();
    expect(within(strengthCard).getByText(/Plus 1 minimum session/)).toBeInTheDocument();
  });

  it('tracks a mobility session separately from strength', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /^Mobility/);
    expect(screen.getByText('No mobility sessions yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Already did it\? Log it/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save mobility session' }));
    expect(await screen.findByText('Mobility practice logged. Nice work.')).toBeInTheDocument();
    const data = stored();
    expect(data.mobilitySessions).toHaveLength(1);
    expect(data.mobilitySessions[0].routineId).toBe('warmup');
    expect(data.workoutSessions).toHaveLength(0);
  });

  it('runs the guided mobility routine with next and skip', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /^Mobility/);
    await user.click(screen.getByRole('button', { name: /Start guided routine/ }));
    expect(screen.getByRole('heading', { name: 'March in place' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Done · next/ }));
    expect(screen.getByRole('heading', { name: 'Arm circles' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Skip/ }));
    expect(screen.getByRole('heading', { name: 'Wrist circles' })).toBeInTheDocument();
    expect(stored().activeMobility).toMatchObject({ index: 2, completedIds: ['march'], skippedIds: ['arm_circles'] });
  });

  it('keeps the timer running when switching screens', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /^Timer/);
    await user.click(screen.getByRole('button', { name: /45 s/ }));
    await user.click(screen.getByRole('button', { name: /^Start$/ }));
    expect(screen.getByText('Running')).toBeInTheDocument();
    await goTo(user, /^Progress/);
    expect(screen.getByRole('region', { name: 'Active timer' })).toBeInTheDocument();
    await goTo(user, /^Timer/);
    expect(screen.getByText('Running')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Pause/ }));
    expect(screen.getByText('Paused')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Resume/ }));
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  it('validates the check-in form', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /^Progress/);
    expect(screen.getByText('No check-ins yet')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(screen.getByText('Enter a whole number from 0 to 500.')).toBeInTheDocument();
    expect(stored()?.checkins ?? []).toHaveLength(0);

    await user.type(screen.getByLabelText('Push-up reps'), '9');
    await user.type(screen.getByLabelText(/Body weight/), '5');
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(screen.getByText(/Enter a weight between 20 and 400 kg/)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/Body weight/));
    await user.click(screen.getByRole('button', { name: 'Save check-in' }));
    expect(stored().checkins).toHaveLength(1);
    expect(stored().checkins[0]).toMatchObject({ pushupCount: 9, bodyWeightKg: null });
  });

  it('rejects an invalid import without touching current data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await goTo(user, /^Workouts/);
    await user.click(screen.getByRole('button', { name: /Start Workout A/ }));
    await user.click(screen.getByRole('button', { name: /Complete workout/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save workout' }));
    const before = localStorage.getItem(STORAGE_KEY);

    await goTo(user, /^Settings/);
    const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
    await user.upload(input, new File(['{"app":"calisthenics-companion","version":1,"workoutSessions":"nope"}'], 'bad.json', { type: 'application/json' }));
    expect(await screen.findByText(/couldn't be imported/)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe(before);
  });

  it('asks for confirmation before resetting all data', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: /Start minimum workout/ }));
    await user.click(screen.getByRole('checkbox', { name: /squats/i }));
    await user.click(screen.getByRole('button', { name: /Log minimum session/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Save minimum session' }));
    expect(stored().workoutSessions).toHaveLength(1);

    await goTo(user, /^Settings/);
    await user.click(screen.getByRole('button', { name: /Reset all data/ }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }));
    expect(stored().workoutSessions).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /Reset all data/ }));
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Reset everything' }));
    expect(stored().workoutSessions).toHaveLength(0);
  });
});
