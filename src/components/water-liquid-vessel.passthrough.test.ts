import fs from 'node:fs';
import path from 'node:path';

/**
 * Tap ripples need the Skia Canvas to pass hits through to Pressable
 * (Canvas steals touches — especially Android with Skia < 2.4.16).
 */
describe('WaterLiquidVessel touch passthrough', () => {
  it('wraps Canvas with pointerEvents none so taps reach Pressable', () => {
    const srcPath = path.join(__dirname, 'water-liquid-vessel.tsx');
    const src = fs.readFileSync(srcPath, 'utf8');

    const canvasTags = [...src.matchAll(/<Canvas\b([^>]*)>/g)].map((m) => m[1]);
    expect(canvasTags.length).toBeGreaterThan(0);
    for (const attrs of canvasTags) {
      expect(attrs).toMatch(/pointerEvents\s*=\s*["']none["']/);
    }

    expect(src).toMatch(/pointerEvents\s*=\s*["']none["'][\s\S]{0,160}<Canvas\b/);
    expect(src).toMatch(/onPressIn\s*=\s*\{handlePressIn\}/);
    expect(src).toMatch(/tapAge/);
    expect(src).toMatch(/tapOrigin/);
  });
});
