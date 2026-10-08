import { mapVesselTouchToOrigin } from '@/features/water/domain/vessel-touch-origin';

describe('mapVesselTouchToOrigin', () => {
  it('maps center press to origin', () => {
    expect(mapVesselTouchToOrigin(130, 130, 260)).toEqual({ x: 0, y: 0 });
  });

  it('maps a point in the lower-right quadrant', () => {
    expect(mapVesselTouchToOrigin(195, 195, 260)).toEqual({ x: 0.5, y: 0.5 });
  });

  it('rejects presses outside the vessel disk', () => {
    expect(mapVesselTouchToOrigin(0, 0, 260)).toBeNull();
    expect(mapVesselTouchToOrigin(260, 0, 260)).toBeNull();
  });

  it('rejects invalid size', () => {
    expect(mapVesselTouchToOrigin(10, 10, 0)).toBeNull();
  });
});
