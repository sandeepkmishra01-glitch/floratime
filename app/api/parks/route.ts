import { NextRequest, NextResponse } from "next/server";
import { findNearbyParks } from "@/lib/nps";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");
  const limit = parseInt(searchParams.get("limit") || "3");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng required" }, { status: 400 });
  }

  try {
    const parks = await findNearbyParks(parseFloat(lat), parseFloat(lng), limit);
    return NextResponse.json(parks);
  } catch (error) {
    console.error("NPS parks fetch failed:", error);
    return NextResponse.json([]);
  }
}
