import {
  Canvas,
  Circle,
  Fill,
  Group,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing, WaterMotion } from '@/constants/theme';
import { buildHomeRingPresentation } from '@/features/water/domain/home-ring-presentation';
import { useWaterMaterial } from '@/hooks/use-water-material';

type Props = {
  intakeMl: number;
  goalMl: number;
  busyAction?: 'add' | 'undo' | null;
  size?: number;
  intakeLine: string;
  goalLine: string;
  sublabel?: string;
};

function hexToRgb01(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = Number.parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

const liquidEffect = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float fill;
uniform float time;
uniform float motion;
uniform float3 water;
uniform float3 deep;
uniform float3 foam;
uniform float3 surface;

half4 main(float2 xy) {
  float2 uv = xy / resolution;
  float2 centered = (xy - resolution * 0.5) / (min(resolution.x, resolution.y) * 0.5);
  float r = length(centered);
  if (r > 1.0) {
    return half4(0.0);
  }

  float edge = smoothstep(1.0, 0.92, r);
  float wave = motion * sin(uv.x * 14.0 + time * 2.2) * 0.018
    + motion * sin(uv.x * 7.0 - time * 1.4) * 0.012;
  float level = 1.0 - fill + wave;
  float below = smoothstep(level - 0.01, level + 0.01, uv.y);
  float foamBand = smoothstep(level - 0.03, level, uv.y) * (1.0 - smoothstep(level, level + 0.04, uv.y));

  float3 air = surface;
  float depthMix = clamp((uv.y - level) / max(fill, 0.001), 0.0, 1.0);
  float3 body = mix(water, deep, depthMix * 0.85);
  float caustic = motion * 0.08 * sin((uv.x + uv.y) * 20.0 + time * 1.6);
  body += float3(caustic, caustic * 0.8, caustic * 0.5);

  float3 color = mix(air, body, below);
  color = mix(color, foam, foamBand * below);
  float alpha = edge;
  return half4(color * alpha, alpha);
}
`)!;

export function WaterLiquidVessel({
  intakeMl,
  goalMl,
  busyAction = null,
  size = 260,
  intakeLine,
  goalLine,
  sublabel,
}: Props) {
  const water = useWaterMaterial();
  const systemReducedMotion = useReducedMotion();
  const presentation = useMemo(
    () =>
      buildHomeRingPresentation({
        intakeMl,
        goalMl,
        reducedMotion: Boolean(systemReducedMotion),
        busyAction,
      }),
    [intakeMl, goalMl, systemReducedMotion, busyAction],
  );

  const time = useSharedValue(0);
  const fill = useSharedValue(presentation.fillRatio);

  useEffect(() => {
    fill.value = presentation.fillRatio;
  }, [fill, presentation.fillRatio]);

  useEffect(() => {
    if (!presentation.motionAllowed) {
      time.value = 0;
      return;
    }
    time.value = withRepeat(
      withTiming(Math.PI * 2, { duration: WaterMotion.idleShimmerPeriodMs }),
      -1,
      false,
    );
  }, [presentation.motionAllowed, time]);

  const waterRgb = hexToRgb01(water.water);
  const deepRgb = hexToRgb01(water.waterDeep);
  const foamRgb = hexToRgb01(water.foam);
  const surfaceRgb = hexToRgb01(water.surface);

  const uniforms = useDerivedValue(() => ({
    resolution: vec(size, size),
    fill: fill.value,
    time: time.value,
    motion: presentation.motionAllowed ? 1 : 0,
    water: waterRgb,
    deep: deepRgb,
    foam: foamRgb,
    surface: surfaceRgb,
  }));

  const a11yLabel = `${intakeLine} ${goalLine}`;

  return (
    <View
      style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}
      accessibilityRole="progressbar"
      accessibilityValue={{
        min: 0,
        max: 100,
        now: Math.round(presentation.fillRatio * 100),
        text: a11yLabel,
      }}>
      <Canvas style={{ width: size, height: size }} accessible={false}>
        <Group>
          <Circle cx={size / 2} cy={size / 2} r={size / 2 - 2} color={water.surfaceDeep} />
          <Fill>
            <Shader source={liquidEffect} uniforms={uniforms} />
          </Fill>
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - 3}
            style="stroke"
            strokeWidth={3}
            color={water.caustic}
          />
        </Group>
      </Canvas>
      <View style={styles.labelBlock} accessible={false}>
        <ThemedText
          type="subtitle"
          style={[styles.lineText, styles.tabular, { color: water.ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.5}>
          {intakeLine}
        </ThemedText>
        <ThemedText
          type="subtitle"
          style={[styles.lineText, styles.tabular, { color: water.ink }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.5}>
          {goalLine}
        </ThemedText>
        {sublabel ? (
          <ThemedText
            type="small"
            style={[styles.sublabel, { color: water.mist }]}
            maxFontSizeMultiplier={1.5}>
            {sublabel}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelBlock: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
  lineText: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  sublabel: {
    marginTop: Spacing.one,
    textAlign: 'center',
  },
});
