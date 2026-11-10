/**
 * Keys that belong to the signed-in user must start with this prefix so sign-out can wipe them.
 * Device preferences (swipex_lang, swipex_theme) deliberately do NOT use it and survive sign-out.
 */
export const USER_KEY_PREFIX = 'swipex:u:';

export function clearUserScopedKeys(): void {
  try {
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (key && key.startsWith(USER_KEY_PREFIX)) toRemove.push(key);
    }
    toRemove.forEach((key) => localStorage.removeItem(key));
  } catch {
    /* storage unavailable */
  }
}
