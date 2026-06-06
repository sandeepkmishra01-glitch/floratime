import { NextRequest, NextResponse } from "next/server";

interface AreaResult {
  name: string;
  type: string;
  protected: boolean;
  displayName: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    // First: query Overpass for nearby parks/nature areas (most reliable)
    const overpassQuery = `[out:json];
      (
        way(around:3000,${lat},${lng})[leisure~"park|nature_reserve|garden|dog_park"][name];
        relation(around:3000,${lat},${lng})[leisure~"park|nature_reserve|garden"][name];
        way(around:3000,${lat},${lng})[boundary~"protected_area|national_park"][name];
        relation(around:3000,${lat},${lng})[boundary~"protected_area|national_park"][name];
        way(around:3000,${lat},${lng})[natural~"wood|scrub|heath"][name];
      );
      out tags 5;`;

    const overpassRes = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": "FloraTime/1.0" },
      body: overpassQuery,
    });

    if (overpassRes.ok) {
      const data = await overpassRes.json();
      const elements = (data.elements || []) as any[];

      if (elements.length > 0) {
        // Pick the closest named park/nature area
        const best = elements[0];
        const tags = best.tags || {};
        const isProtected =
          tags.boundary === "protected_area" ||
          tags.boundary === "national_park" ||
          tags.leisure === "nature_reserve" ||
          tags.protect_class !== undefined;

        const typeMap: Record<string, string> = {
          park: "Park", nature_reserve: "Nature Reserve", garden: "Garden",
          dog_park: "Dog Park", protected_area: "Protected Area",
          national_park: "National Park", wood: "Woodland",
          scrub: "Scrubland", heath: "Heathland",
        };

        const areaType = typeMap[tags.leisure || tags.boundary || tags.natural || ""] || "Natural Area";

        const nearbyNames = elements.slice(1, 4)
          .map((e: any) => e.tags?.name)
          .filter(Boolean);

        const result: AreaResult = {
          name: tags.name || "Natural Area",
          type: areaType,
          protected: isProtected,
          displayName: [
            areaType,
            isProtected ? "Protected" : null,
            tags.access === "yes" ? "Public access" : null,
            tags.opening_hours ? `Hours: ${tags.opening_hours}` : null,
            nearbyNames.length > 0 ? `Near: ${nearbyNames.join(", ")}` : null,
          ].filter(Boolean).join(" · "),
        };

        return NextResponse.json(result);
      }
    }

    // Fallback: Nominatim reverse geocode, but skip administrative boundaries
    const nomRes = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=14&addressdetails=0`,
      { headers: { "User-Agent": "FloraTime/1.0" } }
    );

    if (nomRes.ok) {
      const nomData = await nomRes.json();
      // Skip if it's an administrative boundary or generic road/place
      const skipTypes = ["administrative", "road", "house", "building", "postcode"];
      if (nomData.category && !skipTypes.includes(nomData.category)) {
        return NextResponse.json({
          name: nomData.name || nomData.display_name?.split(",")[0] || "Unknown",
          type: (nomData.category || nomData.type || "area").replace(/_/g, " "),
          protected: false,
          displayName: nomData.display_name || "",
        } as AreaResult);
      }
    }

    return NextResponse.json(null);
  } catch (error) {
    console.error("Area info fetch failed:", error);
    return NextResponse.json(null);
  }
}
