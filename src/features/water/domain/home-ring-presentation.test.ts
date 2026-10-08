import { buildHomeRingPresentation, clampFillRatio } from './home-ring-presentation';

describe('clampFillRatio', () => {
  it('clamps Intake / Daily Goal to 0–1', () => {
    expect(clampFillRatio(0, 2000)).toBe(0);
    expect(clampFillRatio(1000, 2000)).toBe(0.5);
    expect(clampFillRatio(2000, 2000)).toBe(1);
    expect(clampFillRatio(2500, 2000)).toBe(1);
  });

  it('returns 0 when Daily Goal is non-positive', () => {
    expect(clampFillRatio(500, 0)).toBe(0);
    expect(clampFillRatio(500, -1)).toBe(0);
  });
});

describe('buildHomeRingPresentation', () => {
  it('disallows motion when reducedMotion is on', () => {
    expect(
      buildHomeRingPresentation({
        intakeMl: 500,
        goalMl: 2000,
        reducedMotion: true,
        busyAction: null,
      }),
    ).toEqual({
      fillRatio: 0.25,
      phase: 'idle',
      motionAllowed: false,
    });
  });

  it('allows motion and idles below Daily Goal', () => {
    expect(
      buildHomeRingPresentation({
        intakeMl: 500,
        goalMl: 2000,
        reducedMotion: false,
        busyAction: null,
      }),
    ).toEqual({
      fillRatio: 0.25,
      phase: 'idle',
      motionAllowed: true,
    });
  });

  it('marks filling while adding a Glass below Daily Goal', () => {
    expect(
      buildHomeRingPresentation({
        intakeMl: 500,
        goalMl: 2000,
        reducedMotion: false,
        busyAction: 'add',
      }).phase,
    ).toBe('filling');
  });

  it('marks celebrated when adding reaches Daily Goal', () => {
    expect(
      buildHomeRingPresentation({
        intakeMl: 2000,
        goalMl: 2000,
        reducedMotion: false,
        busyAction: 'add',
      }).phase,
    ).toBe('celebrated');
  });

  it('marks draining while undoing a Glass', () => {
    expect(
      buildHomeRingPresentation({
        intakeMl: 500,
        goalMl: 2000,
        reducedMotion: false,
        busyAction: 'undo',
      }).phase,
    ).toBe('draining');
  });

  it('marks celebrated when Intake meets Daily Goal at rest', () => {
    expect(
      buildHomeRingPresentation({
        intakeMl: 2000,
        goalMl: 2000,
        reducedMotion: false,
        busyAction: null,
      }).phase,
    ).toBe('celebrated');
  });
});
