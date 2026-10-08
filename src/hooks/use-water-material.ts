import { WaterMaterial } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';

/** Home water-material tokens; expand-only — does not replace useTheme / Colors. */
export function useWaterMaterial() {
  const scheme = useColorScheme();
  const theme = scheme === 'dark' ? 'dark' : 'light';

  return WaterMaterial[theme];
}
