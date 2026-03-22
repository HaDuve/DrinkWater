import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { WaterProgressRing } from '@/components/water-progress-ring';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTabBarBottomInset } from '@/hooks/use-tab-bar-bottom-inset';
import type { WaterSettings } from '@/lib/storage';
import { addGlassAmount, loadWaterState, removeGlassAmount } from '@/lib/storage';

export default function HomeScreen() {
  const tabBarBottomInset = useTabBarBottomInset();
  const [state, setState] = useState<WaterSettings | null>(null);

  const refresh = useCallback(() => {
    void loadWaterState().then(setState);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh]),
  );

  if (!state) {
    return (
      <ThemedView style={styles.container}>
        <SafeAreaView style={styles.loadingSafe} edges={['top', 'left', 'right']}>
          <ActivityIndicator size="large" />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const progress = state.goalMl > 0 ? state.intakeMl / state.goalMl : 0;

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView
        style={[styles.safeArea, { paddingBottom: tabBarBottomInset + Spacing.three }]}
        edges={['top', 'left', 'right']}>
        <ThemedText type="title" style={styles.title}>
          DrinkWater
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.subtitle}>
          Today&apos;s progress
        </ThemedText>

        <WaterProgressRing
          progress={progress}
          centerLabel={`${state.intakeMl} / ${state.goalMl} ml`}
          sublabel={progress >= 1 ? 'Goal reached!' : `${Math.round((1 - progress) * 100)}% to go`}
        />

        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() => {
              void (async () => {
                await addGlassAmount(state.glassMl);
                refresh();
              })();
            }}>
            <ThemedText type="smallBold" style={styles.btnLightText}>
              + Glass ({state.glassMl} ml)
            </ThemedText>
          </Pressable>

          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            onPress={() => {
              void (async () => {
                await removeGlassAmount(state.glassMl);
                refresh();
              })();
            }}>
            <ThemedText type="smallBold">Undo glass</ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  loadingSafe: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  safeArea: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    gap: Spacing.three,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    marginTop: Spacing.two,
  },
  subtitle: {
    marginBottom: Spacing.two,
  },
  actions: {
    gap: Spacing.two,
    alignSelf: 'stretch',
    marginTop: Spacing.four,
  },
  primaryBtn: {
    backgroundColor: '#208AEF',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    paddingVertical: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#208AEF',
  },
  btnLightText: {
    color: '#ffffff',
  },
  pressed: {
    opacity: 0.85,
  },
});
