"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import FlowerDetails from "./components/FlowerDetails";
import ErrorBoundary from "./components/ErrorBoundary";
import { FlowerData } from "@/types";

const FlowerMap = dynamic(() => import("./components/Map"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-cream">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-fern border-t-transparent rounded-full animate-spin mx-auto mb-2" />
        <p className="text-forest text-sm">Loading map...</p>
      </div>
    </div>
  ),
});

const DC_CENTER: [number, number] = [38.9072, -77.0369];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function safeDate(d: string): string {
  try {
    const clean = d.split("/")[0].trim();
    const date = new Date(clean);
    if (isNaN(date.getTime())) return d;
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return d; }
}

export default function Home() {
  const [flowers, setFlowers] = useState<FlowerData[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedFlower, setSelectedFlower] = useState<FlowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [search, setSearch] = useState("");

  const fetchFlowers = useCallback(async (selectedMonth?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: DC_CENTER[0].toString(),
        lng: DC_CENTER[1].toString(),
        radius: "30",
        per_page: "50",
      });
      if (selectedMonth) params.set("month", selectedMonth.toString());
      const res = await fetch(`/api/flowers?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setFlowers(data.flowers || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlowers(month); }, [fetchFlowers, month]);

  // Client-side search filter
  const filtered = useMemo(() => {
    if (!search.trim()) return flowers;
    const q = search.toLowerCase();
    return flowers.filter(f =>
      f.species.toLowerCase().includes(q) ||
      (f.commonName && f.commonName.toLowerCase().includes(q)) ||
      (f.placeGuess && f.placeGuess.toLowerCase().includes(q))
    );
  }, [flowers, search]);

  const handleFlowerClick = useCallback((f: FlowerData) => setSelectedFlower(f), []);
  const handleClose = useCallback(() => setSelectedFlower(null), []);

  return (
    <ErrorBoundary>
    <div className="h-screen w-screen flex flex-col bg-cream">
      {/* ── Header ── */}
      <header
        className="relative z-20 flex-shrink-0"
        style={{ background: "linear-gradient(135deg, #006400 0%, #1e352f 100%)" }}
      >
        <div className="max-w-full mx-auto px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap relative">
          {/* Brand */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <h1 className="text-lg font-bold text-white tracking-tight whitespace-nowrap">
              FloraTime <span className="text-base">🌸</span>
            </h1>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[160px] max-w-xs">
            <input
              type="text"
              placeholder="Search species, name, location..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-lg bg-white/15 text-white
                         placeholder-white/50 border border-white/20
                         focus:outline-none focus:border-fern focus:bg-white/20 transition"
            />
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Heatmap toggle */}
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition
                ${showHeatmap
                  ? "bg-fern text-white border-fern"
                  : "bg-white/15 text-white border-white/20 hover:bg-white/25"}`}
            >
              {showHeatmap ? "🔥 Heatmap ON" : "🔥 Heatmap"}
            </button>

            {/* Month picker */}
            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg
                           bg-white/15 text-white border border-white/20 hover:bg-white/25 transition"
              >
                📅 {month ? MONTHS[month - 1] : "All months"}
              </button>
              {showMonthPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMonthPicker(false)} />
                  <div className="absolute right-0 mt-1.5 w-40 bg-white rounded-lg shadow-xl
                                  border border-sage z-40 py-1 max-h-64 overflow-y-auto">
                    <button onClick={() => { setMonth(undefined); setShowMonthPicker(false); }}
                      className={`w-full text-left px-3 py-1.5 text-sm ${!month ? "bg-sage text-forest font-semibold" : "text-forest hover:bg-sage/50"}`}>
                      All months
                    </button>
                    <div className="border-t border-dashed border-gray-300 my-0.5" />
                    {MONTHS.map((name, i) => (
                      <button key={name} onClick={() => { setMonth(i + 1); setShowMonthPicker(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm ${month === i + 1 ? "bg-sage text-forest font-semibold" : "text-forest hover:bg-sage/50"}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Count */}
            <span className="text-white/60 text-xs hidden sm:inline">
              {loading ? "..." : `${total.toLocaleString()} obs`}
            </span>
          </div>
        </div>
      </header>

      {/* ── Map ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {/* Error banner */}
        {error && (
          <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30
                          bg-red-50 border border-red-200 text-red-700
                          px-4 py-2 rounded-lg text-sm shadow-lg">
            {error}
            <button onClick={() => fetchFlowers(month)} className="ml-2 underline font-semibold">Retry</button>
          </div>
        )}

        {/* Map fills top 60% on desktop, flexible on mobile */}
        <div className="flex-1 min-h-[50%] relative">
          <FlowerMap
            flowers={filtered}
            center={DC_CENTER}
            zoom={12}
            showHeatmap={showHeatmap}
            onFlowerClick={handleFlowerClick}
          />
          {loading && flowers.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
              <div className="bg-white/95 backdrop-blur-sm rounded-xl px-6 py-3 shadow-lg
                              border border-sage flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-fern border-t-transparent rounded-full animate-spin" />
                <span className="text-forest text-sm font-semibold">Finding blooms...</span>
              </div>
            </div>
          )}
        </div>

        {/* ── Card Grid ── */}
        <div className="flex-shrink-0 bg-white border-t border-sage overflow-y-auto"
             style={{ maxHeight: "35vh" }}>
          {filtered.length === 0 && !loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400 text-sm">
              {search ? "No flowers match your search." : "No observations found for this area."}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 p-2">
              {filtered.map(f => (
                <button
                  key={f.id}
                  onClick={() => handleFlowerClick(f)}
                  className="text-left bg-cream rounded-lg border border-sage/50 overflow-hidden
                             hover:border-fern hover:shadow-md transition cursor-pointer group"
                >
                  {/* Card image */}
                  <div className="w-full h-24 bg-sage/30 overflow-hidden">
                    {f.photoUrl ? (
                      <img src={f.photoUrl} alt={f.species}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">🌸</div>
                    )}
                  </div>
                  {/* Card text */}
                  <div className="p-1.5">
                    <p className="text-xs font-bold italic text-forest leading-tight line-clamp-2">
                      {f.species}
                    </p>
                    {f.commonName && (
                      <p className="text-[11px] text-fern font-semibold leading-tight truncate">
                        {f.commonName}
                      </p>
                    )}
                    {f.observedOn && (
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {safeDate(f.observedOn)}
                      </p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Detail Panel ── */}
      {selectedFlower && (
        <FlowerDetails flower={selectedFlower} onClose={handleClose} />
      )}
    </div>
    </ErrorBoundary>
  );
}
