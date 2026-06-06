import { FlowerData, FlowerSearchParams, PhotoItem } from "@/types";

const INAT_API = "https://api.inaturalist.org/v1";

interface INatObservation {
  id: number;
  species_guess: string | null;
  observed_on: string | null;
  observed_on_string: string | null;
  description: string | null;
  place_guess: string | null;
  location: string; // "lat,lng"
  quality_grade: "research" | "needs_id" | "casual";
  captive: boolean;
  uri: string;
  taxon: INatTaxon | null;
  photos: INatPhoto[];
  user: { login: string; name: string | null } | null;
  identifications: { user: { login: string } | null }[];
  tags: string[];
}

interface INatTaxon {
  id: number;
  name: string;
  rank: string;
  preferred_common_name: string | null;
  native: boolean | null;
  introduced: boolean | null;
  threatened: boolean | null;
  extinct: boolean | null;
  wikipedia_url: string | null;
  default_photo: { square_url: string; medium_url: string } | null;
  iconic_taxon_name: string;
}

interface INatPhoto {
  id: number;
  url: string;
  attribution: string | null;
  license_code: string | null;
}

interface INatResponse {
  total_results: number;
  page: number;
  per_page: number;
  results: INatObservation[];
}

/**
 * Fetch wildflower observations from iNaturalist.
 * captive=false ensures only wild (non-cultivated) observations.
 */
export async function fetchINatFlowers(
  params: FlowerSearchParams
): Promise<{ flowers: FlowerData[]; total: number }> {
  const { lat, lng, radius = 20, per_page = 50, month } = params;

  const searchParams = new URLSearchParams({
    lat: lat.toString(),
    lng: lng.toString(),
    radius: Math.min(radius, 50).toString(),
    per_page: Math.min(per_page, 200).toString(),
    captive: "false",            // wild-only: excludes gardens, zoos, planted
    quality_grade: "research,needs_id",
    order: "desc",
    order_by: "observed_on",
    taxon_is_active: "true",
    iconic_taxa: "Plantae",
  });

  if (month) {
    // iNaturalist doesn't accept a month filter directly — use observed_on range
    const year = new Date().getFullYear();
    const nextMonth = month === 12 ? 1 : month + 1;
    const nextYear = month === 12 ? year + 1 : year;
    searchParams.set(
      "observed_on",
      `${year}-${String(month).padStart(2, "0")}-01,${nextYear}-${String(nextMonth).padStart(2, "0")}-01`
    );
  }

  try {
    const res = await fetch(`${INAT_API}/observations?${searchParams.toString()}`, {
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.error(`iNaturalist API error: ${res.status}`);
      return { flowers: [], total: 0 };
    }

    const data: INatResponse = await res.json();
    const flowers: FlowerData[] = data.results
      .filter((obs) => obs.taxon && obs.location) // must have species and coords
      .map(mapINatObservation);

    return { flowers, total: data.total_results || flowers.length };
  } catch (error) {
    console.error("Failed to fetch from iNaturalist:", error);
    return { flowers: [], total: 0 };
  }
}

function mapINatObservation(obs: INatObservation): FlowerData {
  const taxon = obs.taxon!;
  const [latStr, lngStr] = obs.location.split(",");
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  // Primary photo (medium quality)
  const primaryPhoto = obs.photos?.[0];
  const photoUrl = primaryPhoto
    ? primaryPhoto.url.replace("/square.jpg", "/medium.jpg")
    : taxon.default_photo?.medium_url || null;

  // All photos
  const photos: PhotoItem[] = (obs.photos || []).map((p) => ({
    url: p.url.replace("/square.jpg", "/medium.jpg"),
    attribution: p.attribution || null,
  }));

  const species =
    taxon.rank === "species" ? taxon.name : obs.species_guess || taxon.name;

  return {
    id: `inat-${obs.id}`,
    lat,
    lng,
    species,
    commonName: taxon.preferred_common_name || null,
    observedOn: obs.observed_on || null,
    photoUrl,
    photos,
    photoAttribution: primaryPhoto?.attribution || null,
    wikiUrl: taxon.wikipedia_url || null,
    description: obs.description || null,
    observerName: obs.user?.name || obs.user?.login || null,
    identifiedBy: obs.identifications?.[0]?.user?.login || null,
    placeGuess: obs.place_guess || null,
    sourceUrl: obs.uri,
    datasetName: "iNaturalist",
    taxonRank: taxon.rank,
    recordedBy: obs.user?.login || null,
    individualCount: null,
    lifeStage: null,
    reproductiveCondition: null,
    source: "inaturalist",
    qualityGrade: obs.quality_grade,
    captive: obs.captive,
    invasive: taxon.introduced || null,
    nativeStatus: taxon.native ? "Native" : taxon.introduced ? "Introduced" : null,
    thumbnail: taxon.default_photo?.square_url || null,
  };
}
