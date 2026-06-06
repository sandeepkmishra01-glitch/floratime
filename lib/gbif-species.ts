const GBIF_SPECIES_API = "https://api.gbif.org/v1/species";

interface GBIFSpeciesResult {
  key: number;
  scientificName: string;
  canonicalName: string;
  kingdom: string;
  phylum: string;
  class: string;
  order: string;
  family: string;
  genus: string;
  species: string;
  taxonomicStatus: string;
  rank: string;
}

interface GBIFSpeciesResponse {
  results: GBIFSpeciesResult[];
}

/**
 * Search GBIF Species API for taxonomy info about a species.
 * Returns family, genus, taxonomic status.
 */
export async function enrichWithGBIFSpecies(
  speciesName: string
): Promise<{
  family: string | null;
  genus: string | null;
  taxonomicStatus: string | null;
} | null> {
  try {
    const params = new URLSearchParams({
      q: speciesName,
      limit: "1",
      rank: "SPECIES",
    });

    const res = await fetch(`${GBIF_SPECIES_API}/search?${params.toString()}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    });

    if (!res.ok) return null;

    const data: GBIFSpeciesResponse = await res.json();
    const r = data.results?.[0];
    if (!r) return null;

    return {
      family: r.family || null,
      genus: r.genus || null,
      taxonomicStatus: r.taxonomicStatus || null,
    };
  } catch (error) {
    console.error(`GBIF species enrichment failed for "${speciesName}":`, error);
    return null;
  }
}

/**
 * Batch enrich multiple species names (parallel).
 */
export async function enrichSpeciesBatch(
  speciesNames: string[]
): Promise<Map<string, { family: string | null; genus: string | null; taxonomicStatus: string | null } | null>> {
  const results = new Map<string, any>();
  const entries = await Promise.allSettled(
    speciesNames.map((name) => enrichWithGBIFSpecies(name))
  );
  speciesNames.forEach((name, i) => {
    results.set(name, entries[i].status === "fulfilled" ? entries[i].value : null);
  });
  return results;
}
