import {
  countDailyGlasses,
  dateToTimeOfDay,
  formatTimeOfDay,
  type ReminderWindow,
  type TimeOfDay,
} from './glass-schedule';
import {
  buildRemainingPlanSlots,
  buildRemainingWindow,
  countRemainingGlasses,
} from './remaining-plan';

export type TodayRemainingPreviewInput = {
  goalMl: number;
  glassMl: number;
  intakeMl: number;
  window: ReminderWindow;
  now: Date;
};

export type TodayRemainingPreview =
  | { kind: 'hidden' }
  | {
      kind: 'active';
      remainingGlasses: number;
      intervalMinutes: number;
      nextClockTime: string;
    }
  | { kind: 'silent' };

function timeToMinutes(time: TimeOfDay): number {
  return time.hour * 60 + time.minute;
}

/** Minutes between Remaining Plan pings; single-glass days use wait until that ping. */
export function buildRemainingPlanIntervalMinutes(
  slots: TimeOfDay[],
  now: Date,
): number {
  if (slots.length >= 2) {
    return Math.max(1, Math.round(timeToMinutes(slots[1]) - timeToMinutes(slots[0])));
  }
  if (slots.length === 1) {
    return Math.max(1, timeToMinutes(slots[0]) - timeToMinutes(dateToTimeOfDay(now)));
  }
  return 0;
}

/** True when today's Remaining Plan is not the same as the Default Plan. */
export function isTodayDiffers(input: TodayRemainingPreviewInput): boolean {
  const remainingGlasses = countRemainingGlasses(
    input.goalMl,
    input.glassMl,
    input.intakeMl,
  );
  const remainingWindow = buildRemainingWindow(input.window, input.now);

  if (remainingGlasses === 0 || remainingWindow === null) {
    return true;
  }

  const plannedGlasses = countDailyGlasses(input.goalMl, input.glassMl);
  if (remainingGlasses < plannedGlasses) {
    return true;
  }

  return timeToMinutes(remainingWindow.start) > timeToMinutes(input.window.start);
}

export function buildTodayRemainingPreview(
  input: TodayRemainingPreviewInput,
): TodayRemainingPreview {
  if (!isTodayDiffers(input)) {
    return { kind: 'hidden' };
  }

  const remainingGlasses = countRemainingGlasses(
    input.goalMl,
    input.glassMl,
    input.intakeMl,
  );
  const remainingWindow = buildRemainingWindow(input.window, input.now);
  if (remainingGlasses === 0 || remainingWindow === null) {
    return { kind: 'silent' };
  }

  const pinFirstToStart =
    timeToMinutes(remainingWindow.start) === timeToMinutes(input.window.start);
  const slots = buildRemainingPlanSlots(remainingGlasses, remainingWindow, {
    pinFirstToStart,
  });
  if (slots.length === 0) {
    return { kind: 'silent' };
  }

  return {
    kind: 'active',
    remainingGlasses,
    intervalMinutes: buildRemainingPlanIntervalMinutes(slots, input.now),
    nextClockTime: formatTimeOfDay(slots[0]),
  };
}
