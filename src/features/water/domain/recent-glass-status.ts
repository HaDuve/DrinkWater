import { formatTimeOfDay } from '@/features/water/domain/glass-schedule';

export type GlassEvent = {
  atMs: number;
  amountMl: number;
};

export type RecentGlassStatus =
  | { kind: 'empty' }
  | { kind: 'justNow'; amountMl: number; count?: number }
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
    const burst = pickRecentGlassBurst(events, recentWindowMs);
    const lastAmountMl = burst[burst.length - 1]!.amountMl;
    const allSame = burst.every((event) => event.amountMl === lastAmountMl);
    if (allSame && burst.length > 1) {
      return { kind: 'justNow', amountMl: lastAmountMl, count: burst.length };
    }
    if (!allSame) {
      const totalMl = burst.reduce((sum, event) => sum + event.amountMl, 0);
      return { kind: 'justNow', amountMl: totalMl };
    }
    return { kind: 'justNow', amountMl: lastAmountMl };
  }

  return {
    kind: 'today',
    glassCount: Math.max(events.length, estimated),
    lastClockTime: formatClockFromMs(last.atMs),
  };
}

/** Rolling burst: each Glass joins while within the window of the previous grouped Glass. */
function pickRecentGlassBurst(events: GlassEvent[], recentWindowMs: number): GlassEvent[] {
  const burst: GlassEvent[] = [events[events.length - 1]!];
  for (let i = events.length - 2; i >= 0; i -= 1) {
    const candidate = events[i]!;
    const previous = burst[0]!;
    if (previous.atMs - candidate.atMs > recentWindowMs) break;
    burst.unshift(candidate);
  }
  return burst;
}
