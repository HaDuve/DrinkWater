import { formatTimeOfDay } from '@/features/water/domain/glass-schedule';

export type GlassEvent = {
  atMs: number;
  amountMl: number;
};

export type RecentGlassStatus =
  | { kind: 'empty' }
  | { kind: 'justNow'; amountMl: number }
  | { kind: 'today'; glassCount: number; lastClockTime: string };

/** Glasses logged within this window show as “just now” on home. */
export const RECENT_GLASS_WINDOW_MS = 3 * 60 * 1000;

type Input = {
  events: GlassEvent[];
  nowMs: number;
  recentWindowMs?: number;
};

function formatClockFromMs(atMs: number): string {
  const date = new Date(atMs);
  return formatTimeOfDay({ hour: date.getHours(), minute: date.getMinutes() });
}

/** Pure home status for today’s glasses: empty, just-now, or count + last time. */
export function buildRecentGlassStatus(input: Input): RecentGlassStatus {
  const { events, nowMs } = input;
  const recentWindowMs = input.recentWindowMs ?? RECENT_GLASS_WINDOW_MS;
  if (events.length === 0) {
    return { kind: 'empty' };
  }

  const last = events[events.length - 1]!;
  if (nowMs - last.atMs <= recentWindowMs) {
    return { kind: 'justNow', amountMl: last.amountMl };
  }

  return {
    kind: 'today',
    glassCount: events.length,
    lastClockTime: formatClockFromMs(last.atMs),
  };
}
