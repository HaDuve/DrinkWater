import {
  Canvas,
  Circle,
  Fill,
  Group,
  Shader,
  Skia,
  vec,
} from '@shopify/react-native-skia';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, View, type GestureResponderEvent } from 'react-native';
import {
  Easing,
  useDerivedValue,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { WaterVesselLabels } from '@/components/water-vessel-labels';
import { WaterMotion } from '@/constants/theme';
import { buildHomeRingPresentation } from '@/features/water/domain/home-ring-presentation';
import { mapVesselTouchToOrigin } from '@/features/water/domain/vessel-touch-origin';
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

function runRippleAge(
  age: { value: number },
  durationMs: number,
) {
  age.value = 0;
  age.value = withTiming(
    1,
    {
      duration: durationMs,
      easing: Easing.linear,
    },
    (finished) => {
      if (finished) {
        age.value = 0;
      }
    },
  );
}

const liquidEffect = Skia.RuntimeEffect.Make(`
uniform float2 resolution;
uniform float fill;
uniform float time;
uniform float motion;
uniform float rippleAge;
uniform float rippleSign;
uniform float2 rippleOrigin;
uniform float tapAge;
uniform float2 tapOrigin;
uniform float celebrate;
uniform float3 water;
uniform float3 deep;
uniform float3 foam;
uniform float3 surface;

float ringHeight(float radial, float front, float k, float beta) {
  float d = radial - front;
  return sin(d * k) * exp(-abs(d) * beta);
}

// Expanding rings from origin, soft rim echo, viscous temporal damp → flat.
float impactFrom(float2 p, float2 origin, float age, float ampSign) {
  if (age < 0.001) {
    return 0.0;
  }
  float radial = length(p - origin);
  float wall = 0.92;
  float speed = 1.55;
  float front = age * speed;
  float damp = exp(-age * 3.4);
  float k = 26.0;
  float beta = 7.5;

  float h = ringHeight(radial, front, k, beta);
  // Distance from origin to rim along the radial ray ≈ wall - |origin| (approx for soft echo).
  float originR = length(origin);
  float toWall = max(wall - originR, 0.08);
  float echoFront = front - toWall * 2.0;
  if (echoFront > 0.0) {
    h += 0.62 * ringHeight(radial, echoFront, k, beta);
  }
  float secondOut = front - toWall * 4.0;
  if (secondOut > 0.0) {
    h += 0.32 * ringHeight(radial, secondOut, k, beta);
  }
  float kick = exp(-radial * radial * 48.0) * exp(-age * 14.0) * sin(age * 36.0);
  return ampSign * damp * (h * 0.055 + kick * 0.028);
}

half4 main(float2 xy) {
  float2 uv = xy / resolution;
  float2 centered = (xy - resolution * 0.5) / (min(resolution.x, resolution.y) * 0.5);
  float r = length(centered);
  if (r > 1.0) {
    return half4(0.0);
  }

  float edge = smoothstep(1.0, 0.92, r);
  float wave = motion * (
      sin(uv.x * 5.0 + time * 1.0) * 0.017
    + sin(uv.x * 9.0 - time * 1.0) * 0.010
    + sin(uv.x * 22.0 + time * 3.0) * 0.004
  );

  float impact = 0.0;
  if (motion > 0.5) {
    impact += impactFrom(centered, rippleOrigin, rippleAge, rippleSign);
    impact += impactFrom(centered, tapOrigin, tapAge, 1.0);
    wave += impact;
  }

  float level = 1.0 - fill + wave;
  float below = smoothstep(level - 0.012, level + 0.012, uv.y);
  float foamBand = smoothstep(level - 0.035, level, uv.y) * (1.0 - smoothstep(level, level + 0.045, uv.y));

  float crestFoam = clamp(abs(impact) * 14.0, 0.0, 1.0) * below;
  float burst = celebrate * (1.0 - smoothstep(0.2, 0.95, r)) * (0.55 + 0.45 * sin(time * 14.0));

  float3 air = surface;
  float depthMix = clamp((uv.y - level) / max(fill, 0.001), 0.0, 1.0);
  float3 body = mix(water, deep, depthMix * 0.85);
  float caustic = motion * 0.055 * (
      sin((uv.x + uv.y) * 12.0 + time * 1.0) * 0.65
    + sin((uv.x - uv.y) * 28.0 + time * 3.0) * 0.35
  );
  body += float3(caustic, caustic * 0.8, caustic * 0.5);
  body = mix(body, foam, crestFoam * 0.55);
  body = mix(body, foam, burst * 0.8);

  float3 color = mix(air, body, below);
  color = mix(color, foam, foamBand * below);
  color = mix(color, foam, burst * (1.0 - below) * 0.35);
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
  const rippleAge = useSharedValue(0);
  const rippleSign = useSharedValue(1);
  const rippleOriginX = useSharedValue(0);
  const rippleOriginY = useSharedValue(0);
  const tapAge = useSharedValue(0);
  const tapOriginX = useSharedValue(0);
  const tapOriginY = useSharedValue(0);
  const celebrate = useSharedValue(0);
  const prevFillRef = useRef(presentation.fillRatio);
  const prevPhaseRef = useRef(presentation.phase);

  useEffect(() => {
    const nextFill = presentation.fillRatio;
    const prevFill = prevFillRef.current;
    const fillChanged = Math.abs(nextFill - prevFill) > 0.0001;

    if (!presentation.motionAllowed) {
      fill.value = nextFill;
      rippleAge.value = 0;
      tapAge.value = 0;
      celebrate.value = 0;
    } else if (fillChanged) {
      const pouring = nextFill > prevFill;
      const pourVelocity = pouring ? 0.55 : -0.35;
      fill.value = withSpring(nextFill, {
        ...WaterMotion.fillSpring,
        velocity: pourVelocity,
      });
      rippleSign.value = pouring ? 1 : -1;
      rippleOriginX.value = 0;
      rippleOriginY.value = 0;
      runRippleAge(rippleAge, WaterMotion.rippleMs);
    }

    if (
      presentation.motionAllowed &&
      presentation.phase === 'celebrated' &&
      prevPhaseRef.current !== 'celebrated'
    ) {
      celebrate.value = withSequence(
        withTiming(1, { duration: 160 }),
        withTiming(0, { duration: WaterMotion.celebrateMs }),
      );
    }

    prevFillRef.current = nextFill;
    prevPhaseRef.current = presentation.phase;
  }, [
    celebrate,
    fill,
    presentation.fillRatio,
    presentation.motionAllowed,
    presentation.phase,
    rippleAge,
    rippleOriginX,
    rippleOriginY,
    rippleSign,
    tapAge,
  ]);

  useEffect(() => {
    if (!presentation.motionAllowed) {
      time.value = 0;
      return;
    }
    time.value = withRepeat(
      withTiming(Math.PI * 2, {
        duration: WaterMotion.idleShimmerPeriodMs,
        easing: Easing.linear,
      }),
      -1,
      false,
    );
  }, [presentation.motionAllowed, time]);

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      if (!presentation.motionAllowed) return;
      const { locationX, locationY } = event.nativeEvent;
      const origin = mapVesselTouchToOrigin(locationX, locationY, size);
      if (!origin) return;

      tapOriginX.value = origin.x;
      tapOriginY.value = origin.y;
      runRippleAge(tapAge, WaterMotion.rippleMs);
    },
    [presentation.motionAllowed, size, tapAge, tapOriginX, tapOriginY],
  );

  const waterRgb = hexToRgb01(water.water);
  const deepRgb = hexToRgb01(water.waterDeep);
  const foamRgb = hexToRgb01(water.foam);
  const surfaceRgb = hexToRgb01(water.surface);

  const uniforms = useDerivedValue(() => ({
    resolution: vec(size, size),
    fill: fill.value,
    time: time.value,
    motion: presentation.motionAllowed ? 1 : 0,
    rippleAge: rippleAge.value,
    rippleSign: rippleSign.value,
    rippleOrigin: vec(rippleOriginX.value, rippleOriginY.value),
    tapAge: tapAge.value,
    tapOrigin: vec(tapOriginX.value, tapOriginY.value),
    celebrate: celebrate.value,
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
      <Pressable
        accessible={false}
        onPressIn={handlePressIn}
        style={{ width: size, height: size }}>
        {/* Skia Canvas steals hits unless passthrough — wrap required on Android < skia 2.4.16 */}
        <View pointerEvents="none" style={{ width: size, height: size, zIndex: 0 }}>
          <Canvas
            pointerEvents="none"
            style={{ width: size, height: size }}
            accessible={false}>
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
        </View>
        <WaterVesselLabels intakeLine={intakeLine} goalLine={goalLine} sublabel={sublabel} />
      </Pressable>
    </View>
  );
}
