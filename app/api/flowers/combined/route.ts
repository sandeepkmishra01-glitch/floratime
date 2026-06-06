import { NextRequest, NextResponse } from "next/server";
import { fetchFlowersWithCoords } from "@/lib/gbif";
import { fetchINatFlowers } from "@/lib/inaturalist";
import { FlowerData } from "@/types";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radius = parseFloat(searchParams.get("radius") || "20");
  const per_page = parseInt(searchParams.get("per_page") || "100");
  const month = searchParams.get("month")
    ? parseInt(searchParams.get("month")!)
    : undefined;

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: "lat and lng are required" },
      { status: 400 }
    );
  }

  const params = {
    lat,
    lng,
    radius: Math.min(radius, 50),
    per_page: Math.min(per_page, 100),
    month,
  };

  // Fetch from both sources in parallel
  const [gbifResult, inatResult] = await Promise.allSettled([
    fetchFlowersWithCoords(params),
    fetchINatFlowers(params),
  ]);

  const gbifFlowers = gbifResult.status === "fulfilled" ? gbifResult.value.flowers : [];
  const inatFlowers = inatResult.status === "fulfilled" ? inatResult.value.flowers : [];

  // Merge: keep GBIF first (has richer photo data), then iNaturalist
  const allFlowers: FlowerData[] = [...gbifFlowers, ...inatFlowers];

  // Deduplicate by species + lat/lng (fuzzy: same species within ~100m)
  const seen = new Set<string>();
  const deduped: FlowerData[] = [];

  for (const f of allFlowers) {
    const key = `${f.species}|${f.lat.toFixed(3)}|${f.lng.toFixed(3)}`;
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(f);
    }
  }

  const total = (gbifResult.status === "fulfilled" ? gbifResult.value.total : 0) +
                (inatResult.status === "fulfilled" ? inatResult.value.total : 0);

  return NextResponse.json({
    flowers: deduped,
    total,
    sourceCounts: {
      gbif: gbifFlowers.length,
      inaturalist: inatFlowers.length,
    },
  });
}
