import { pickHomeVesselKind } from './home-vessel-kind';

describe('pickHomeVesselKind', () => {
  it('uses the liquid vessel when Animations is on', () => {
    expect(pickHomeVesselKind(true)).toBe('liquid');
  });

  it('uses the progress ring when Animations is off', () => {
    expect(pickHomeVesselKind(false)).toBe('ring');
  });
});
