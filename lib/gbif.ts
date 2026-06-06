import {
  FlowerData,
  FlowerSearchParams,
  GBIFOccurrence,
  GBIFResponse,
  PhotoItem,
} from "@/types";

const GBIF_API = "https://api.gbif.org/v1";

// Plantae — using this instead of Magnoliopsida because GBIF backbone
// taxon keys for specific classes are unstable (~300M range).
// All observations with photos will be interesting to users.
const PLANTAE_TAXON_KEY = 6;

/**
 * Compute a bounding box polygon for GBIF's geometry parameter.
 * 1° lat ≈ 111 km, 1° lng ≈ 111 * cos(lat) km
 */
function bboxFromPoint(
  lat: number,
  lng: number,
  radiusKm: number
): string {
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos((lat * Math.PI) / 180));
  const minLng = lng - lngDelta;
  const minLat = lat - latDelta;
  const maxLng = lng + lngDelta;
  const maxLat = lat + latDelta;
  return `POLYGON((${minLng} ${minLat},${maxLng} ${minLat},${maxLng} ${maxLat},${minLng} ${maxLat},${minLng} ${minLat}))`;
}

function safeAttribution(refs: string | undefined): string | null {
  if (!refs) return null;
  try {
    return `© GBIF via ${new URL(refs).hostname}`;
  } catch {
    return null;
  }
}

export async function fetchFlowers(
  params: FlowerSearchParams
): Promise<FlowerData[]> {
  const result = await fetchFlowersWithCoords(params);
  return result.flowers;
}

export async function fetchFlowersWithCoords(
  params: FlowerSearchParams
): Promise<{ flowers: FlowerData[]; total: number }> {
  const { lat, lng, radius = 20, per_page = 50, month } = params;

  const geometry = bboxFromPoint(lat, lng, Math.min(radius, 50));
  const now = new Date();
  const currentYear = now.getFullYear();

  const searchParams = new URLSearchParams({
    taxonKey: PLANTAE_TAXON_KEY.toString(),
    geometry,
    hasCoordinate: "true",
    hasGeospatialIssue: "false",
    basisOfRecord: "HUMAN_OBSERVATION",
    mediaType: "StillImage",
    limit: Math.min(per_page, 100).toString(),
    offset: "0",
    year: `${currentYear - 2},${currentYear}`,
  });

  if (month) {
    searchParams.set("month", month.toString());
  }

  try {
    const res = await fetch(
      `${GBIF_API}/occurrence/search?${searchParams.toString()}`,
      {
        headers: { Accept: "application/json" },
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) {
      console.error(`GBIF API error: ${res.status} ${res.statusText}`);
      return { flowers: [], total: 0 };
    }

    const data: GBIFResponse = await res.json();

    const flowers: FlowerData[] = data.results.map(mapOccurrence);
    return { flowers, total: data.count || flowers.length };
  } catch (error) {
    console.error("Failed to fetch flowers from GBIF:", error);
    return { flowers: [], total: 0 };
  }
}

function mapOccurrence(occ: GBIFOccurrence): FlowerData {
  const allPhotos: PhotoItem[] = (occ.media || [])
    .filter(m => m.type === "StillImage")
    .map(m => ({
      url: m.identifier,
      attribution: safeAttribution(m.references) || m.publisher || null,
    }));

  const primaryPhoto = allPhotos[0];

  return {
    id: `gbif-${occ.key}`,
    lat: occ.decimalLatitude,
    lng: occ.decimalLongitude,
    species: occ.species || occ.scientificName || "Unknown species",
    commonName: null,
    observedOn: occ.eventDate || null,
    photoUrl: primaryPhoto?.url || null,
    photos: allPhotos,
    photoAttribution: primaryPhoto?.attribution || null,
    wikiUrl: null,
    description: null,
    observerName: null,
    identifiedBy: occ.identifiedBy || null,
    placeGuess: occ.locality || null,
    sourceUrl: occ.references || `https://www.gbif.org/occurrence/${occ.key}`,
    datasetName: occ.datasetName || null,
    source: "gbif",
    taxonRank: occ.taxonRank || null,
    recordedBy: occ.recordedBy || null,
    individualCount: occ.individualCount || null,
    lifeStage: occ.lifeStage || null,
    reproductiveCondition: occ.reproductiveCondition || null,
  };
}
