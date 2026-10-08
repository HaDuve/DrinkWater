import { buildPeriodSummary } from './period-summary';

describe('buildPeriodSummary', () => {
  it('returns zeros for empty history', () => {
    expect(buildPeriodSummary([], 2000)).toEqual({
      totalDays: 0,
      hitDays: 0,
      totalMl: 0,
      averageMl: 0,
      hitRate: 0,
      meaningfulDays: 0,
    });
  });

  it('counts hits, totals, average, hit rate, and meaningful days', () => {
    expect(
      buildPeriodSummary(
        [
          { date: '2026-10-08', intakeMl: 2000 },
          { date: '2026-10-07', intakeMl: 1500 },
          { date: '2026-10-06', intakeMl: 0 },
          { date: '2026-10-05', intakeMl: 2100 },
        ],
        2000,
      ),
    ).toEqual({
      totalDays: 4,
      hitDays: 2,
      totalMl: 5600,
      averageMl: 1400,
      hitRate: 50,
      meaningfulDays: 3,
    });
  });

  it('treats zero goal as no hits and zero hit rate', () => {
    expect(buildPeriodSummary([{ date: '2026-10-08', intakeMl: 500 }], 0)).toEqual({
      totalDays: 1,
      hitDays: 0,
      totalMl: 500,
      averageMl: 500,
      hitRate: 0,
      meaningfulDays: 1,
    });
  });
});
