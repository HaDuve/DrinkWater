import { type TimeOfDay } from './glass-schedule';

function slotDateOnDay(slot: TimeOfDay, day: Date): Date {
  const trigger = new Date(day);
  trigger.setHours(slot.hour, slot.minute, 0, 0);
  return trigger;
}

/** Future Glass Slot fire times for today's and tomorrow's Default Plans. */
export function buildDefaultPlanFireDates(slots: TimeOfDay[], now: Date): Date[] {
  const fires: Date[] = [];
  for (const dayOffset of [0, 1]) {
    const day = new Date(now);
    day.setDate(day.getDate() + dayOffset);
    for (const slot of slots) {
      const trigger = slotDateOnDay(slot, day);
      if (trigger.getTime() > now.getTime()) {
        fires.push(trigger);
      }
    }
  }
  return fires;
}
