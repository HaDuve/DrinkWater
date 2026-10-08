import React from 'react';
import { StyleSheet, View, type TextProps } from 'react-native';

import { StrokedText } from '@/components/stroked-text';
import { Spacing } from '@/constants/theme';
import { useWaterMaterial } from '@/hooks/use-water-material';

type Props = {
  intakeLine: string;
  goalLine: string;
  sublabel?: string;
};

type VesselLineProps = {
  children: string;
  fill: string;
  type: 'subtitle' | 'small';
  style?: TextProps['style'];
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  maxFontSizeMultiplier?: number;
};

function VesselLine({ children, fill, type, style, ...textProps }: VesselLineProps) {
  return (
    <StrokedText type={type} fill={fill} outline="#000000" style={style} {...textProps}>
      {children}
    </StrokedText>
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
      <VesselLine
        type="subtitle"
        fill={water.foam}
        style={[styles.lineText, styles.tabular]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={1.5}>
        {intakeLine}
      </VesselLine>
      <VesselLine
        type="subtitle"
        fill={water.foam}
        style={[styles.lineText, styles.tabular]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        maxFontSizeMultiplier={1.5}>
        {goalLine}
      </VesselLine>
      {sublabel ? (
        <VesselLine type="small" fill={water.foam} style={styles.sublabel} maxFontSizeMultiplier={1.5}>
          {sublabel}
        </VesselLine>
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
