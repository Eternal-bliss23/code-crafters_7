export function newId(prefix = ''): string {
  const uuid =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return prefix ? `${prefix}_${uuid}` : uuid;
}

/** Deterministic 32-bit hash -> [0,1). Used to make the agreement simulation repeatable. */
export function hash01(seed: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 4294967296;
}

/** Deterministic gaussian-ish noise in [-1,1] from a string seed. */
export function seededNoise(seed: string): number {
  const a = hash01(seed + ':a');
  const b = hash01(seed + ':b');
  return (a + b) / 1 - 1;
}
