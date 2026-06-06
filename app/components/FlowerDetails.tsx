"use client";

import { FlowerData, SpeciesEnrichment } from "@/types";
import { useEffect, useState } from "react";

interface Props {
  flower: FlowerData;
  onClose: () => void;
}

function safeDate(d: string): string {
  try {
    const clean = d.split("/")[0].trim();
    const date = new Date(clean);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  } catch { return d; }
}

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  gbif: { label: "GBIF", color: "bg-emerald-600" },
  inaturalist: { label: "iNaturalist", color: "bg-sky-600" },
  user: { label: "User", color: "bg-amber-600" },
};

export default function FlowerDetails({ flower, onClose }: Props) {
  const [enrichment, setEnrichment] = useState<SpeciesEnrichment | null>(null);
  const [loadingEnrich, setLoadingEnrich] = useState(false);

  useEffect(() => {
    setEnrichment(null);
    setLoadingEnrich(true);

    const controller = new AbortController();
    fetch(`/api/species-enrich?name=${encodeURIComponent(flower.species)}`, {
      signal: controller.signal,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setEnrichment(data))
      .catch(() => {})
      .finally(() => setLoadingEnrich(false));

    return () => controller.abort();
  }, [flower.species]);

  const badge = SOURCE_BADGE[flower.source] || SOURCE_BADGE.gbif;
  const displayImage = enrichment?.thumbnail || flower.photoUrl;
  const displayDesc = enrichment?.wikiSummary || flower.description;
  const displayWiki = enrichment?.wikiUrl || flower.wikiUrl;
  const displayFamily = enrichment?.family || flower.family;
  const displayGenus = enrichment?.genus || flower.genus;
  const displayConservation = enrichment?.conservationStatus || flower.conservationStatus;
  const displayCommon = enrichment?.commonName || flower.commonName;

  return (
    <div className="fixed inset-0 z-[9998] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-forest/40" onClick={onClose} />

      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl
                    w-full sm:max-w-md max-h-[85vh] overflow-y-auto
                    animate-slide-up border border-sage/50"
        role="dialog" aria-label="Flower details">

        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Photo */}
        {displayImage ? (
          <div className="relative w-full h-52 sm:h-56 overflow-hidden sm:rounded-t-2xl bg-sage">
            <img src={displayImage} alt={flower.species} className="w-full h-full object-cover" />
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
            <span className={`absolute top-3 left-3 text-[10px] text-white px-2 py-0.5 rounded-full ${badge.color}`}>
              {badge.label}
            </span>
            {flower.photoAttribution && (
              <span className="absolute bottom-3 right-3 text-[10px] bg-black/50 text-white/80 px-2 py-0.5 rounded-full">
                {flower.photoAttribution}
              </span>
            )}
          </div>
        ) : (
          <div className="w-full h-40 sm:h-44 sm:rounded-t-2xl bg-gradient-to-br from-fern/20 to-forest/20 flex items-center justify-center">
            <span className="text-6xl opacity-30">🌸</span>
          </div>
        )}

        <div className="p-5 space-y-4">
          <button onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 hover:bg-white
                       rounded-full flex items-center justify-center shadow-md text-forest z-10 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Species name */}
          <div>
            <h2 className="text-xl font-bold italic text-forest">{flower.species}</h2>
            {displayCommon && (
              <p className="text-fern font-semibold text-sm mt-0.5">{displayCommon}</p>
            )}
          </div>

          {/* Wikipedia summary */}
          {displayDesc && (
            <p className="text-xs text-gray-500 leading-relaxed">{displayDesc}</p>
          )}

          {/* Taxonomy from GBIF */}
          {(displayFamily || displayGenus) && (
            <div className="flex gap-3 text-xs">
              {displayFamily && (
                <span className="bg-sage/30 text-forest px-2 py-1 rounded-full font-medium">
                  {displayFamily}
                </span>
              )}
              {displayGenus && (
                <span className="bg-sage/30 text-forest px-2 py-1 rounded-full font-medium italic">
                  {displayGenus}
                </span>
              )}
              {flower.taxonRank && (
                <span className="bg-sage/30 text-forest px-2 py-1 rounded-full font-medium capitalize">
                  {flower.taxonRank}
                </span>
              )}
            </div>
          )}

          {/* Conservation & native status */}
          {(displayConservation || flower.nativeStatus || flower.invasive != null) && (
            <div className="flex flex-wrap gap-2 text-xs">
              {displayConservation && (
                <span className="bg-amber-50 text-amber-800 px-2 py-1 rounded-full border border-amber-200">
                  🛡️ {displayConservation}
                </span>
              )}
              {flower.nativeStatus && (
                <span className="bg-green-50 text-green-800 px-2 py-1 rounded-full border border-green-200">
                  🌱 {flower.nativeStatus}
                </span>
              )}
              {flower.invasive && (
                <span className="bg-red-50 text-red-800 px-2 py-1 rounded-full border border-red-200">
                  ⚠️ Invasive
                </span>
              )}
              {flower.qualityGrade && (
                <span className={[
                  "px-2 py-1 rounded-full border",
                  flower.qualityGrade === "research"
                    ? "bg-blue-50 text-blue-800 border-blue-200"
                    : "bg-yellow-50 text-yellow-800 border-yellow-200",
                ].join(" ")}>
                  {flower.qualityGrade === "research" ? "✓ Research" : "Needs ID"}
                </span>
              )}
            </div>
          )}

          <div className="border-t border-dashed border-gray-300" />

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {flower.observedOn && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">Observed</span>
                <span className="text-forest font-medium">{safeDate(flower.observedOn)}</span>
              </div>
            )}
            {flower.placeGuess && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">Location</span>
                <span className="text-forest font-medium">{flower.placeGuess}</span>
              </div>
            )}
            {flower.recordedBy && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">Recorded by</span>
                <span className="text-forest font-medium">{flower.recordedBy}</span>
              </div>
            )}
            {flower.individualCount != null && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">Count</span>
                <span className="text-forest font-medium">{flower.individualCount}</span>
              </div>
            )}
            {flower.lifeStage && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">Life stage</span>
                <span className="text-forest font-medium capitalize">{flower.lifeStage}</span>
              </div>
            )}
            {flower.source === "inaturalist" && flower.observerName && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">Observer</span>
                <span className="text-forest font-medium">{flower.observerName}</span>
              </div>
            )}
          </div>

          {/* All photos gallery */}
          {flower.photos && flower.photos.length > 1 && (
            <>
              <div className="border-t border-dashed border-gray-300" />
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold mb-2">
                  All Photos ({flower.photos.length})
                </span>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {flower.photos.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                      className="flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-sage hover:border-fern transition">
                      <img src={p.url} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" loading="lazy"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Source links */}
          <div className="border-t border-dashed border-gray-300 pt-4 space-y-2">
            {flower.sourceUrl && (
              <a href={flower.sourceUrl} target="_blank" rel="noopener noreferrer"
                className="block text-center px-4 py-2.5 rounded-lg text-sm font-semibold text-white
                           bg-gradient-to-b from-fern to-fern-dark hover:opacity-90 transition shadow-sm"
                style={{ backgroundImage: "linear-gradient(#5fb021, #468019)" }}>
                View on {flower.source === "inaturalist" ? "iNaturalist" : "GBIF"}
              </a>
            )}
            {displayWiki && (
              <a href={displayWiki} target="_blank" rel="noopener noreferrer"
                className="block text-center px-4 py-2 rounded-lg text-sm font-semibold
                           bg-gray-100 text-forest hover:bg-gray-200 transition border border-gray-200">
                📖 Wikipedia entry
              </a>
            )}
          </div>

          {/* Loading state for enrichment */}
          {loadingEnrich && (
            <div className="text-center text-[10px] text-gray-400 animate-pulse">
              Loading species info...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
