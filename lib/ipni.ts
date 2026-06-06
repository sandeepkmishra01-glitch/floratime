const IPNI_API = "https://www.ipni.org/api/1";

interface IPNIResult {
  id: string;
  name: string;
  authors: string;
  rank: string;
  family: string;
  genus: string;
  species: string;
  publication: string | null;
  publicationYear: number | null;
  inPowo: boolean;
}

interface IPNIResponse {
  totalResults: number;
  results: IPNIResult[];
}

/**
 * Enrich a species with IPNI (International Plant Names Index) data.
 * Returns nomenclatural info: family, genus, accepted status.
 */
export async function enrichWithIPNI(
  speciesName: string
): Promise<{
  family: string | null;
  genus: string | null;
  rank: string | null;
  inPowo: boolean | null;
} | null> {
  try {
    const res = await fetch(
      `${IPNI_API}/search?q=${encodeURIComponent(speciesName)}&limit=5`,
      { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
    );

    if (!res.ok) return null;

    const data: IPNIResponse = await res.json();
    if (!data.results?.length) return null;

    // Prefer the exact match
    const exact = data.results.find(
      (r) => r.name.toLowerCase() === speciesName.toLowerCase()
    );
    const r = exact || data.results[0];

    return {
      family: r.family || null,
      genus: r.genus || null,
      rank: r.rank || null,
      inPowo: r.inPowo ?? null,
    };
  } catch (error) {
    console.error(`IPNI enrichment failed for "${speciesName}":`, error);
    return null;
  }
}
