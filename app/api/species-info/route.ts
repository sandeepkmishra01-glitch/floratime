import { NextRequest, NextResponse } from "next/server";
import { enrichSpecies } from "@/lib/wikidata";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const name = searchParams.get("name");

  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  try {
    const info = await enrichSpecies(name);
    return NextResponse.json(info);
  } catch {
    return NextResponse.json(null);
  }
}
