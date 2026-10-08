import { buildWeekTeaserSummary } from './week-teaser';

describe('buildWeekTeaserSummary', () => {
  it('returns zeros for empty history', () => {
    expect(buildWeekTeaserSummary([], 2000)).toEqual({
      hitDays: 0,
      totalDays: 0,
      averageMl: 0,
      meaningfulDays: 0,
    });
  });

  it('counts hits, average, and meaningful days', () => {
    expect(
      buildWeekTeaserSummary(
        [
          { date: '2026-10-08', intakeMl: 2000 },
          { date: '2026-10-07', intakeMl: 1500 },
          { date: '2026-10-06', intakeMl: 0 },
          { date: '2026-10-05', intakeMl: 2100 },
        ],
        2000,
      ),
    ).toEqual({
      hitDays: 2,
      totalDays: 4,
      averageMl: 1400,
      meaningfulDays: 3,
    });
  });

  it('treats zero goal as no hits', () => {
    expect(
      buildWeekTeaserSummary([{ date: '2026-10-08', intakeMl: 500 }], 0),
    ).toEqual({
      hitDays: 0,
      totalDays: 1,
      averageMl: 500,
      meaningfulDays: 1,
    });
  });
});
