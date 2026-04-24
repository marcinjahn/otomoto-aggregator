import type { Offer } from "./types";

const NEXT_DATA_RE = /<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/;

export interface ParsedPage {
  offers: Offer[];
  totalCount: number;
  pageSize: number;
  currentOffset: number;
}

interface RawAdvertSearch {
  totalCount: number;
  pageInfo: { pageSize: number; currentOffset: number };
  edges: Array<{ node: RawNode }>;
}

interface RawNode {
  id: string;
  title: string;
  shortDescription?: string | null;
  url: string;
  createdAt?: string | null;
  price?: {
    amount?: { units?: number; currencyCode?: string };
  } | null;
  location?: {
    city?: { name?: string } | null;
    region?: { name?: string } | null;
  } | null;
  thumbnail?: { x1?: string; x2?: string } | null;
  parameters?: Array<{
    key: string;
    label?: string;
    value: string;
    displayValue: string;
  }>;
}

export function parseSearchPage(html: string): ParsedPage {
  const m = NEXT_DATA_RE.exec(html);
  if (!m) throw new Error("__NEXT_DATA__ not found in page HTML");

  let root: unknown;
  try {
    root = JSON.parse(m[1]!);
  } catch (e) {
    throw new Error(
      "Failed to parse __NEXT_DATA__ JSON: " + (e as Error).message,
    );
  }

  const urqlState = (root as any)?.props?.pageProps?.urqlState;
  if (!urqlState || typeof urqlState !== "object") {
    throw new Error("urqlState missing from __NEXT_DATA__");
  }

  let advertSearch: RawAdvertSearch | null = null;
  for (const entry of Object.values(urqlState) as Array<{ data?: string }>) {
    const raw = entry?.data;
    if (typeof raw !== "string") continue;
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      continue;
    }
    if (parsed && parsed.advertSearch) {
      advertSearch = parsed.advertSearch as RawAdvertSearch;
      break;
    }
  }

  if (!advertSearch) {
    throw new Error("advertSearch payload not found in urqlState");
  }

  const offers = advertSearch.edges.map((e) => nodeToOffer(e.node));
  return {
    offers,
    totalCount: advertSearch.totalCount,
    pageSize: advertSearch.pageInfo.pageSize,
    currentOffset: advertSearch.pageInfo.currentOffset,
  };
}

function nodeToOffer(node: RawNode): Offer {
  const params = indexParams(node.parameters ?? []);
  const priceUnits = node.price?.amount?.units ?? null;
  const priceCurrency = node.price?.amount?.currencyCode ?? null;

  return {
    id: node.id,
    title: node.title,
    shortDescription: node.shortDescription ?? null,
    url: node.url,
    priceAmount: typeof priceUnits === "number" ? priceUnits : null,
    priceCurrency,
    city: node.location?.city?.name ?? null,
    region: node.location?.region?.name ?? null,
    thumbnailSmall: node.thumbnail?.x1 ?? null,
    thumbnailLarge: node.thumbnail?.x2 ?? null,
    make: params.get("make")?.value ?? null,
    makeDisplay: params.get("make")?.displayValue ?? null,
    model: params.get("model")?.value ?? null,
    modelDisplay: params.get("model")?.displayValue ?? null,
    year: toInt(params.get("year")?.value),
    fuelType: params.get("fuel_type")?.value ?? null,
    fuelTypeDisplay: params.get("fuel_type")?.displayValue ?? null,
    gearbox: params.get("gearbox")?.value ?? null,
    gearboxDisplay: params.get("gearbox")?.displayValue ?? null,
    mileageKm: toInt(params.get("mileage")?.value),
    engineCapacityCm3: toInt(params.get("engine_capacity")?.value),
    enginePowerHp: toInt(params.get("engine_power")?.value),
    createdAt: node.createdAt ?? null,
    generation: null,
    generationCode: null,
    generationStartYear: null,
  };
}

function indexParams(
  arr: Array<{ key: string; value: string; displayValue: string }>,
): Map<string, { value: string; displayValue: string }> {
  const m = new Map<string, { value: string; displayValue: string }>();
  for (const p of arr)
    m.set(p.key, { value: p.value, displayValue: p.displayValue });
  return m;
}

function toInt(v: string | undefined): number | null {
  if (v == null) return null;
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
}
