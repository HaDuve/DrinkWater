import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useWaterMaterial } from '@/hooks/use-water-material';

type Props = {
  label?: string;
};

export function ScreenBackButton({ label }: Props) {
  const { t } = useTranslation();
  const water = useWaterMaterial();
  const accessibilityLabel = label ?? t('common.back');

  return (
    <Pressable
      role="button"
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={Spacing.two}
      onPress={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/');
        }
      }}
      style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
      <SymbolView
        name="chevron.left"
        size={18}
        weight="semibold"
        tintColor={water.ink}
        fallback={
          <ThemedText type="smallBold" style={{ color: water.ink }}>
            ‹
          </ThemedText>
        }
      />
      <ThemedText type="smallBold" style={{ color: water.ink }}>
        {accessibilityLabel}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.half,
    minHeight: 48,
    paddingVertical: Spacing.one,
    paddingRight: Spacing.two,
    alignSelf: 'flex-start',
  },
  pressed: {
    opacity: 0.7,
  },
});
