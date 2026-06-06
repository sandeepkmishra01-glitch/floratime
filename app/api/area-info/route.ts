import { NextRequest, NextResponse } from "next/server";

interface AreaResult {
  name: string;
  type: string;
  protected: boolean;
  displayName: string;
}

const PROTECTED_TYPES = new Set([
  "national_park", "nature_reserve", "protected_area", "park",
  "conservation", "wilderness", "wildlife_refuge", "state_park",
  "county_park", "regional_park", "forest", "recreation_ground",
]);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    // Reverse geocode using Nominatim to find area features
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=12&addressdetails=0`,
      { headers: { "User-Agent": "FloraTime/1.0" } }
    );

    if (!res.ok) {
      return NextResponse.json(null);
    }

    const data = await res.json();
    const osmType = data.osm_type;
    const osmId = data.osm_id;

    if (!osmType || !osmId) {
      return NextResponse.json(null);
    }

    // Fetch detailed tags from OSM
    const detailRes = await fetch(
      `https://nominatim.openstreetmap.org/lookup?osm_ids=${osmType[0].toUpperCase()}${osmId}&format=json&addressdetails=0&extratags=1`,
      { headers: { "User-Agent": "FloraTime/1.0" } }
    );

    if (!detailRes.ok) {
      return NextResponse.json({
        name: data.name || data.display_name?.split(",")[0] || "Unknown area",
        type: data.category || data.type || "area",
        protected: false,
        displayName: data.display_name || "",
      } as AreaResult);
    }

    const details = await detailRes.json();
    const item = details[0] || {};
    const extratags = item.extratags || {};
    const tags = {
      leisure: extratags.leisure || item.type || "",
      boundary: extratags.boundary || "",
      protect_class: extratags.protect_class || "",
      access: extratags.access || "",
      opening_hours: extratags.opening_hours || "",
    };

    const isProtected = PROTECTED_TYPES.has(tags.leisure) ||
      tags.boundary === "protected_area" ||
      tags.boundary === "national_park" ||
      !!tags.protect_class;

    const areaType = tags.leisure ||
      tags.boundary?.replace(/_/g, " ") ||
      item.type ||
      data.category ||
      "area";

    // Get also nearby parks via a separate query
    const nearbyRes = await fetch(
      `https://overpass-api.de/api/interpreter`,
      {
        method: "POST",
        headers: { "User-Agent": "FloraTime/1.0" },
        body: `[out:json];(way(around:2000,${lat},${lng})[leisure~"park|nature_reserve|garden"];relation(around:2000,${lat},${lng})[leisure~"park|nature_reserve|garden"];);out tags 3;`,
      }
    );

    let nearbyParks: string[] = [];
    if (nearbyRes.ok) {
      const nearbyData = await nearbyRes.json();
      nearbyParks = (nearbyData.elements || [])
        .map((e: any) => e.tags?.name)
        .filter(Boolean)
        .slice(0, 3);
    }

    const result: AreaResult = {
      name: item.name || data.name || data.display_name?.split(",")[0] || "Unknown area",
      type: areaType.charAt(0).toUpperCase() + areaType.slice(1),
      protected: isProtected,
      displayName: [
        item.name || data.name,
        nearbyParks.length > 0 ? `Near: ${nearbyParks.join(", ")}` : null,
        tags.access === "yes" ? "Public access" : tags.access === "no" ? "Restricted" : null,
        tags.opening_hours ? `Hours: ${tags.opening_hours}` : null,
      ].filter(Boolean).join(" · "),
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("Area info fetch failed:", error);
    return NextResponse.json(null);
  }
}
