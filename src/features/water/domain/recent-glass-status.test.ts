import {
  RECENT_GLASS_WINDOW_MS,
  buildRecentGlassStatus,
} from './recent-glass-status';

describe('buildRecentGlassStatus', () => {
  const nowMs = Date.parse('2026-10-21T15:00:00');

  it('returns empty when there are no events today', () => {
    expect(buildRecentGlassStatus({ events: [], nowMs })).toEqual({ kind: 'empty' });
  });

  it('returns justNow when the last glass is within the recent window', () => {
    expect(
      buildRecentGlassStatus({
        events: [{ atMs: nowMs - 60_000, amountMl: 250 }],
        nowMs,
      }),
    ).toEqual({ kind: 'justNow', amountMl: 250 });
  });

  it('returns today summary with glass count and last clock time when older than the window', () => {
    expect(
      buildRecentGlassStatus({
        events: [
          { atMs: nowMs - 4 * 60_000, amountMl: 250 },
          { atMs: nowMs - RECENT_GLASS_WINDOW_MS - 1, amountMl: 250 },
        ],
        nowMs,
      }),
    ).toEqual({
      kind: 'today',
      glassCount: 2,
      lastClockTime: '14:56',
    });
  });
});
