/** Детерминистички RNG (mulberry32), за серверот и клиентот да го измешаат декот исто при прво прикажување. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Нов случаен seed (по барање на серверот). */
export function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
