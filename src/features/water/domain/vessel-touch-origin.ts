/** Map a press in vessel local pixels to shader-centered coords (−1…1), or null if outside the disk. */
export function mapVesselTouchToOrigin(
  locationX: number,
  locationY: number,
  size: number,
): { x: number; y: number } | null {
  if (size <= 0) return null;
  const half = size / 2;
  const x = (locationX - half) / half;
  const y = (locationY - half) / half;
  if (x * x + y * y > 1) return null;
  return { x, y };
}
