import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { WaterVesselLabels } from '@/components/water-vessel-labels';
import { WaterMotion } from '@/constants/theme';
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

/** Simpler web fallback: water-token ring fill (no SkSL). */
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

  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const fillAnim = useSharedValue(presentation.fillRatio);

  useEffect(() => {
    if (!presentation.motionAllowed) {
      fillAnim.value = presentation.fillRatio;
      return;
    }
    fillAnim.value = withSpring(presentation.fillRatio, WaterMotion.fillSpring);
  }, [fillAnim, presentation.fillRatio, presentation.motionAllowed]);

  const strokeDashoffset = circumference * (1 - presentation.fillRatio);
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
      <Svg width={size} height={size} style={styles.canvas} accessible={false}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={water.surfaceDeep}
          strokeWidth={strokeWidth}
          fill={water.surface}
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={water.water}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
          opacity={presentation.phase === 'celebrated' ? 1 : 0.95}
        />
      </Svg>
      <WaterVesselLabels intakeLine={intakeLine} goalLine={goalLine} sublabel={sublabel} />
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
});
