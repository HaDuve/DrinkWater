import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Vertical space to reserve above expo-router NativeTabs (react-native-screens bottom tabs).
 * Replaces a fixed guess: iOS tab bar is ~49pt plus home-indicator inset; Android uses Material
 * bottom nav height plus system/gesture insets.
 */
export function useTabBarBottomInset(): number {
  const insets = useSafeAreaInsets();
  if (Platform.OS === 'ios') {
    return 49 + insets.bottom;
  }
  if (Platform.OS === 'android') {
    return 56 + insets.bottom;
  }
  return Math.max(56, 56 + insets.bottom);
}
