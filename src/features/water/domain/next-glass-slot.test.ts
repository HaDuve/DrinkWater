import { buildGlassSchedule } from './glass-schedule';
import { pickNextGlassSlot } from './next-glass-slot';

const defaultScheduleInput = {
  goalMl: 2000,
  glassMl: 250,
  window: {
    start: { hour: 8, minute: 30 },
    end: { hour: 17, minute: 0 },
  },
};

function slotsFromDefaultSchedule() {
  const result = buildGlassSchedule(defaultScheduleInput);
  if (!result.ok) throw new Error('expected valid schedule');
  return result.schedule.slots;
}

describe('pickNextGlassSlot', () => {
  it('points at the first slot before today\'s window starts', () => {
    const now = new Date(2026, 8, 2, 7, 0, 0);
    const firstTrigger = new Date(2026, 8, 2, 8, 30, 0).getTime();

    expect(pickNextGlassSlot(slotsFromDefaultSchedule(), now)).toEqual({
      kind: 'today',
      slot: { hour: 8, minute: 30 },
      triggerMs: firstTrigger,
    });
  });

  it('points at the next slot later today after earlier slots passed', () => {
    const now = new Date(2026, 8, 2, 10, 0, 0);
    const nextTrigger = new Date(2026, 8, 2, 10, 56, 0).getTime();

    expect(pickNextGlassSlot(slotsFromDefaultSchedule(), now)).toEqual({
      kind: 'today',
      slot: { hour: 10, minute: 56 },
      triggerMs: nextTrigger,
    });
  });

  it('reflects that today is done after the last slot', () => {
    const now = new Date(2026, 8, 2, 18, 0, 0);
    const tomorrowFirst = new Date(2026, 8, 3, 8, 30, 0).getTime();

    expect(pickNextGlassSlot(slotsFromDefaultSchedule(), now)).toEqual({
      kind: 'tomorrow',
      slot: { hour: 8, minute: 30 },
      triggerMs: tomorrowFirst,
    });
  });
});
