import React from 'react';
import { StyleSheet, View, type TextProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useWaterMaterial } from '@/hooks/use-water-material';

type Props = {
  intakeLine: string;
  goalLine: string;
  sublabel?: string;
};

const OUTLINE_OFFSETS: Array<[number, number]> = [
  [-1.5, 0],
  [1.5, 0],
  [0, -1.5],
  [0, 1.5],
  [-1.2, -1.2],
  [1.2, -1.2],
  [-1.2, 1.2],
  [1.2, 1.2],
];

type StrokedLineProps = {
  children: string;
  fill: string;
  outline: string;
  type: 'subtitle' | 'small';
  style?: TextProps['style'];
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  maxFontSizeMultiplier?: number;
};

function StrokedVesselLine({
  children,
  fill,
  outline,
  type,
  style,
  ...textProps
}: StrokedLineProps) {
  return (
    <View style={styles.strokeWrap}>
      {OUTLINE_OFFSETS.map(([x, y]) => (
        <ThemedText
          key={`${x}:${y}`}
          type={type}
          style={[style, styles.strokeLayer, { color: outline, left: x, top: y }]}
          {...textProps}
          accessible={false}>
          {children}
        </ThemedText>
      ))}
      <ThemedText type={type} style={[style, styles.fillLayer, { color: fill }]} {...textProps}>
        {children}
      </ThemedText>
    </View>
  );
}

/**
 * Center labels drawn above the liquid canvas.
 * Foam fill + dark stroke keeps Intake / Daily Goal readable on air and water.
 */
export function WaterVesselLabels({ intakeLine, goalLine, sublabel }: Props) {
  const water = useWaterMaterial();

  return (
    <View style={styles.labelBlock} accessible={false} pointerEvents="none">
      <StrokedVesselLine
        type="subtitle"
        fill={water.foam}
        outline="#000000"
        style={[styles.lineText, styles.tabular]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={1.5}>
        {intakeLine}
      </StrokedVesselLine>
      <StrokedVesselLine
        type="subtitle"
        fill={water.foam}
        outline="#000000"
        style={[styles.lineText, styles.tabular]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={1.5}>
        {goalLine}
      </StrokedVesselLine>
      {sublabel ? (
        <StrokedVesselLine
          type="small"
          fill={water.foam}
          outline="#000000"
          style={styles.sublabel}
          maxFontSizeMultiplier={1.5}>
          {sublabel}
        </StrokedVesselLine>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labelBlock: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2,
    elevation: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
    gap: Spacing.half,
  },
  strokeWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  strokeLayer: {
    position: 'absolute',
  },
  fillLayer: {
    position: 'relative',
  },
  lineText: {
    textAlign: 'center',
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  tabular: {
    fontVariant: ['tabular-nums'],
  },
  sublabel: {
    marginTop: Spacing.one,
    textAlign: 'center',
  },
});
