import { NextRequest, NextResponse } from "next/server";
import { fetchFlowersWithCoords } from "@/lib/gbif";
import { enrichSpeciesBatch } from "@/lib/wikidata";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = parseFloat(searchParams.get("radius") || "20");
  const per_page = parseInt(searchParams.get("per_page") || "50");
  const month = searchParams.get("month")
    ? parseInt(searchParams.get("month")!)
    : undefined;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const result = await fetchFlowersWithCoords({
    lat,
    lng,
    radius: Math.min(radius, 50),
    per_page: Math.min(per_page, 100),
    month,
  });

  // Enrich with Wikidata (species info, photos, Wikipedia links)
  if (result.flowers.length > 0) {
    const speciesNames = [
      ...new Set(result.flowers.map((f) => f.species)),
    ];
    const enriched = await enrichSpeciesBatch(speciesNames);

    for (const flower of result.flowers) {
      const info = enriched.get(flower.species);
      if (info) {
        // Prefer Wikidata data, fall back to GBIF
        flower.commonName = info.commonName || flower.commonName;
        flower.wikiUrl = info.wikiUrl || flower.wikiUrl;
        flower.description = info.description || flower.description;
        // Use Wikidata image only if GBIF didn't have one
        if (!flower.photoUrl && info.imageUrl) {
          flower.photoUrl = info.imageUrl;
          flower.photoAttribution = info.imageAttribution;
        }
      }
    }
  }

  return NextResponse.json(result);
}
