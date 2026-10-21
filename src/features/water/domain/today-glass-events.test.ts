import {
  appendGlassEvent,
  parseTodayGlassEvents,
  popLastGlassEvent,
  serializeTodayGlassEvents,
} from './today-glass-events';

describe('parseTodayGlassEvents', () => {
  it('returns empty for missing or stale date payloads', () => {
    expect(parseTodayGlassEvents(null, '2026-10-21')).toEqual([]);
    expect(
      parseTodayGlassEvents(
        serializeTodayGlassEvents('2026-10-20', [{ atMs: 1, amountMl: 250 }]),
        '2026-10-21',
      ),
    ).toEqual([]);
  });

  it('round-trips today events', () => {
    const events = [
      { atMs: 1000, amountMl: 250 },
      { atMs: 2000, amountMl: 250 },
    ];
    expect(parseTodayGlassEvents(serializeTodayGlassEvents('2026-10-21', events), '2026-10-21')).toEqual(
      events,
    );
  });
});

describe('appendGlassEvent / popLastGlassEvent', () => {
  it('appends and pops the last glass', () => {
    const withOne = appendGlassEvent([], 250, 1000);
    expect(withOne).toEqual([{ atMs: 1000, amountMl: 250 }]);
    expect(popLastGlassEvent(withOne)).toEqual([]);
    expect(popLastGlassEvent([])).toEqual([]);
  });
});
