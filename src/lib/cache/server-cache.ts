type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type GlobalWithServerCache = typeof globalThis & {
  __mxServerCache?: Map<string, CacheEntry<unknown>>;
  __mxServerCacheInflight?: Map<string, Promise<unknown>>;
};

const globalScope = globalThis as GlobalWithServerCache;
const cacheStore = globalScope.__mxServerCache ?? new Map<string, CacheEntry<unknown>>();
const inflightStore = globalScope.__mxServerCacheInflight ?? new Map<string, Promise<unknown>>();
globalScope.__mxServerCache = cacheStore;
globalScope.__mxServerCacheInflight = inflightStore;

export async function getOrSetServerCache<T>(params: {
  key: string;
  ttlMs: number;
  loader: () => Promise<T>;
}): Promise<T> {
  const now = Date.now();
  const ttlMs = Math.max(500, Math.floor(params.ttlMs));

  const cached = cacheStore.get(params.key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const inflight = inflightStore.get(params.key);
  if (inflight) {
    return inflight as Promise<T>;
  }

  const loadPromise = params
    .loader()
    .then((value) => {
      cacheStore.set(params.key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
      return value;
    })
    .finally(() => {
      inflightStore.delete(params.key);
    });

  inflightStore.set(params.key, loadPromise as Promise<unknown>);
  return loadPromise;
}

export function clearServerCacheByPrefix(prefix: string) {
  for (const key of cacheStore.keys()) {
    if (key.startsWith(prefix)) {
      cacheStore.delete(key);
    }
  }

  for (const key of inflightStore.keys()) {
    if (key.startsWith(prefix)) {
      inflightStore.delete(key);
    }
  }
}
