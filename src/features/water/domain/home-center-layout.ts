import { clampFillRatio } from '@/features/water/domain/home-ring-presentation';

/** Vessel diameter for the centered home stage. */
export const HOME_CENTER_VESSEL_SIZE = 290;

export type HomeBusyAction = 'add' | 'undo' | null;

type Input = {
  intakeMl: number;
  goalMl: number;
};

export type HomeCenterLayoutModel = {
  vesselSize: number;
  progress: number;
  canUndo: boolean;
  goalReached: boolean;
};

/** Pure view-model bits for the center-stage home layout. */
export function buildHomeCenterLayoutModel(input: Input): HomeCenterLayoutModel {
  const progress = clampFillRatio(input.intakeMl, input.goalMl);
  return {
    vesselSize: HOME_CENTER_VESSEL_SIZE,
    progress,
    canUndo: input.intakeMl > 0,
    goalReached: progress >= 1,
  };
}
