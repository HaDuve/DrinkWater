import { formatTimeOfDay } from '@/features/water/domain/glass-schedule';

export type GlassEvent = {
  atMs: number;
  amountMl: number;
};

export type RecentGlassStatus =
  | { kind: 'empty' }
  | { kind: 'justNow'; amountMl: number }
  | { kind: 'today'; glassCount: number; lastClockTime: string }
  /** Intake present but no (or incomplete) event timestamps — e.g. post-upgrade. */
  | { kind: 'todayCountOnly'; glassCount: number };

/** Glasses logged within this window show as “just now” on home. */
export const RECENT_GLASS_WINDOW_MS = 3 * 60 * 1000;

type Input = {
  events: GlassEvent[];
  nowMs: number;
  recentWindowMs?: number;
  intakeMl?: number;
  glassMl?: number;
};

function formatClockFromMs(atMs: number): string {
  const date = new Date(atMs);
  return formatTimeOfDay({ hour: date.getHours(), minute: date.getMinutes() });
}

/** Estimated Glass count from Intake when the event log is missing or short. */
export function estimateGlassCountFromIntake(intakeMl: number, glassMl: number): number {
  if (intakeMl <= 0 || glassMl <= 0) return 0;
  return Math.max(1, Math.round(intakeMl / glassMl));
}

/** Pure home status for today’s glasses: empty, just-now, or count + last time. */
export function buildRecentGlassStatus(input: Input): RecentGlassStatus {
  const { events, nowMs } = input;
  const recentWindowMs = input.recentWindowMs ?? RECENT_GLASS_WINDOW_MS;
  const estimated = estimateGlassCountFromIntake(input.intakeMl ?? 0, input.glassMl ?? 0);

  if (events.length === 0) {
    if (estimated > 0) {
      return { kind: 'todayCountOnly', glassCount: estimated };
    }
    return { kind: 'empty' };
  }

  const last = events[events.length - 1]!;
  if (nowMs - last.atMs <= recentWindowMs) {
    return { kind: 'justNow', amountMl: last.amountMl };
  }

  return {
    kind: 'today',
    glassCount: Math.max(events.length, estimated),
    lastClockTime: formatClockFromMs(last.atMs),
  };
}
