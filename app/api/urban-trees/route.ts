import { NextRequest, NextResponse } from "next/server";

interface UrbanTree {
  id: number;
  lat: number;
  lng: number;
  species: string;
  commonName: string | null;
  genus: string | null;
  condition: string | null;
  dbh: number | null; // diameter at breast height (inches)
  ward: string | null;
}

// DC Urban Forestry Street Trees — ArcGIS REST endpoint
const DC_TREES_URL =
  "https://maps2.dcgis.dc.gov/dcgis/rest/services/DDOT/UrbanForestry/MapServer/0/query";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const radius = searchParams.get("radius") || "500"; // meters

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    // ArcGIS query with geometry filter (buffer around point)
    const geom = `{"x":${lng},"y":${lat},"spatialReference":{"wkid":4326}}`;
    const params = new URLSearchParams({
      f: "json",
      where: "1=1",
      outFields: "OBJECTID,SCI_NAME,CMMN_NM,GENUS_NAME,CONDITION,DBH,WARD,LATITUDE,LONGITUDE",
      geometry: geom,
      geometryType: "esriGeometryPoint",
      spatialRel: "esriSpatialRelIntersects",
      distance: radius,
      units: "esriSRUnit_Meter",
      returnGeometry: "false",
      outSR: "4326",
      resultRecordCount: "100",
    });

    const res = await fetch(`${DC_TREES_URL}?${params.toString()}`);
    if (!res.ok) {
      console.error(`DC Trees API error: ${res.status}`);
      return NextResponse.json({ trees: [], total: 0 });
    }

    const data = await res.json();
    const features = data.features || [];

    const trees: UrbanTree[] = features.map((f: any) => {
      const attrs = f.attributes || {};
      return {
        id: attrs.OBJECTID,
        lat: attrs.LATITUDE,
        lng: attrs.LONGITUDE,
        species: attrs.SCI_NAME || "Unknown",
        commonName: attrs.CMMN_NM || null,
        genus: attrs.GENUS_NAME || null,
        condition: attrs.CONDITION || null,
        dbh: attrs.DBH || null,
        ward: attrs.WARD ? `Ward ${attrs.WARD}` : null,
      };
    });

    return NextResponse.json({ trees, total: trees.length });
  } catch (error) {
    console.error("Urban trees fetch failed:", error);
    return NextResponse.json({ trees: [], total: 0 });
  }
}
