import { HOME_CENTER_VESSEL_SIZE, buildHomeCenterLayoutModel } from './home-center-layout';

describe('buildHomeCenterLayoutModel', () => {
  it('centers a stage vessel size and clamps fill progress', () => {
    expect(
      buildHomeCenterLayoutModel({
        intakeMl: 2500,
        goalMl: 2000,
      }),
    ).toEqual({
      vesselSize: HOME_CENTER_VESSEL_SIZE,
      progress: 1,
      canUndo: true,
      goalReached: true,
    });
  });

  it('reports incomplete goal and no undo when intake is empty', () => {
    expect(
      buildHomeCenterLayoutModel({
        intakeMl: 0,
        goalMl: 2000,
      }),
    ).toEqual({
      vesselSize: HOME_CENTER_VESSEL_SIZE,
      progress: 0,
      canUndo: false,
      goalReached: false,
    });
  });

  it('treats non-positive goal as zero progress', () => {
    expect(
      buildHomeCenterLayoutModel({
        intakeMl: 400,
        goalMl: 0,
      }).progress,
    ).toBe(0);
  });
});
