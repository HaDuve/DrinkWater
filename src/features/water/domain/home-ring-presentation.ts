export type HomeRingPhase = 'idle' | 'filling' | 'draining' | 'celebrated';

export type HomeRingBusyAction = 'add' | 'undo' | null;

export type HomeRingPresentationInput = {
  intakeMl: number;
  goalMl: number;
  reducedMotion: boolean;
  busyAction: HomeRingBusyAction;
};

export type HomeRingPresentation = {
  /** Intake / Daily Goal clamped to 0–1 (over-goal reads full). */
  fillRatio: number;
  phase: HomeRingPhase;
  motionAllowed: boolean;
};

export function clampFillRatio(intakeMl: number, goalMl: number): number {
  if (goalMl <= 0) return 0;
  return Math.min(1, Math.max(0, intakeMl / goalMl));
}

/** Pure Home vessel presentation — fill, phase, and whether motion may run. */
export function buildHomeRingPresentation(
  input: HomeRingPresentationInput,
): HomeRingPresentation {
  const fillRatio = clampFillRatio(input.intakeMl, input.goalMl);
  const motionAllowed = !input.reducedMotion;

  let phase: HomeRingPhase = 'idle';
  if (input.busyAction === 'add') {
    phase = fillRatio >= 1 ? 'celebrated' : 'filling';
  } else if (input.busyAction === 'undo') {
    phase = 'draining';
  } else if (fillRatio >= 1) {
    phase = 'celebrated';
  }

  return { fillRatio, phase, motionAllowed };
}
