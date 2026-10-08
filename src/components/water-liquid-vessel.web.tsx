import React, { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  useReducedMotion,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
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
    fillAnim.value = withSpring(presentation.fillRatio, {
      damping: 16,
      stiffness: 140,
    });
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
      <Svg width={size} height={size} style={StyleSheet.absoluteFill} accessible={false}>
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
