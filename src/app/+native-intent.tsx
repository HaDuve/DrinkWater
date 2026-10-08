import { redirectAddGlassSystemPath } from '@/features/water/domain/add-glass-deep-link';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  try {
    return redirectAddGlassSystemPath(path);
  } catch {
    return '/';
  }
}
