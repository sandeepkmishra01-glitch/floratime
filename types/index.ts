// Shared flower data model (API-agnostic)
export interface PhotoItem {
  url: string;
  attribution: string | null;
}

export type FlowerSource = "gbif" | "inaturalist" | "user";

export interface FlowerData {
  id: string;
  lat: number;
  lng: number;
  species: string;
  commonName: string | null;
  observedOn: string | null;
  photoUrl: string | null;            // primary photo
  photos: PhotoItem[];                 // all photos
  photoAttribution: string | null;
  wikiUrl: string | null;
  description: string | null;
  observerName: string | null;
  identifiedBy: string | null;
  placeGuess: string | null;
  sourceUrl: string;
  datasetName: string | null;
  taxonRank: string | null;
  recordedBy: string | null;
  individualCount: number | null;
  lifeStage: string | null;
  reproductiveCondition: string | null;
  conservationStatus?: string | null;
  invasive?: boolean | null;
  toxic?: string | null;
  source: FlowerSource;               // which API provided this
  // iNaturalist-specific
  qualityGrade?: "research" | "needs_id" | "casual" | null;
  captive?: boolean | null;
  // Enrichment — populated lazily
  nativeStatus?: string | null;
  family?: string | null;
  genus?: string | null;
  thumbnail?: string | null;
  wikiSummary?: string | null;
}

export interface FlowerSearchParams {
  lat: number;
  lng: number;
  radius?: number;   // km
  per_page?: number;
  month?: number;    // 1-12
}

// GBIF occurrence result (relevant fields only)
export interface GBIFOccurrence {
  key: number;
  species: string;
  scientificName: string;
  taxonRank: string;
  decimalLatitude: number;
  decimalLongitude: number;
  eventDate: string | null;
  locality: string | null;
  countryCode: string;
  media: GBIFMedia[];
  taxonKey: number;
  basisOfRecord: string;
  occurrenceStatus: string;
  iucnRedListCategory: string | null;
  recordedBy: string | null;
  identifiedBy: string | null;
  datasetName: string | null;
  individualCount: number | null;
  lifeStage: string | null;
  reproductiveCondition: string | null;
  references: string | null;
}

export interface GBIFMedia {
  type: "StillImage" | "Sound" | "MovingImage";
  identifier: string;
  references: string;
  publisher?: string;
  license?: string;
}

export interface GBIFResponse {
  offset: number;
  limit: number;
  endOfRecords: boolean;
  count: number;
  results: GBIFOccurrence[];
}

// Wikidata / Wikipedia enrichment
export interface WikiSpeciesInfo {
  commonName: string | null;
  description: string | null;
  imageUrl: string | null;
  imageAttribution: string | null;
  wikiUrl: string | null;
  bloomMonths: number[] | null;
  conservationStatus: string | null;
  invasive: boolean | null;
  toxic: string | null;
  additionalImages: string[] | null;
}

// Combined enrichment result
export interface SpeciesEnrichment {
  speciesName: string;
  // Wikipedia
  wikiSummary: string | null;
  wikiUrl: string | null;
  thumbnail: string | null;
  // GBIF species
  family: string | null;
  genus: string | null;
  taxonomicStatus: string | null;
  // POWO / Kew
  kewFamily: string | null;
  kewGenus: string | null;
  kewNomenclaturalStatus: string | null;
  kewLifeform: string | null;
  kewClimate: string | null;
  kewLocationCount: number | null;
  kewSynonymCount: number | null;
  // Trefle
  trefleCommonName: string | null;
  trefleFamilyCommon: string | null;
  trefleImageUrl: string | null;
  trefleStatus: string | null;
  trefleYear: number | null;
  trefleAuthor: string | null;
  // Wikidata
  commonName: string | null;
  description: string | null;
  conservationStatus: string | null;
}
