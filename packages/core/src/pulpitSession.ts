export const WARNING_THRESHOLD_MS = 300_000;
export const PACE_TOLERANCE_MS = 60_000;

export type PulpitSection = { title: string; plannedMs: number };
export type TimerState = 'normal' | 'warning' | 'over';
export type Pace = { kind: 'onPace' } | { kind: 'behind' | 'ahead'; ms: number };

/**
 * Plain JSON, with absolute timestamps instead of ticks, so a saved session
 * keeps the right time after a crash or relaunch.
 */
export type PulpitSession = {
  sections: PulpitSection[];
  currentIndex: number;
  accumulatedMs: number;
  runningSince: number | null;
  sectionMarkMs: number;
  entryMs: Record<number, number>;
  spentMs: Record<number, number>;
};

export function startSession(sections: PulpitSection[], now: number): PulpitSession {
  if (sections.length === 0) throw new Error('A session needs at least one section');
  return { sections, currentIndex: 0, accumulatedMs: 0, runningSince: now, sectionMarkMs: 0, entryMs: { 0: 0 }, spentMs: {} };
}

export const isPaused = (s: PulpitSession) => s.runningSince === null;
export const totalPlanned = (s: PulpitSession) => s.sections.reduce((sum, x) => sum + x.plannedMs, 0);

export function elapsed(s: PulpitSession, now: number): number {
  return s.runningSince === null ? s.accumulatedMs : s.accumulatedMs + Math.max(0, now - s.runningSince);
}

/** Negative once the planned time has passed; the app never interrupts. */
export const remaining = (s: PulpitSession, now: number) => totalPlanned(s) - elapsed(s, now);

export function timerState(s: PulpitSession, now: number): TimerState {
  const left = remaining(s, now);
  if (left < 0) return 'over';
  return left <= WARNING_THRESHOLD_MS ? 'warning' : 'normal';
}

/** Compares when the current section began with when it was planned to begin. */
export function pace(s: PulpitSession): Pace {
  const planned = s.sections.slice(0, s.currentIndex).reduce((sum, x) => sum + x.plannedMs, 0);
  const delta = (s.entryMs[s.currentIndex] ?? 0) - planned;
  if (Math.abs(delta) < PACE_TOLERANCE_MS) return { kind: 'onPace' };
  return delta > 0 ? { kind: 'behind', ms: delta } : { kind: 'ahead', ms: -delta };
}

export function spentInSection(s: PulpitSession, index: number, now: number): number {
  const stored = s.spentMs[index] ?? 0;
  return index === s.currentIndex ? stored + Math.max(0, elapsed(s, now) - s.sectionMarkMs) : stored;
}

export function pause(s: PulpitSession, now: number): PulpitSession {
  return isPaused(s) ? s : { ...s, accumulatedMs: elapsed(s, now), runningSince: null };
}

export function resume(s: PulpitSession, now: number): PulpitSession {
  return isPaused(s) ? { ...s, runningSince: now } : s;
}

export function goTo(s: PulpitSession, index: number, now: number): PulpitSession {
  if (index < 0 || index >= s.sections.length || index === s.currentIndex) return s;
  const time = elapsed(s, now);
  return {
    ...s,
    currentIndex: index,
    sectionMarkMs: time,
    spentMs: { ...s.spentMs, [s.currentIndex]: (s.spentMs[s.currentIndex] ?? 0) + time - s.sectionMarkMs },
    entryMs: index in s.entryMs ? s.entryMs : { ...s.entryMs, [index]: time },
  };
}
