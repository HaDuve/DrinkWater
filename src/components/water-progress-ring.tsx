import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';

type Props = {
  /** 0–1 */
  progress: number;
  size?: number;
  strokeWidth?: number;
  centerLabel: string;
  sublabel?: string;
};

export function WaterProgressRing({
  progress,
  size = 220,
  strokeWidth = 14,
  centerLabel,
  sublabel,
}: Props) {
  const theme = useTheme();
  const p = Math.min(1, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - p);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke={theme.backgroundElement}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={cx}
          cy={cy}
          r={radius}
          stroke="#208AEF"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
      </Svg>
      <ThemedText type="subtitle" style={{ textAlign: 'center' }}>
        {centerLabel}
      </ThemedText>
      {sublabel ? (
        <ThemedText type="small" themeColor="textSecondary" style={{ marginTop: 4 }}>
          {sublabel}
        </ThemedText>
      ) : null}
    </View>
  );
}
