export type TimeOfDay = {
  hour: number;
  minute: number;
};

export type ReminderWindow = {
  start: TimeOfDay;
  end: TimeOfDay;
};

export type GlassScheduleInput = {
  goalMl: number;
  glassMl: number;
  window: ReminderWindow;
};

export type GlassScheduleError =
  | 'invalid_glass_size'
  | 'end_before_or_equal_start'
  | 'overnight_window'
  | 'slots_too_close';

export type GlassSchedule = {
  glassCount: number;
  slots: TimeOfDay[];
};

export type GlassScheduleResult =
  | { ok: true; schedule: GlassSchedule }
  | { ok: false; error: GlassScheduleError };

const MIN_SLOT_GAP_MINUTES = 5;

export function countDailyGlasses(goalMl: number, glassMl: number): number {
  return Math.ceil(goalMl / glassMl);
}

export function formatTimeOfDay(time: TimeOfDay): string {
  const hour = String(time.hour).padStart(2, '0');
  const minute = String(time.minute).padStart(2, '0');
  return `${hour}:${minute}`;
}

export function parseTimeOfDayInput(raw: string): TimeOfDay | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(raw.trim());
  if (!match) return null;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

export type TimeOfDayTextChange =
  | { notifyParent: TimeOfDay; displayText: string }
  | { displayText: string };

export function resolveTimeOfDayTextChange(text: string): TimeOfDayTextChange {
  const parsed = parseTimeOfDayInput(text);
  if (parsed) {
    return { notifyParent: parsed, displayText: formatTimeOfDay(parsed) };
  }
  return { displayText: text };
}

export function resolveTimeOfDayTextOnBlur(
  text: string,
  fallback: TimeOfDay,
): { notifyParent: TimeOfDay | null; displayText: string } {
  const parsed = parseTimeOfDayInput(text);
  if (parsed) {
    return { notifyParent: parsed, displayText: formatTimeOfDay(parsed) };
  }
  return { notifyParent: null, displayText: formatTimeOfDay(fallback) };
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

function buildEvenSlots(window: ReminderWindow, glassCount: number): TimeOfDay[] {
  const startMinutes = timeToMinutes(window.start);
  const endMinutes = timeToMinutes(window.end);

  if (glassCount === 1) {
    return [minutesToTime((startMinutes + endMinutes) / 2)];
  }

  const span = endMinutes - startMinutes;
  return Array.from({ length: glassCount }, (_, index) => {
    const minutes = startMinutes + (span * index) / (glassCount - 1);
    return minutesToTime(minutes);
  });
}

function hasSlotsTooClose(slots: TimeOfDay[]): boolean {
  if (slots.length < 2) return false;

  const minuteValues = slots.map(timeToMinutes);
  for (let index = 1; index < minuteValues.length; index += 1) {
    if (minuteValues[index] - minuteValues[index - 1] < MIN_SLOT_GAP_MINUTES) {
      return true;
    }
  }
  return false;
}

function validateGlassSize(glassMl: number): GlassScheduleError | null {
  if (glassMl <= 0) {
    return 'invalid_glass_size';
  }

  return null;
}

function validateWindow(window: ReminderWindow): GlassScheduleError | null {
  const startMinutes = timeToMinutes(window.start);
  const endMinutes = timeToMinutes(window.end);

  if (endMinutes <= startMinutes) {
    if (endMinutes < startMinutes) {
      return 'overnight_window';
    }
    return 'end_before_or_equal_start';
  }

  return null;
}

export function buildGlassSchedule(input: GlassScheduleInput): GlassScheduleResult {
  const glassSizeError = validateGlassSize(input.glassMl);
  if (glassSizeError) {
    return { ok: false, error: glassSizeError };
  }

  const windowError = validateWindow(input.window);
  if (windowError) {
    return { ok: false, error: windowError };
  }

  const glassCount = countDailyGlasses(input.goalMl, input.glassMl);
  const slots = buildEvenSlots(input.window, glassCount);

  if (hasSlotsTooClose(slots)) {
    return { ok: false, error: 'slots_too_close' };
  }

  return {
    ok: true,
    schedule: { glassCount, slots },
  };
}
