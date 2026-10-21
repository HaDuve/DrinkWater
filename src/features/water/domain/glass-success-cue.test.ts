import { buildGlassSuccessCue } from './glass-success-cue';

describe('buildGlassSuccessCue', () => {
  it('confirms an added Glass with the logged amount', () => {
    expect(
      buildGlassSuccessCue({
        action: 'add',
        amountMl: 250,
        previousIntakeMl: 500,
      }),
    ).toEqual({
      kind: 'added',
      amountMl: 250,
      firstOfDay: false,
    });
  });

  it('marks the first Glass of the day so confirmation can stand out', () => {
    expect(
      buildGlassSuccessCue({
        action: 'add',
        amountMl: 300,
        previousIntakeMl: 0,
      }),
    ).toEqual({
      kind: 'added',
      amountMl: 300,
      firstOfDay: true,
    });
  });

  it('confirms an undone Glass with the removed amount', () => {
    expect(
      buildGlassSuccessCue({
        action: 'undo',
        amountMl: 250,
        previousIntakeMl: 500,
      }),
    ).toEqual({
      kind: 'undone',
      amountMl: 250,
    });
  });
});
