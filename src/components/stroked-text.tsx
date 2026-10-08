import React, { useMemo } from 'react';
import { StyleSheet, View, type TextProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';

function buildOutlineOffsets(width: number): [number, number][] {
  const w = width;
  const d = width * 0.8;
  return [
    [-w, 0],
    [w, 0],
    [0, -w],
    [0, w],
    [-d, -d],
    [d, -d],
    [-d, d],
    [d, d],
  ];
}

type Props = {
  children: string;
  fill: string;
  /** Dark outline color (use `water.strokeOutline`). */
  outline: string;
  /** Outline thickness in dp; vessel labels ~1.5, buttons ~2. */
  outlineWidth?: number;
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  style?: TextProps['style'];
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
  minimumFontScale?: number;
  maxFontSizeMultiplier?: number;
};

/**
 * Foam (or other) fill + dark outline — same technique as vessel ml labels.
 */
export function StrokedText({
  children,
  fill,
  outline,
  outlineWidth = 1.5,
  type = 'smallBold',
  style,
  ...textProps
}: Props) {
  const offsets = useMemo(() => buildOutlineOffsets(outlineWidth), [outlineWidth]);

  return (
    <View style={styles.strokeWrap}>
      {offsets.map(([x, y]) => (
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

const styles = StyleSheet.create({
  strokeWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  strokeLayer: {
    position: 'absolute',
  },
  fillLayer: {
    position: 'relative',
    zIndex: 1,
  },
});

