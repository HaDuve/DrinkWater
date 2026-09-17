# DrinkWater

A local water-intake tracker. Reminders pace remaining glasses so the last ping of the day lands at the end of the reminder window.

## Language

**Daily Goal**:
Millilitres the person intends to drink on a calendar day.
_Avoid_: target, quota

**Glass**:
One logged drink of the configured glass size.
_Avoid_: sip, serving, drink

**Intake**:
Millilitres already logged today.
_Avoid_: progress, consumed

**Reminder Window**:
Same-day start and end clock times that bound when reminders may fire. Overnight windows are not a thing here.
_Avoid_: interval, schedule

**Planned Glass Count**:
How many Glasses cover the Daily Goal (rounded up).

**Remaining Glasses**:
How many Glasses still needed to hit today's Daily Goal. Zero once Intake meets or passes the Daily Goal.

**Glass Slot**:
A clock time when one reminder fires.

**Default Plan**:
Even Glass Slots for the Planned Glass Count across the full Reminder Window, last slot pinned to window end (including a single-glass day).
_Avoid_: static schedule

**Remaining Window**:
From the later of Reminder Window start and the next future minute, through Reminder Window end. None once that start is not before the end.

**Remaining Plan**:
Even Glass Slots for Remaining Glasses across the Remaining Window, last slot pinned to window end. Empty when Remaining Glasses is zero or there is no Remaining Window.
_Avoid_: dynamic notifications, live schedule

**Pacing Event**:
Logging or undoing a Glass, changing goal / glass size / Reminder Window / reminders on-off, or starting a new calendar day. Opening the app is not a Pacing Event.

**Today Differs**:
Today's Remaining Plan is not the same as the Default Plan: fewer Remaining Glasses, a later Remaining Window start, or no Remaining Plan left (goal hit or past window end). Before Reminder Window start with zero Intake, Today does not differ.
