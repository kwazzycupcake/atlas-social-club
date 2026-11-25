// Small per-device conveniences (last chosen region, difficulty…).
// Always optional: if storage is blocked we just use the defaults.
export function loadPref<T>(key: string, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(`atlas-social-club:pref:${key}`);
    if (raw === null) return fallback;
    const v = JSON.parse(raw) as unknown;
    return valid(v) ? v : fallback;
  } catch {
    return fallback;
  }
}

export function savePref(key: string, value: unknown) {
  try {
    localStorage.setItem(`atlas-social-club:pref:${key}`, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}
