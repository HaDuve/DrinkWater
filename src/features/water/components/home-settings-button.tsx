import { Link } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useWaterMaterial } from '@/hooks/use-water-material';

export function HomeSettingsButton() {
  const { t } = useTranslation();
  const water = useWaterMaterial();

  return (
    <Link href="/settings" asChild>
      <Pressable
        role="button"
        accessibilityRole="button"
        accessibilityLabel={t('home.openSettings')}
        hitSlop={Spacing.two}
        style={({ pressed }) => [styles.hit, pressed && styles.pressed]}>
        <SymbolView
          name="gearshape"
          size={22}
          weight="medium"
          tintColor={water.ink}
          fallback={
            <ThemedText type="smallBold" style={{ color: water.ink }}>
              ⚙
            </ThemedText>
          }
        />
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  hit: {
    minWidth: 48,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
