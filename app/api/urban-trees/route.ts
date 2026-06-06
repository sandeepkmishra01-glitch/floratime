import { NextRequest, NextResponse } from "next/server";

interface UrbanTree {
  id: number;
  lat: number;
  lng: number;
  species: string;
  commonName: string | null;
  genus: string | null;
  condition: string | null;
  dbh: number | null;
  ward: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "500";

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    const query = `[out:json];node["natural"="tree"](around:${radius},${lat},${lng});out 100;`;
    const res = await fetch("https://z.overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": "FloraTime/1.0" },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!res.ok) {
      console.error(`Overpass API error: ${res.status}`);
      return NextResponse.json({ trees: [], total: 0 });
    }

    const data = await res.json();
    const elements = data.elements || [];

    const trees: UrbanTree[] = elements.map((el: any) => {
      const tags = el.tags || {};
      // Parse circumference to DBH (approximate: circ = π × dbh)
      let dbh: number | null = null;
      if (tags.circumference) {
        const circ = parseFloat(tags.circumference);
        if (!isNaN(circ)) dbh = Math.round((circ / Math.PI) * 10) / 10;
      }
      if (tags.diameter_crown) {
        const d = parseFloat(tags.diameter_crown);
        if (!isNaN(d)) dbh = d;
      }

      return {
        id: el.id,
        lat: el.lat,
        lng: el.lon,
        species: tags.species || tags.genus || tags.taxon || "Unknown",
        commonName: tags.species_en || tags.name || null,
        genus: tags.genus || null,
        condition: tags.health || tags.condition || null,
        dbh,
        ward: tags.operator || tags.ref || null,
      };
    });

    return NextResponse.json({ trees, total: trees.length });
  } catch (error) {
    console.error("Urban trees fetch failed:", error);
    return NextResponse.json({ trees: [], total: 0 });
  }
}
