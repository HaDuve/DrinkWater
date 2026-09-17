import {
  buildGlassSchedule,
  formatTimeOfDay,
  type GlassScheduleError,
  type GlassScheduleInput,
} from '@/features/water/domain/glass-schedule';

export type ReminderWindowPreviewInput = GlassScheduleInput;

export type ReminderWindowPreview =
  | {
      ok: true;
      glassCount: number;
      intervalMinutes: number | null;
      windowStart: string;
      windowEnd: string;
    }
  | { ok: false; error: GlassScheduleError };

function minutesBetweenSlots(slots: { hour: number; minute: number }[]): number | null {
  if (slots.length < 2) return null;
  const first = slots[0].hour * 60 + slots[0].minute;
  const second = slots[1].hour * 60 + slots[1].minute;
  return second - first;
}

export function buildReminderWindowPreview(
  input: ReminderWindowPreviewInput,
): ReminderWindowPreview {
  const result = buildGlassSchedule(input);
  if (!result.ok) {
    return result;
  }

  return {
    ok: true,
    glassCount: result.schedule.glassCount,
    intervalMinutes: minutesBetweenSlots(result.schedule.slots),
    windowStart: formatTimeOfDay(input.window.start),
    windowEnd: formatTimeOfDay(input.window.end),
  };
}
