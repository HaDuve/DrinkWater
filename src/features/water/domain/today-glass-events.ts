import type { GlassEvent } from '@/features/water/domain/recent-glass-status';

export type TodayGlassEventsPayload = {
  date: string;
  events: GlassEvent[];
};

/** Parse persisted today-glass payload; stale dates yield an empty list. */
export function parseTodayGlassEvents(raw: string | null, today: string): GlassEvent[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return [];
    const record = parsed as { date?: unknown; events?: unknown };
    if (record.date !== today || !Array.isArray(record.events)) return [];
    const events: GlassEvent[] = [];
    for (const item of record.events) {
      if (!item || typeof item !== 'object') continue;
      const atMs = (item as { atMs?: unknown }).atMs;
      const amountMl = (item as { amountMl?: unknown }).amountMl;
      if (typeof atMs !== 'number' || !Number.isFinite(atMs)) continue;
      if (typeof amountMl !== 'number' || !Number.isFinite(amountMl)) continue;
      events.push({
        atMs: Math.round(atMs),
        amountMl: Math.max(0, Math.round(amountMl)),
      });
    }
    return events;
  } catch {
    return [];
  }
}

export function serializeTodayGlassEvents(date: string, events: GlassEvent[]): string {
  const payload: TodayGlassEventsPayload = { date, events };
  return JSON.stringify(payload);
}

export function appendGlassEvent(events: GlassEvent[], amountMl: number, atMs: number): GlassEvent[] {
  return [...events, { atMs, amountMl: Math.max(0, Math.round(amountMl)) }];
}

export function popLastGlassEvent(events: GlassEvent[]): GlassEvent[] {
  if (events.length === 0) return events;
  return events.slice(0, -1);
}
