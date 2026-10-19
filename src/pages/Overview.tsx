import { ArrowRight, CalendarDays, Check, Dumbbell, Flame, Footprints, HeartHandshake, Target } from 'lucide-react';
import type { PageId, StrengthWorkoutId } from '../types';
import { useAppData } from '../state/AppDataContext';
import { usePlan } from '../hooks/usePlan';
import { ProgressCard } from '../components/ProgressCard';
import { WeekProgress } from '../components/WeekProgress';
import { WEEKLY_STRENGTH_TARGET, dayPlan, scheduledWorkoutFor } from '../data/plan';
import { WORKOUTS } from '../data/workouts';
import { activeStreak, activityDates, isMinimumSession, isStrengthSession, nextInRotation, summarizeWeek } from '../utils/stats';
import { calendarWeekDates, dayOfWeek, formatDate, formatLongDate, planWeekOf } from '../utils/date';

interface OverviewProps {
  navigate: (page: PageId, sub?: string | null) => void;
}

export function Overview({ navigate }: OverviewProps) {
  const { data, startWorkout } = useAppData();
  const { todayDate, currentWeek, phase, beforeStart, afterEnd } = usePlan();

  const strengthTotal = data.workoutSessions.filter(isStrengthSession).length;
  const minimumTotal = data.workoutSessions.filter(isMinimumSession).length;
  const thisWeek = summarizeWeek(data, currentWeek);
  const dates = activityDates(data);
  const streak = activeStreak(dates, todayDate);

  const todayDow = dayOfWeek(todayDate);
  const todayPlan = dayPlan(todayDow, currentWeek);
  const scheduled = scheduledWorkoutFor(todayDow, currentWeek);
  const suggested: StrengthWorkoutId = scheduled ?? nextInRotation(data.workoutSessions);
  const active = data.activeWorkout;
  const doneToday = data.workoutSessions.some((s) => isStrengthSession(s) && s.date === todayDate);

  const startToday = () => {
    if (!active) startWorkout(suggested);
    navigate('workouts', active ? active.workoutType : suggested);
  };

  const weekDates = calendarWeekDates(todayDate);

  return (
    <div className="page overview">
      <section className="hero card card--hero" aria-labelledby="hero-title">
        <p className="eyebrow">
          {beforeStart ? (
            <>Plan starts {formatLongDate(data.settings.planStartDate)}</>
          ) : (
            <>
              Week <span className="num">{currentWeek}</span> of 12 · {phase.name}
            </>
          )}
        </p>
        <h1 id="hero-title" className="hero__title">Show up. Get stronger.</h1>
        <p className="hero__lead">You don't need to crush every workout. You just need to keep coming back.</p>
        <p className="hero__phase">{phase.message}</p>
        {afterEnd && (
          <p className="notice notice--info">
            You've reached the end of the 12-week plan. Keep training in the final phase, or set a new start date in Settings to begin another cycle.
          </p>
        )}

        <div className="hero__today">
          <div>
            <p className="hero__today-label">Today · {todayPlan.name}</p>
            <p className="hero__today-plan">{todayPlan.label}</p>
            {!scheduled && !active && (
              <p className="muted small">A lighter day. If you'd like to train anyway, Workout {suggested} is next in your rotation.</p>
            )}
            {doneToday && !active && (
              <p className="small hero__done">
                <Check size={16} aria-hidden /> You've already logged a strength session today. Nice work.
              </p>
            )}
          </div>
          <div className="hero__actions">
            <button type="button" className="button button--primary button--lg" onClick={startToday}>
              <Dumbbell size={20} aria-hidden />
              {active
                ? `Continue Workout ${active.workoutType}`
                : doneToday
                  ? `Start another session (${suggested})`
                  : scheduled
                    ? `Start today's workout (${scheduled})`
                    : `Start Workout ${suggested}`}
              <ArrowRight size={18} aria-hidden />
            </button>
            {!scheduled && (
              <button type="button" className="button button--secondary" onClick={() => navigate('mobility', 'recovery')}>
                <Footprints size={18} aria-hidden /> Gentle mobility instead
              </button>
            )}
          </div>
        </div>
        <p className="hero__reminder">
          This week: <span className="num">{Math.min(thisWeek.strength.length, 99)}</span> of {WEEKLY_STRENGTH_TARGET} strength sessions. Any session you
          show up for counts.
        </p>
      </section>

      <div className="stats-grid">
        <ProgressCard
          label="Strength sessions"
          value={strengthTotal}
          icon={<Dumbbell size={18} />}
          hint={minimumTotal > 0 ? `Plus ${minimumTotal} minimum session${minimumTotal === 1 ? '' : 's'}, tracked separately.` : 'Completed Workout A and B sessions.'}
        />
        <ProgressCard
          label="Weekly target"
          value={thisWeek.strength.length}
          suffix={`/ ${WEEKLY_STRENGTH_TARGET}`}
          icon={<Target size={18} />}
          progress={thisWeek.strength.length / WEEKLY_STRENGTH_TARGET}
          progressLabel={`Plan week ${currentWeek} strength sessions`}
          hint={beforeStart ? 'Your plan week 1 hasn\'t started yet.' : `Plan week ${currentWeek}. Minimum sessions aren't counted here.`}
        />
        <ProgressCard
          label="Active streak"
          value={streak.days}
          suffix={streak.days === 1 ? 'day' : 'days'}
          icon={<Flame size={18} />}
          hint={
            <>
              Days in a row with any logged activity (strength, minimum, or mobility).
              {streak.days > 0 && !streak.includesToday ? ' Counted through yesterday.' : ''} It's information, not pressure.
            </>
          }
        />
      </div>

      <div className="two-col">
        <WeekProgress data={data} currentWeek={currentWeek} />

        <div className="stack">
          <section className="card" aria-labelledby="calendar-title">
            <div className="card__header">
              <h2 id="calendar-title" className="card__title">
                <CalendarDays size={18} aria-hidden /> This week's rhythm
              </h2>
            </div>
            <ul className="calendar">
              {weekDates.map((date) => {
                const dow = dayOfWeek(date);
                const plan = dayPlan(dow, Math.max(1, planWeekOf(date, data.settings.planStartDate)));
                const logged = dates.has(date);
                const isToday = date === todayDate;
                return (
                  <li key={date} className={`calendar__day calendar__day--${plan.kind}${isToday ? ' is-today' : ''}`} aria-current={isToday ? 'date' : undefined}>
                    <span className="calendar__dow">
                      {plan.short}
                      <span className="calendar__date num">{formatDate(date, { day: 'numeric' })}</span>
                    </span>
                    <span className="calendar__label">{plan.label}</span>
                    <span className={`calendar__status${logged ? ' is-logged' : ''}`}>
                      {logged ? (
                        <>
                          <Check size={14} strokeWidth={3} aria-hidden /> Logged
                        </>
                      ) : isToday ? (
                        'Today'
                      ) : (
                        ''
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card card--accent" aria-labelledby="minimum-title">
            <h2 id="minimum-title" className="card__title">
              <HeartHandshake size={18} aria-hidden /> The minimum counts.
            </h2>
            <p>On hard days, do 5 wall push-ups and 8 squats. Keeping the habit alive is the win.</p>
            <button type="button" className="button button--dark" onClick={() => navigate('workouts', 'minimum')}>
              Start minimum workout <ArrowRight size={18} aria-hidden />
            </button>
          </section>

          <section className="card" aria-labelledby="workouts-title">
            <h2 id="workouts-title" className="card__title">Your two workouts</h2>
            <ul className="link-list">
              {(['A', 'B'] as const).map((id) => (
                <li key={id}>
                  <button type="button" className="link-row" onClick={() => navigate('workouts', id)}>
                    <span className="link-row__badge">{id}</span>
                    <span>
                      <strong>{WORKOUTS[id].name}</strong>
                      <span className="muted small"> · {WORKOUTS[id].exercises.length} exercises · about 20 min</span>
                    </span>
                    <ArrowRight size={16} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
