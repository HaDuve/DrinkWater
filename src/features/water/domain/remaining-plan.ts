import {
  buildGlassSchedule,
  countDailyGlasses,
  dateToTimeOfDay,
  timeOfDayToDate,
  type ReminderWindow,
  type TimeOfDay,
} from './glass-schedule';

const MIN_SLOT_GAP_MINUTES = 5;

/** Glasses still needed for today's Daily Goal; zero once Intake meets or passes it. */
export function countRemainingGlasses(
  goalMl: number,
  glassMl: number,
  intakeMl: number,
): number {
  const remainingMl = Math.max(0, goalMl - intakeMl);
  if (remainingMl === 0) return 0;
  return countDailyGlasses(remainingMl, glassMl);
}

/** Later of Reminder Window start and the next future minute, through window end. */
export function buildRemainingWindow(
  window: ReminderWindow,
  now: Date,
): ReminderWindow | null {
  const nextMinute = new Date(now);
  nextMinute.setSeconds(0, 0);
  nextMinute.setMinutes(nextMinute.getMinutes() + 1);

  const windowStart = timeOfDayToDate(window.start, now);
  const windowEnd = timeOfDayToDate(window.end, now);
  const remainingStartMs = Math.max(windowStart.getTime(), nextMinute.getTime());
  if (remainingStartMs >= windowEnd.getTime()) return null;

  return {
    start: dateToTimeOfDay(new Date(remainingStartMs)),
    end: window.end,
  };
}

function timeToMinutes(time: TimeOfDay): number {
  return time.hour * 60 + time.minute;
}

function minutesToTime(minutes: number): TimeOfDay {
  const rounded = Math.round(minutes);
  const hour = Math.floor(rounded / 60);
  const minute = rounded % 60;
  return { hour, minute };
}

function maxFittingGlassCount(spanMinutes: number, wanted: number): number {
  if (wanted <= 0) return 0;
  if (wanted === 1) return 1;
  const maxByGap = Math.floor(spanMinutes / MIN_SLOT_GAP_MINUTES) + 1;
  return Math.min(wanted, Math.max(1, maxByGap));
}

function buildEvenSlots(window: ReminderWindow, glassCount: number): TimeOfDay[] {
  const startMinutes = timeToMinutes(window.start);
  const endMinutes = timeToMinutes(window.end);

  if (glassCount === 1) {
    return [window.end];
  }

  const span = endMinutes - startMinutes;
  return Array.from({ length: glassCount }, (_, index) => {
    const minutes = startMinutes + (span * index) / (glassCount - 1);
    return minutesToTime(minutes);
  });
}

/** Even Glass Slots for Remaining Glasses; shrinks to fit ≥5-minute gaps. */
export function buildRemainingPlanSlots(
  remainingGlasses: number,
  remainingWindow: ReminderWindow,
): TimeOfDay[] {
  if (remainingGlasses <= 0) return [];

  const spanMinutes = timeToMinutes(remainingWindow.end) - timeToMinutes(remainingWindow.start);
  const glassCount = maxFittingGlassCount(spanMinutes, remainingGlasses);
  return buildEvenSlots(remainingWindow, glassCount);
}

function slotDateOnDay(slot: TimeOfDay, day: Date): Date {
  const trigger = new Date(day);
  trigger.setHours(slot.hour, slot.minute, 0, 0);
  return trigger;
}

export type ReminderPlanFireDatesInput = {
  goalMl: number;
  glassMl: number;
  intakeMl: number;
  window: ReminderWindow;
  now: Date;
};

/**
 * Today Remaining Plan fire times (if any) plus tomorrow's Default Plan.
 * Empty today when goal is met or Reminder Window has ended.
 */
export function buildReminderPlanFireDates(input: ReminderPlanFireDatesInput): Date[] {
  const fires: Date[] = [];

  const remainingGlasses = countRemainingGlasses(input.goalMl, input.glassMl, input.intakeMl);
  const remainingWindow = buildRemainingWindow(input.window, input.now);
  if (remainingGlasses > 0 && remainingWindow) {
    for (const slot of buildRemainingPlanSlots(remainingGlasses, remainingWindow)) {
      fires.push(slotDateOnDay(slot, input.now));
    }
  }

  const defaultPlan = buildGlassSchedule({
    goalMl: input.goalMl,
    glassMl: input.glassMl,
    window: input.window,
  });
  if (defaultPlan.ok) {
    const tomorrow = new Date(input.now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    for (const slot of defaultPlan.schedule.slots) {
      fires.push(slotDateOnDay(slot, tomorrow));
    }
  }

  return fires;
}
