import { NextRequest, NextResponse } from "next/server";
import { enrichWithWikipedia } from "@/lib/wikipedia";
import { enrichWithGBIFSpecies } from "@/lib/gbif-species";
import { enrichSpecies } from "@/lib/wikidata";
import { enrichWithPOWO } from "@/lib/powo";
import { enrichWithTrefle } from "@/lib/trefle";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    // Fetch all enrichment sources in parallel
    const [wiki, gbifSpecies, wikidata, powo, trefle] = await Promise.allSettled([
      enrichWithWikipedia(name),
      enrichWithGBIFSpecies(name),
      enrichSpecies(name),
      enrichWithPOWO(name),
      enrichWithTrefle(name),
    ]);

    const wikiResult = wiki.status === "fulfilled" ? wiki.value : null;
    const gbifResult = gbifSpecies.status === "fulfilled" ? gbifSpecies.value : null;
    const wikidataResult = wikidata.status === "fulfilled" ? wikidata.value : null;
    const powoResult = powo.status === "fulfilled" ? powo.value : null;
    const trefleResult = trefle.status === "fulfilled" ? trefle.value : null;

    return NextResponse.json({
      speciesName: name,
      // Wikipedia
      wikiSummary: wikiResult?.wikiSummary || null,
      wikiUrl: wikiResult?.wikiUrl || null,
      thumbnail: wikiResult?.thumbnail || null,
      // GBIF species
      family: gbifResult?.family || powoResult?.family || trefleResult?.family || null,
      genus: gbifResult?.genus || powoResult?.genus || trefleResult?.genus || null,
      taxonomicStatus:
        gbifResult?.taxonomicStatus ||
        powoResult?.taxonomicStatus ||
        null,
      // POWO / Kew
      kewFamily: powoResult?.family || null,
      kewGenus: powoResult?.genus || null,
      kewNomenclaturalStatus: powoResult?.nomenclaturalStatus || null,
      kewLifeform: powoResult?.lifeform || null,
      kewClimate: powoResult?.climate || null,
      kewLocationCount: powoResult?.locationCount || null,
      kewSynonymCount: powoResult?.synonymCount || null,
      // Trefle
      trefleCommonName: trefleResult?.commonName || null,
      trefleFamilyCommon: trefleResult?.familyCommonName || null,
      trefleImageUrl: trefleResult?.imageUrl || null,
      trefleStatus: trefleResult?.status || null,
      trefleYear: trefleResult?.year || null,
      trefleAuthor: trefleResult?.author || null,
      // Wikidata
      commonName: wikidataResult?.commonName || trefleResult?.commonName || null,
      description: wikidataResult?.description || null,
      conservationStatus: wikidataResult?.conservationStatus || null,
      wikiUrlWikidata: wikidataResult?.wikiUrl || null,
      invasive: wikidataResult?.invasive || null,
      toxic: wikidataResult?.toxic || null,
    });
  } catch (error) {
    console.error("Species enrichment failed:", error);
    return NextResponse.json(null);
  }
}
