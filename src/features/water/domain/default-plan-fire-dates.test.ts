import { buildDefaultPlanFireDates } from './default-plan-fire-dates';

describe('buildDefaultPlanFireDates', () => {
  it('queues future today slots plus tomorrow slots at the same clock times', () => {
    const now = new Date(2026, 8, 2, 12, 0, 0);
    const slots = [
      { hour: 8, minute: 30 },
      { hour: 17, minute: 0 },
    ];

    expect(buildDefaultPlanFireDates(slots, now)).toEqual([
      new Date(2026, 8, 2, 17, 0, 0, 0),
      new Date(2026, 8, 3, 8, 30, 0, 0),
      new Date(2026, 8, 3, 17, 0, 0, 0),
    ]);
  });
});
