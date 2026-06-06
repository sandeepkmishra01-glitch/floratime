const POWO_API = "https://powo.science.kew.org/api/2";

interface POWOTaxon {
  name: string;
  family: string;
  genus: string;
  species: string;
  rank: string;
  taxonomicStatus: string | null;
  nomenclaturalStatus: string | null;
  lifeform: string | null;
  climate: string | null;
  locations: any[];
  synonyms: any[];
}

/**
 * Look up a taxon in POWO (Plants of the World Online) via its IPNI fqId.
 * First search IPNI for the fqId, then look up the full POWO record.
 */
export async function enrichWithPOWO(
  speciesName: string
): Promise<{
  family: string | null;
  genus: string | null;
  taxonomicStatus: string | null;
  nomenclaturalStatus: string | null;
  lifeform: string | null;
  climate: string | null;
  locationCount: number | null;
  synonymCount: number | null;
} | null> {
  try {
    // Step 1: Search IPNI for the fqId
    const ipniRes = await fetch(
      `https://www.ipni.org/api/1/search?q=${encodeURIComponent(speciesName)}&limit=5`,
      { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
    );

    if (!ipniRes.ok) return null;
    const ipniData = await ipniRes.json();
    if (!ipniData.results?.length) return null;

    // Prefer exact match with inPowo=true
    const exact = ipniData.results.find(
      (r: any) =>
        r.name?.toLowerCase() === speciesName.toLowerCase() && r.inPowo
    );
    const best = exact || ipniData.results.find((r: any) => r.inPowo) || ipniData.results[0];

    if (!best.fqId || !best.inPowo) {
      // IPNI has the data, no POWO lookup needed
      return {
        family: best.family || null,
        genus: best.genus || null,
        taxonomicStatus: null,
        nomenclaturalStatus: null,
        lifeform: null,
        climate: null,
        locationCount: null,
        synonymCount: null,
      };
    }

    // Step 2: Look up the full POWO record
    const powoRes = await fetch(
      `${POWO_API}/taxon/${encodeURIComponent(best.fqId)}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
    );

    if (!powoRes.ok) {
      // Fall back to IPNI data
      return {
        family: best.family || null,
        genus: best.genus || null,
        taxonomicStatus: null,
        nomenclaturalStatus: null,
        lifeform: null,
        climate: null,
        locationCount: null,
        synonymCount: null,
      };
    }

    const powo: POWOTaxon = await powoRes.json();

    return {
      family: powo.family || best.family || null,
      genus: powo.genus || best.genus || null,
      taxonomicStatus: powo.taxonomicStatus || null,
      nomenclaturalStatus: powo.nomenclaturalStatus || null,
      lifeform: powo.lifeform || null,
      climate: powo.climate || null,
      locationCount: powo.locations?.length || null,
      synonymCount: powo.synonyms?.length || null,
    };
  } catch (error) {
    console.error(`POWO enrichment failed for "${speciesName}":`, error);
    return null;
  }
}
