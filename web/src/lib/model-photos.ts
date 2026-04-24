const CACHE_KEY = "otomoto-agg:model-photos:v3";
const NEGATIVE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const POSITIVE_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface CacheEntry {
  url: string | null;
  at: number;
}

const memory = new Map<string, Promise<string | null>>();

function cacheKey(make: string, model: string, year: number | null): string {
  return `${make.toLowerCase()}/${model.toLowerCase()}/${year ?? ""}`;
}

function loadPersistent(): Record<string, CacheEntry> {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, CacheEntry>) : {};
  } catch {
    return {};
  }
}

function savePersistent(all: Record<string, CacheEntry>) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(all));
  } catch {
    /* quota / unavailable */
  }
}

function readCache(key: string): string | null | undefined {
  const all = loadPersistent();
  const entry = all[key];
  if (!entry) return undefined;
  const ttl = entry.url ? POSITIVE_TTL_MS : NEGATIVE_TTL_MS;
  if (Date.now() - entry.at > ttl) return undefined;
  return entry.url;
}

function writeCache(key: string, url: string | null) {
  const all = loadPersistent();
  all[key] = { url, at: Date.now() };
  savePersistent(all);
}

async function queryWikipedia(
  make: string,
  model: string,
  year: number | null,
): Promise<string | null> {
  const search = year ? `${make} ${model} ${year} car` : `${make} ${model} car`;
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "query");
  url.searchParams.set("format", "json");
  url.searchParams.set("formatversion", "2");
  url.searchParams.set("generator", "search");
  url.searchParams.set("gsrsearch", search);
  url.searchParams.set("gsrlimit", "1");
  url.searchParams.set("prop", "pageimages");
  url.searchParams.set("piprop", "thumbnail");
  url.searchParams.set("pithumbsize", "900");
  url.searchParams.set("origin", "*");

  const res = await fetch(url.toString());
  if (!res.ok) return null;
  const data = (await res.json()) as {
    query?: {
      pages?: Array<{
        thumbnail?: { source?: string };
      }>;
    };
  };
  const page = data.query?.pages?.[0];
  return page?.thumbnail?.source ?? null;
}

export function getModelPhoto(
  make: string,
  model: string,
  year: number | null = null,
): Promise<string | null> {
  const key = cacheKey(make, model, year);
  const existing = memory.get(key);
  if (existing) return existing;

  const cached = readCache(key);
  if (cached !== undefined) {
    const p = Promise.resolve(cached);
    memory.set(key, p);
    return p;
  }

  const p = queryWikipedia(make, model, year)
    .catch(() => null)
    .then((url) => {
      writeCache(key, url);
      return url;
    });
  memory.set(key, p);
  return p;
}
