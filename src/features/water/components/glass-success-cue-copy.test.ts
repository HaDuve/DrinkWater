import type { TFunction } from 'i18next';

import { formatGlassSuccessCueBody } from './glass-success-cue-copy';

const mockT = ((key: string, params?: Record<string, unknown>) =>
  params ? `${key}:${JSON.stringify(params)}` : key) as TFunction;

describe('formatGlassSuccessCueBody', () => {
  it('names a logged Glass with its amount', () => {
    expect(
      formatGlassSuccessCueBody(
        { kind: 'added', amountMl: 250, firstOfDay: false },
        mockT,
      ),
    ).toBe('home.glassLogged:{"ml":250}');
  });

  it('calls out the first Glass of the day with its amount', () => {
    expect(
      formatGlassSuccessCueBody(
        { kind: 'added', amountMl: 300, firstOfDay: true },
        mockT,
      ),
    ).toBe('home.glassLoggedFirst:{"ml":300}');
  });

  it('names an undone Glass with its amount', () => {
    expect(
      formatGlassSuccessCueBody({ kind: 'undone', amountMl: 250 }, mockT),
    ).toBe('home.glassUndone:{"ml":250}');
  });
});
