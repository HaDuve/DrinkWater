import {
  countDailyGlasses,
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
      windowStart: string;
      windowEnd: string;
      nextClockTime: string;
    }
  | { kind: 'silent' };

function timeToMinutes(time: TimeOfDay): number {
  return time.hour * 60 + time.minute;
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
    windowStart: formatTimeOfDay(remainingWindow.start),
    windowEnd: formatTimeOfDay(remainingWindow.end),
    nextClockTime: formatTimeOfDay(slots[0]),
  };
}
