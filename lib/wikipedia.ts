import { SpeciesEnrichment } from "@/types";

const WIKI_API = "https://en.wikipedia.org/api/rest_v1";

interface WikiSummary {
  title: string;
  extract: string;
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string };
  content_urls?: {
    desktop?: { page: string };
  };
  description?: string;
}

/**
 * Search Wikipedia for a species and return summary data.
 * Tries the scientific name directly first, then falls back to a search.
 */
async function getPageSummary(title: string): Promise<WikiSummary | null> {
  const res = await fetch(
    `${WIKI_API}/page/summary/${encodeURIComponent(title)}`,
    {
      headers: { Accept: "application/json" },
      next: { revalidate: 86400 },
    }
  );

  if (res.ok) return res.json();
  if (res.status === 404) return null;

  // Rate limit or other error
  if (res.status === 429) {
    console.warn("Wikipedia rate limited");
    return null;
  }
  return null;
}

/**
 * Enrich a species with Wikipedia data.
 */
export async function enrichWithWikipedia(
  speciesName: string
): Promise<{
  wikiSummary: string | null;
  wikiUrl: string | null;
  thumbnail: string | null;
} | null> {
  try {
    // First try: exact scientific name
    let summary = await getPageSummary(speciesName);

    // Fallback: try underscore version
    if (!summary) {
      summary = await getPageSummary(speciesName.replace(/ /g, "_"));
    }

    // Fallback: try search
    if (!summary) {
      const searchRes = await fetch(
        `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
          speciesName
        )}&srlimit=1&format=json&srwhat=text`,
        {
          headers: { "User-Agent": "FloraTime/1.0" },
          next: { revalidate: 86400 },
        }
      );

      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const pageTitle = searchData?.query?.search?.[0]?.title;
        if (pageTitle) {
          summary = await getPageSummary(pageTitle);
        }
      }
    }

    if (!summary) return null;

    return {
      wikiSummary: summary.extract?.split("\n")[0] || null,
      wikiUrl: summary.content_urls?.desktop?.page || null,
      thumbnail: summary.thumbnail?.source || summary.originalimage?.source || null,
    };
  } catch (error) {
    console.error(`Wikipedia enrichment failed for "${speciesName}":`, error);
    return null;
  }
}
