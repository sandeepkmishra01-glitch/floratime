import { NextRequest, NextResponse } from "next/server";
import { fetchINatFlowers } from "@/lib/inaturalist";

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

  const result = await fetchINatFlowers({
    lat,
    lng,
    radius: Math.min(radius, 50),
    per_page: Math.min(per_page, 100),
    month,
  });

  return NextResponse.json(result);
}
