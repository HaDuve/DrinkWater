import {
  RECENT_GLASS_WINDOW_MS,
  buildRecentGlassStatus,
} from './recent-glass-status';

describe('buildRecentGlassStatus', () => {
  const nowMs = Date.parse('2026-10-21T15:00:00');

  it('returns empty when there are no events and no Intake', () => {
    expect(buildRecentGlassStatus({ events: [], nowMs, intakeMl: 0, glassMl: 250 })).toEqual({
      kind: 'empty',
    });
  });

  it('falls back to Intake-derived count without a clock when events are missing after upgrade', () => {
    expect(
      buildRecentGlassStatus({
        events: [],
        nowMs,
        intakeMl: 750,
        glassMl: 250,
      }),
    ).toEqual({ kind: 'todayCountOnly', glassCount: 3 });
  });

  it('returns justNow when the last glass is within the recent window', () => {
    expect(
      buildRecentGlassStatus({
        events: [{ atMs: nowMs - 60_000, amountMl: 250 }],
        nowMs,
        intakeMl: 250,
        glassMl: 250,
      }),
    ).toEqual({ kind: 'justNow', amountMl: 250 });
  });

  it('returns today summary with glass count and last clock time when older than the window', () => {
    const result = buildRecentGlassStatus({
      events: [
        { atMs: nowMs - 4 * 60_000, amountMl: 250 },
        { atMs: nowMs - RECENT_GLASS_WINDOW_MS - 1, amountMl: 250 },
      ],
      nowMs,
      intakeMl: 500,
      glassMl: 250,
    });
    expect(result).toMatchObject({ kind: 'today', glassCount: 2 });
    if (result.kind === 'today') {
      expect(result.lastClockTime).toMatch(/^\d{2}:\d{2}$/);
    }
  });

  it('prefers Intake-derived count when event log under-counts after a partial upgrade', () => {
    const result = buildRecentGlassStatus({
      events: [{ atMs: nowMs - 10 * 60_000, amountMl: 250 }],
      nowMs,
      intakeMl: 1000,
      glassMl: 250,
    });
    expect(result).toMatchObject({ kind: 'today', glassCount: 4 });
    if (result.kind === 'today') {
      expect(result.lastClockTime).toMatch(/^\d{2}:\d{2}$/);
    }
  });
});
