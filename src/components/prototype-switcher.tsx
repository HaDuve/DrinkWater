/**
 * PROTOTYPE — throwaway UI variant switcher. Dev-only; never ship to production.
 */
import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export type PrototypeVariant = {
  key: string;
  name: string;
};

type Props = {
  variants: PrototypeVariant[];
  currentKey: string;
  onVariantChange: (key: string) => void;
};

export function PrototypeSwitcher({ variants, currentKey, onVariantChange }: Props) {
  const currentIndex = Math.max(
    0,
    variants.findIndex((variant) => variant.key === currentKey),
  );
  const current = variants[currentIndex] ?? variants[0];

  const goToIndex = (nextIndex: number) => {
    const variant = variants[nextIndex];
    if (!variant) return;
    onVariantChange(variant.key);
  };

  useEffect(() => {
    if (!__DEV__) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToIndex((currentIndex - 1 + variants.length) % variants.length);
      }
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToIndex((currentIndex + 1) % variants.length);
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', onKeyDown);
      return () => window.removeEventListener('keydown', onKeyDown);
    }
  }, [currentIndex, variants]);

  if (!__DEV__) return null;

  return (
    <View style={styles.bar} pointerEvents="box-none">
      <Pressable
        accessibilityLabel="Previous prototype variant"
        onPress={() => goToIndex((currentIndex - 1 + variants.length) % variants.length)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>←</Text>
      </Pressable>
      <Text style={styles.label}>
        {current.key} — {current.name}
      </Text>
      <Pressable
        accessibilityLabel="Next prototype variant"
        onPress={() => goToIndex((currentIndex + 1) % variants.length)}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <Text style={styles.buttonText}>→</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#F59E0B',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    zIndex: 1000,
  },
  button: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#1F2937',
  },
  buttonText: {
    color: '#F9FAFB',
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    flexShrink: 1,
    color: '#FDE68A',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
