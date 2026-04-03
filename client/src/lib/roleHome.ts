import type { AppRole } from '../api/api';

/** После входа — на dashboard своей роли. */
export function homePathForRole(_role: AppRole): string {
  return '/dashboard';
}
