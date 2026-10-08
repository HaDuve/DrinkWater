import fs from 'node:fs';
import path from 'node:path';

/**
 * Regression: web fallback must not keep a Reanimated fill spring that never
 * drives the SVG stroke (review #39 blocker).
 */
describe('WaterLiquidVessel web', () => {
  it('does not keep an unused fillAnim spring', () => {
    const srcPath = path.join(__dirname, 'water-liquid-vessel.web.tsx');
    const src = fs.readFileSync(srcPath, 'utf8');

    expect(src).not.toMatch(/\bfillAnim\b/);
    expect(src).not.toMatch(/\bwithSpring\b/);
  });
});
