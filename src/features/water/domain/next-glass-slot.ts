import { type TimeOfDay } from './glass-schedule';

export type NextGlassSlot =
  | { kind: 'today'; slot: TimeOfDay; triggerMs: number }
  | { kind: 'tomorrow'; slot: TimeOfDay; triggerMs: number };

function timeOfDaySortKey(time: TimeOfDay): number {
  return time.hour * 60 + time.minute;
}

function slotTriggerMs(slot: TimeOfDay, day: Date): number {
  const trigger = new Date(day);
  trigger.setHours(slot.hour, slot.minute, 0, 0);
  return trigger.getTime();
}

export function pickNextGlassSlot(slots: TimeOfDay[], now: Date): NextGlassSlot | null {
  if (slots.length === 0) return null;

  const sorted = [...slots].sort((a, b) => timeOfDaySortKey(a) - timeOfDaySortKey(b));
  const nowMs = now.getTime();

  for (const slot of sorted) {
    const triggerMs = slotTriggerMs(slot, now);
    if (triggerMs > nowMs) {
      return { kind: 'today', slot, triggerMs };
    }
  }

  const first = sorted[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return {
    kind: 'tomorrow',
    slot: first,
    triggerMs: slotTriggerMs(first, tomorrow),
  };
}
