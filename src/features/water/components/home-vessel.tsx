import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { WaterLiquidVessel } from '@/components/water-liquid-vessel';
import { WaterProgressRing } from '@/components/water-progress-ring';
import type { HomeBusyAction } from '@/features/water/domain/home-center-layout';
import { pickHomeVesselKind } from '@/features/water/domain/home-vessel-kind';
import type { WaterSettings } from '@/lib/storage';

type Props = {
  state: WaterSettings;
  progress: number;
  vesselSublabel: string;
  busyAction: HomeBusyAction;
  size: number;
};

export function HomeVessel({ state, progress, vesselSublabel, busyAction, size }: Props) {
  const { t } = useTranslation();

  return (
    <View style={styles.hero}>
      {pickHomeVesselKind(state.animationsEnabled) === 'liquid' ? (
        <WaterLiquidVessel
          intakeMl={state.intakeMl}
          goalMl={state.goalMl}
          busyAction={busyAction}
          size={size}
          intakeLine={t('home.intakeGoalTop', { intake: state.intakeMl })}
          goalLine={t('home.intakeGoalBottom', { goal: state.goalMl })}
          sublabel={vesselSublabel}
        />
      ) : (
        <WaterProgressRing
          progress={progress}
          size={size}
          intakeLine={t('home.intakeGoalTop', { intake: state.intakeMl })}
          goalLine={t('home.intakeGoalBottom', { goal: state.goalMl })}
          sublabel={vesselSublabel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
