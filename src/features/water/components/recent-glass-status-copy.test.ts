import type { TFunction } from 'i18next';

import { formatRecentGlassStatusBody } from './recent-glass-status-copy';

const mockT = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as TFunction;

describe('formatRecentGlassStatusBody', () => {
  it('formats empty today', () => {
    expect(formatRecentGlassStatusBody({ kind: 'empty' }, mockT)).toBe('home.recentGlassEmpty');
  });

  it('formats just-now with amount', () => {
    expect(formatRecentGlassStatusBody({ kind: 'justNow', amountMl: 250 }, mockT)).toBe(
      'home.recentGlassJustNow:{"ml":250}',
    );
  });

  it('formats today summary with singular glass count', () => {
    expect(
      formatRecentGlassStatusBody(
        { kind: 'today', glassCount: 1, lastClockTime: '14:32' },
        mockT,
      ),
    ).toBe('home.recentGlassTodayOne:{"count":1,"clockTime":"14:32"}');
  });

  it('formats today summary with plural glass count', () => {
    expect(
      formatRecentGlassStatusBody(
        { kind: 'today', glassCount: 3, lastClockTime: '14:32' },
        mockT,
      ),
    ).toBe('home.recentGlassTodayOther:{"count":3,"clockTime":"14:32"}');
  });

  it('formats Intake-only today count without a clock time', () => {
    expect(
      formatRecentGlassStatusBody({ kind: 'todayCountOnly', glassCount: 3 }, mockT),
    ).toBe('home.recentGlassTodayCountOther:{"count":3}');
  });
});
