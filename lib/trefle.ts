const TREFLE_API = "https://trefle.io/api/v1";

interface TreflePlant {
  id: number;
  common_name: string | null;
  scientific_name: string;
  family: string | null;
  family_common_name: string | null;
  genus: string | null;
  image_url: string | null;
  year: number | null;
  author: string | null;
  bibliography: string | null;
  status: string | null; // "accepted", "synonym", etc.
  rank: string | null;
  synonyms: string[] | null;
}

interface TrefleResponse {
  data: TreflePlant[];
  meta?: { total: number };
}

/**
 * Enrich a species with Trefle plant database.
 * Returns common name, family, genus, image, status.
 */
export async function enrichWithTrefle(
  speciesName: string
): Promise<{
  commonName: string | null;
  family: string | null;
  familyCommonName: string | null;
  genus: string | null;
  imageUrl: string | null;
  status: string | null;
  year: number | null;
  author: string | null;
} | null> {
  const token = process.env.TREFLE_API_KEY;
  if (!token) {
    console.warn("TREFLE_API_KEY not set");
    return null;
  }

  try {
    const res = await fetch(
      `${TREFLE_API}/plants/search?q=${encodeURIComponent(speciesName)}&token=${token}&limit=3`,
      { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
    );

    if (!res.ok) {
      console.warn(`Trefle API error: ${res.status}`);
      return null;
    }

    const data: TrefleResponse = await res.json();
    if (!data.data?.length) return null;

    // Prefer exact scientific name match
    const exact = data.data.find(
      (p) => p.scientific_name?.toLowerCase() === speciesName.toLowerCase()
    );
    const p = exact || data.data[0];

    return {
      commonName: p.common_name || null,
      family: p.family || null,
      familyCommonName: p.family_common_name || null,
      genus: p.genus || null,
      imageUrl: p.image_url || null,
      status: p.status || null,
      year: p.year || null,
      author: p.author || null,
    };
  } catch (error) {
    console.error(`Trefle enrichment failed for "${speciesName}":`, error);
    return null;
  }
}
