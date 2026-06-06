const NPS_API = "https://developer.nps.gov/api/v1";

interface NPSPark {
  parkCode: string;
  fullName: string;
  designation: string;
  latitude: string;
  longitude: string;
  states: string;
  url: string;
  description: string;
}

interface NPSParksResponse {
  total: string;
  data: NPSPark[];
}

/**
 * Find NPS parks near a lat/lng point.
 * Uses NPS search to find parks by proximity.
 */
export async function findNearbyParks(
  lat: number,
  lng: number,
  limit: number = 3
): Promise<
  { parkCode: string; fullName: string; designation: string; url: string; description: string }[]
> {
  const token = process.env.NPS_API_KEY;
  if (!token) {
    console.warn("NPS_API_KEY not set");
    return [];
  }

  try {
    const res = await fetch(
      `${NPS_API}/parks?limit=${limit}&api_key=${token}`,
      { headers: { Accept: "application/json" }, next: { revalidate: 86400 } }
    );

    if (!res.ok) return [];
    const data: NPSParksResponse = await res.json();
    if (!data.data?.length) return [];

    // Calculate distance and sort by proximity
    const parksWithDist = data.data
      .filter((p) => p.latitude && p.longitude)
      .map((p) => ({
        ...p,
        distance: haversineKm(
          lat,
          lng,
          parseFloat(p.latitude),
          parseFloat(p.longitude)
        ),
      }))
      .sort((a, b) => a.distance - b.distance);

    return parksWithDist.slice(0, limit).map((p) => ({
      parkCode: p.parkCode,
      fullName: p.fullName,
      designation: p.designation || "",
      url: p.url,
      description: p.description || "",
    }));
  } catch (error) {
    console.error("NPS park lookup failed:", error);
    return [];
  }
}

function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
