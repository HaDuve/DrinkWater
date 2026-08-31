import { setIntakeMl } from '@/lib/storage';

/** Seeds on-device state for App Store screenshot captures (home screen progress). */
export async function applyScreenshotDemoState(): Promise<void> {
  await setIntakeMl(1500);
}
