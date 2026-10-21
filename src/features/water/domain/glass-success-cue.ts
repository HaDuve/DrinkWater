export type GlassSuccessCue =
  | { kind: 'added'; amountMl: number; firstOfDay: boolean }
  | { kind: 'undone'; amountMl: number };

type Input = {
  action: 'add' | 'undo';
  amountMl: number;
  previousIntakeMl: number;
};

/** Pure cue for confirming a Glass Pacing Event beyond vessel animation. */
export function buildGlassSuccessCue(input: Input): GlassSuccessCue {
  if (input.action === 'undo') {
    return { kind: 'undone', amountMl: input.amountMl };
  }
  return {
    kind: 'added',
    amountMl: input.amountMl,
    firstOfDay: input.previousIntakeMl === 0,
  };
}
