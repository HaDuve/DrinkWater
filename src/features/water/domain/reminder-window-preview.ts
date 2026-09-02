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
      windowStart: string;
      windowEnd: string;
    }
  | { ok: false; error: GlassScheduleError };

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
    windowStart: formatTimeOfDay(input.window.start),
    windowEnd: formatTimeOfDay(input.window.end),
  };
}
