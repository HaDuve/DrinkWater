/** Which Home vessel UI to show for the Animations setting. */
export type HomeVesselKind = 'liquid' | 'ring';

export function pickHomeVesselKind(animationsEnabled: boolean): HomeVesselKind {
  return animationsEnabled ? 'liquid' : 'ring';
}
