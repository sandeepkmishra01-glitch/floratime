import { WikiSpeciesInfo } from "@/types";

const WIKIDATA_API = "https://www.wikidata.org/w/api.php";
const COMMONS_FILE_URL = "https://commons.wikimedia.org/wiki/Special:FilePath";

interface WDEntity {
  id: string;
  labels?: Record<string, { value: string }>;
  descriptions?: Record<string, { value: string }>;
  claims?: Record<string, WDClaim[]>;
  sitelinks?: Record<string, { title: string }>;
}

interface WDClaim {
  mainsnak?: {
    datavalue?: {
      value: string | { id: string; text?: string };
    };
  };
  qualifiers?: Record<string, WDQualifier[]>;
}

interface WDQualifier {
  datavalue?: {
    value: string;
  };
}

/**
 * Search Wikidata for a species by scientific name.
 * Returns the best-match QID or null.
 */
async function searchSpecies(speciesName: string): Promise<string | null> {
  const params = new URLSearchParams({
    action: "wbsearchentities",
    search: speciesName,
    language: "en",
    type: "item",
    format: "json",
    limit: "3",
  });

  const res = await fetch(`${WIKIDATA_API}?${params}`, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 }, // Cache species lookups for 24h
  });

  if (!res.ok) return null;

  const data = await res.json();
  const results = data.search || [];

  // Pick the first result that looks like a biological taxon
  // (taxon items typically have instance-of (P31) = taxon (Q16521))
  for (const r of results) {
    // Simple heuristic: prefer results with "species" or genus name format
    if (r.label && r.description) {
      return r.id;
    }
  }

  return results[0]?.id || null;
}

/**
 * Get entity data for a Wikidata QID.
 */
async function getEntity(qid: string): Promise<WDEntity | null> {
  const url = `https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 86400 },
  });

  if (!res.ok) return null;
  const data = await res.json();
  return data.entities?.[qid] || null;
}

/**
 * Get a Wikimedia Commons image URL from a filename.
 */
function commonsImageUrl(filename: string, width = 500): string {
  const encoded = encodeURIComponent(filename.replace(/^File:/, ""));
  return `${COMMONS_FILE_URL}/${encoded}?width=${width}`;
}

/**
 * Parse Wikidata claims to extract a WikiSpeciesInfo object.
 */
function parseEntity(entity: WDEntity, _qid: string): WikiSpeciesInfo {
  const claims = entity.claims || {};

  // Common name (P1843 — taxon common name)
  const commonNameClaim = claims.P1843?.[0];
  const commonName =
    (commonNameClaim?.mainsnak?.datavalue?.value as string) || null;

  // English description
  const description =
    entity.descriptions?.en?.value || null;

  // Image (P18)
  const imageClaim = claims.P18?.[0];
  const imageFilename = imageClaim?.mainsnak?.datavalue?.value as string;
  const imageUrl = imageFilename ? commonsImageUrl(imageFilename) : null;

  // Wikipedia URL from sitelinks
  const enwiki = entity.sitelinks?.enwiki;
  const wikiUrl = enwiki
    ? `https://en.wikipedia.org/wiki/${encodeURIComponent(enwiki.title.replace(/ /g, "_"))}`
    : null;

  // Bloom months (qualifier on taxon range? — we use P2924: "flower color" is less useful)
  // Many plants on Wikidata don't have structured bloom month data.
  // We'll fall back to approximate bloom data later if needed.
  const bloomMonths: number[] | null = null;

  return {
    commonName,
    description,
    imageUrl,
    imageAttribution: imageFilename
      ? `Wikimedia Commons / ${imageFilename.replace(/^File:/, "")}`
      : null,
    wikiUrl,
    bloomMonths,
  };
}

/**
 * Enrich a flower's data with Wikidata info.
 * Returns updated info or null on failure.
 */
export async function enrichSpecies(
  speciesName: string
): Promise<WikiSpeciesInfo | null> {
  try {
    const qid = await searchSpecies(speciesName);
    if (!qid) return null;

    const entity = await getEntity(qid);
    if (!entity) return null;

    return parseEntity(entity, qid);
  } catch (error) {
    console.error(`Wikidata enrichment failed for "${speciesName}":`, error);
    return null;
  }
}

/**
 * Batch-enrich multiple species names.
 * Returns a map of species name → WikiSpeciesInfo.
 */
export async function enrichSpeciesBatch(
  speciesNames: string[]
): Promise<Map<string, WikiSpeciesInfo | null>> {
  const results = new Map<string, WikiSpeciesInfo | null>();

  // Process sequentially with delay to respect Wikidata rate limits
  // Wikidata allows ~5 req/s for anonymous access
  for (let i = 0; i < speciesNames.length; i++) {
    const name = speciesNames[i];
    try {
      const info = await enrichSpecies(name);
      results.set(name, info);
    } catch {
      results.set(name, null);
    }

    // Rate limit: ~300ms between requests (3/s, well within limits)
    if (i < speciesNames.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  return results;
}
