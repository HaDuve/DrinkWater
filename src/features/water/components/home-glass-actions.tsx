import { SymbolView } from 'expo-symbols';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { StrokedText } from '@/components/stroked-text';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { HomeBusyAction } from '@/features/water/domain/home-center-layout';
import { useWaterMaterial } from '@/hooks/use-water-material';

type Props = {
  primaryLabel: string;
  busyAction: HomeBusyAction;
  canUndo: boolean;
  onAdd: () => void;
  onUndo: () => void;
};

export function HomeGlassActions({
  primaryLabel,
  busyAction,
  canUndo,
  onAdd,
  onUndo,
}: Props) {
  const { t } = useTranslation();
  const water = useWaterMaterial();
  const addBusy = busyAction === 'add';
  const undoBusy = busyAction === 'undo';

  return (
    <View style={styles.actions}>
      <Pressable
        role="button"
        accessibilityRole="button"
        accessibilityLabel={primaryLabel}
        accessibilityState={{ disabled: Boolean(busyAction), busy: addBusy }}
        disabled={Boolean(busyAction)}
        style={({ pressed }) => [
          styles.primaryBtn,
          canUndo && styles.primaryBtnWithUndo,
          { backgroundColor: water.waterDeep },
          pressed && !busyAction && styles.pressed,
          busyAction && styles.disabled,
        ]}
        onPress={onAdd}>
        <StrokedText
          type="smallBold"
          fill={water.onWater}
          outline={water.strokeOutline}
          outlineWidth={1.5}
          style={styles.primaryBtnLabel}>
          {primaryLabel}
        </StrokedText>
      </Pressable>

      {canUndo ? (
        <Pressable
          role="button"
          accessibilityRole="button"
          accessibilityLabel={t('home.undoGlass')}
          accessibilityState={{ disabled: Boolean(busyAction), busy: undoBusy }}
          disabled={Boolean(busyAction)}
          style={({ pressed }) => [
            styles.undoBtn,
            { backgroundColor: water.danger },
            pressed && !busyAction && styles.pressed,
            busyAction && styles.disabled,
          ]}
          onPress={onUndo}>
          <SymbolView
            name="arrow.uturn.backward"
            size={20}
            weight="semibold"
            tintColor={water.onWater}
            fallback={
              <ThemedText type="smallBold" style={{ color: water.onWater }}>
                ↩
              </ThemedText>
            }
          />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  primaryBtn: {
    flex: 1,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.three,
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    overflow: 'visible',
  },
  primaryBtnWithUndo: {
    flex: 5,
  },
  primaryBtnLabel: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
  },
  undoBtn: {
    flex: 1,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    minWidth: 48,
  },
  pressed: {
    opacity: 0.7,
  },
  disabled: {
    opacity: 0.5,
  },
});
