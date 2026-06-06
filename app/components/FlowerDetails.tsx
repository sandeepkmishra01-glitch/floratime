"use client";

import { FlowerData } from "@/types";

interface Props {
  flower: FlowerData;
  onClose: () => void;
}

/** Safely format a GBIF date (handles ranges like "2024-06/2024-07") */
function safeDate(d: string): string {
  try {
    const clean = d.split("/")[0].trim();
    const date = new Date(clean);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d;
  }
}

export default function FlowerDetails({ flower, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-forest/40 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl
                    w-full sm:max-w-md max-h-[85vh] overflow-y-auto
                    animate-slide-up border border-sage/50"
        role="dialog"
        aria-label="Flower details"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>

        {/* Photo */}
        {flower.photoUrl ? (
          <div className="relative w-full h-52 sm:h-56 overflow-hidden sm:rounded-t-2xl bg-sage">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={flower.photoUrl}
              alt={flower.species}
              className="w-full h-full object-cover"
            />
            {/* Gradient overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/50 to-transparent" />
            {flower.photoAttribution && (
              <span className="absolute bottom-3 right-3 text-[10px] bg-black/50 text-white/80 px-2 py-0.5 rounded-full">
                {flower.photoAttribution}
              </span>
            )}
          </div>
        ) : (
          /* No photo placeholder — botanical feel */
          <div className="w-full h-40 sm:h-44 sm:rounded-t-2xl bg-gradient-to-br from-fern/20 to-forest/20
                          flex items-center justify-center">
            <span className="text-6xl opacity-30">🌸</span>
          </div>
        )}

        {/* Content */}
        <div className="p-5 space-y-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 bg-white/90 hover:bg-white
                       rounded-full flex items-center justify-center shadow-md
                       text-forest z-10 transition"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Species name */}
          <div>
            <h2 className="text-xl font-bold italic text-forest">
              {flower.species}
            </h2>
            {flower.commonName && (
              <p className="text-fern font-semibold text-sm mt-0.5">
                {flower.commonName}
              </p>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-dashed border-gray-300" />

          {/* Details */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {flower.observedOn && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">
                  Observed
                </span>
                <span className="text-forest font-medium">
                  {safeDate(flower.observedOn)}
                </span>
              </div>
            )}
            {flower.placeGuess && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">
                  Location
                </span>
                <span className="text-forest font-medium">{flower.placeGuess}</span>
              </div>
            )}
            {flower.observerName && (
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold">
                  Observer
                </span>
                <span className="text-forest font-medium">{flower.observerName}</span>
              </div>
            )}
          </div>

          {/* Description */}
          {flower.description && (
            <>
              <div className="border-t border-dashed border-gray-300" />
              <div>
                <span className="text-gray-400 block text-[11px] uppercase tracking-wide font-semibold mb-1">
                  Description
                </span>
                <p className="text-sm text-forest/80 leading-relaxed line-clamp-4">
                  {flower.description}
                </p>
              </div>
            </>
          )}

          {/* Links */}
          <div className="border-t border-dashed border-gray-300 pt-4 flex gap-3">
            <a
              href={flower.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 text-center px-4 py-2.5 rounded-lg text-sm font-semibold
                         text-white transition shadow-sm
                         bg-gradient-to-b from-fern to-fern-dark
                         hover:opacity-90 active:opacity-80"
              style={{ backgroundImage: "linear-gradient(#5fb021, #468019)" }}
            >
              View on GBIF
            </a>
            {flower.wikiUrl && (
              <a
                href={flower.wikiUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center px-4 py-2.5 rounded-lg text-sm font-semibold
                           border-2 border-sage text-forest transition
                           hover:bg-sage active:bg-fern active:text-white"
              >
                Wikipedia
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
