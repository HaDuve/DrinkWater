import { redirectAddGlassSystemPath } from '@/features/water/domain/add-glass-deep-link';

export function redirectSystemPath({ path }: { path: string; initial: boolean }) {
  return redirectAddGlassSystemPath(path);
}
