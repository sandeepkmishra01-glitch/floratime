"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import FlowerDetails from "./components/FlowerDetails";
import ErrorBoundary from "./components/ErrorBoundary";
import { FlowerData, WikiSpeciesInfo } from "@/types";

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

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

interface AreaInfo {
  name: string;
  type: string;
  protected: boolean;
  displayName: string;
}

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
  const [tileLayer, setTileLayer] = useState<"light" | "terrain" | "transit">("light");
  const [search, setSearch] = useState("");
  const [locationSearch, setLocationSearch] = useState("");
  const [center, setCenter] = useState<[number, number]>([38.9072, -77.0369]);
  const [areaInfo, setAreaInfo] = useState<AreaInfo | null>(null);
  const [selectedSpecies, setSelectedSpecies] = useState<Set<string>>(new Set());
  const [speciesInfo, setSpeciesInfo] = useState<WikiSpeciesInfo | null>(null);
  const [infoLoading, setInfoLoading] = useState(false);
  const mapKey = useRef(0);

  // Fetch flowers for current center
  const fetchFlowers = useCallback(async (loc: [number, number], m?: number) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        lat: loc[0].toString(),
        lng: loc[1].toString(),
        radius: "30",
        per_page: "100",
      });
      if (m) params.set("month", m.toString());
      const res = await fetch(`/api/flowers?${params.toString()}`);
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setFlowers(data.flowers || []);
      setTotal(data.total || 0);
      setSelectedSpecies(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch area info for current center
  const fetchAreaInfo = useCallback(async (loc: [number, number]) => {
    try {
      const res = await fetch(`/api/area-info?lat=${loc[0]}&lng=${loc[1]}`);
      if (res.ok) {
        const data = await res.json();
        setAreaInfo(data);
      }
    } catch { setAreaInfo(null); }
  }, []);

  useEffect(() => {
    fetchFlowers(center, month);
    fetchAreaInfo(center);
  }, [center, month, fetchFlowers, fetchAreaInfo]);

  // Geocode location search
  const handleLocationSearch = useCallback(async () => {
    if (!locationSearch.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationSearch + ", USA")}&limit=1`
      );
      const data = await res.json();
      if (data[0]) {
        const newCenter: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setCenter(newCenter);
        mapKey.current++;
        setLocationSearch("");
      }
    } catch { /* ignore */ }
  }, [locationSearch]);

  // Filter flowers by text search + selected species
  const filtered = useMemo(() => {
    let result = flowers;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(f =>
        f.species.toLowerCase().includes(q) ||
        (f.commonName && f.commonName.toLowerCase().includes(q)) ||
        (f.placeGuess && f.placeGuess.toLowerCase().includes(q))
      );
    }
    if (selectedSpecies.size > 0) {
      result = result.filter(f => selectedSpecies.has(f.species));
    }
    return result;
  }, [flowers, search, selectedSpecies]);

  // Unique species list for filter
  const uniqueSpecies = useMemo(() => {
    const map = new Map<string, { name: string; common: string | null; photo: string | null }>();
    flowers.forEach(f => {
      if (!map.has(f.species)) {
        map.set(f.species, { name: f.species, common: f.commonName, photo: f.photoUrl });
      }
    });
    return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [flowers]);

  const toggleSpecies = (name: string) => {
    setSelectedSpecies(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  // Fetch species info on click
  const handleFlowerClick = useCallback(async (f: FlowerData) => {
    setSelectedFlower(f);
    setInfoLoading(true);
    setSpeciesInfo(null);
    try {
      const res = await fetch(`/api/species-info?name=${encodeURIComponent(f.species)}`);
      if (res.ok) {
        const info = await res.json();
        if (info && info.commonName) {
          setSpeciesInfo(info);
          // Merge into flower for display
          setSelectedFlower(prev => prev ? {
            ...prev,
            commonName: info.commonName || prev.commonName,
            wikiUrl: info.wikiUrl || prev.wikiUrl,
            description: info.description || prev.description,
          } : prev);
        }
      }
    } catch { /* ignore */ }
    setInfoLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    setSelectedFlower(null);
    setSpeciesInfo(null);
  }, []);

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen flex flex-col bg-cream">
        {/* ── Header ── */}
        <header className="relative z-20 flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #006400 0%, #1e352f 100%)" }}>
          <div className="px-3 py-2 flex items-center gap-2 flex-wrap">
            <h1 className="text-lg font-bold text-white whitespace-nowrap">FloraTime 🌸</h1>

            {/* Location search */}
            <div className="flex-1 min-w-[140px] max-w-[220px] flex gap-1">
              <input
                type="text" placeholder="City, park, or place..."
                value={locationSearch}
                onChange={e => setLocationSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleLocationSearch()}
                className="flex-1 px-2.5 py-1.5 text-xs rounded-lg bg-white/15 text-white
                           placeholder-white/50 border border-white/20
                           focus:outline-none focus:border-fern transition" />
              <button onClick={handleLocationSearch}
                className="px-2 py-1.5 text-xs bg-fern text-white rounded-lg font-semibold hover:opacity-90">
                Go
              </button>
            </div>

            {/* Species search */}
            <input
              type="text" placeholder="Filter species..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 min-w-[120px] max-w-[200px] px-2.5 py-1.5 text-xs rounded-lg
                         bg-white/15 text-white placeholder-white/50 border border-white/20
                         focus:outline-none focus:border-fern transition" />

            {/* Layer toggle */}
            <select
              value={tileLayer}
              onChange={e => setTileLayer(e.target.value as "light" | "terrain" | "transit")}
              className="px-2 py-1.5 text-xs rounded-lg bg-white/15 text-white border border-white/20
                         focus:outline-none cursor-pointer"
            >
              <option value="light">🗺️ Map</option>
              <option value="terrain">⛰️ Terrain</option>
              <option value="transit">🚇 Transit</option>
            </select>

            {/* Heatmap */}
            <button onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition
                ${showHeatmap ? "bg-fern text-white border-fern" : "bg-white/15 text-white border-white/20 hover:bg-white/25"}`}>
              🔥
            </button>

            {/* Month */}
            <div className="relative">
              <button onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="px-2.5 py-1.5 text-xs font-semibold rounded-lg
                           bg-white/15 text-white border border-white/20 hover:bg-white/25">
                📅 {month ? MONTHS[month - 1].slice(0, 3) : "All"}
              </button>
              {showMonthPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMonthPicker(false)} />
                  <div className="absolute right-0 mt-1.5 w-36 bg-white rounded-lg shadow-xl
                                  border border-sage z-40 py-1 max-h-64 overflow-y-auto">
                    <button onClick={() => { setMonth(undefined); setShowMonthPicker(false); }}
                      className={`w-full text-left px-3 py-1.5 text-xs ${!month ? "bg-sage text-forest font-semibold" : "text-forest hover:bg-sage/50"}`}>
                      All months
                    </button>
                    <div className="border-t border-dashed border-gray-300 my-0.5" />
                    {MONTHS.map((name, i) => (
                      <button key={name} onClick={() => { setMonth(i + 1); setShowMonthPicker(false); }}
                        className={`w-full text-left px-3 py-1.5 text-xs ${month === i + 1 ? "bg-sage text-forest font-semibold" : "text-forest hover:bg-sage/50"}`}>
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <span className="text-white/50 text-[10px]">{loading ? "..." : `${total} obs`}</span>
          </div>
        </header>

        {/* ── Body: Map + Sidebar ── */}
        <div className="flex-1 min-h-0 flex flex-row">
          {/* Map */}
          <div className="flex-1 relative">
            {error && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30
                              bg-red-50 border border-red-200 text-red-700
                              px-4 py-2 rounded-lg text-sm shadow-lg">
                {error}
                <button onClick={() => fetchFlowers(center, month)} className="ml-2 underline font-semibold">Retry</button>
              </div>
            )}
            <FlowerMap
              key={mapKey.current}
              flowers={filtered}
              center={center}
              zoom={12}
              showHeatmap={showHeatmap}
              tileLayer={tileLayer}
              onFlowerClick={handleFlowerClick}
            />
            {loading && flowers.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                <div className="bg-white/95 backdrop-blur-sm rounded-xl px-5 py-3 shadow-lg border border-sage flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-fern border-t-transparent rounded-full animate-spin" />
                  <span className="text-forest text-sm font-semibold">Finding blooms...</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          <div className="w-72 lg:w-80 flex-shrink-0 bg-white border-l border-sage flex flex-col overflow-hidden">
            {/* Area info */}
            {areaInfo && (
              <div className="p-3 border-b border-dashed border-gray-200 flex-shrink-0">
                <div className="flex items-start gap-2">
                  <span className="text-lg">{areaInfo.protected ? "🏞️" : "📍"}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-forest truncate">{areaInfo.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {areaInfo.type}{areaInfo.protected ? " · Protected" : ""}
                    </p>
                    {areaInfo.protected && (
                      <p className="text-[10px] text-fern font-semibold mt-0.5">✓ Open to public</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Species filter list */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-2 border-b border-dashed border-gray-200">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1">
                  Species ({uniqueSpecies.length})
                  {selectedSpecies.size > 0 && (
                    <button onClick={() => setSelectedSpecies(new Set())}
                      className="ml-2 text-fern hover:underline font-normal normal-case">clear</button>
                  )}
                </p>
              </div>

              {uniqueSpecies.length === 0 ? (
                <div className="p-4 text-center text-xs text-gray-400">
                  {loading ? "Loading..." : "No species found"}
                </div>
              ) : (
                uniqueSpecies.map(s => (
                  <button
                    key={s.name}
                    onClick={() => toggleSpecies(s.name)}
                    className={`w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-sage/30 transition border-b border-gray-50
                      ${selectedSpecies.has(s.name) ? "bg-sage/50" : ""}`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition
                      ${selectedSpecies.has(s.name) ? "bg-fern border-fern" : "border-gray-300"}`}>
                      {selectedSpecies.has(s.name) && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {s.photo ? (
                      <img src={s.photo} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0"
                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    ) : (
                      <div className="w-7 h-7 rounded bg-sage/30 flex-shrink-0 flex items-center justify-center text-xs">🌸</div>
                    )}
                    <div className="min-w-0">
                      <p className="text-xs font-semibold italic text-forest truncate">{s.name}</p>
                      {s.common && <p className="text-[10px] text-fern truncate">{s.common}</p>}
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Selected count footer */}
            {selectedSpecies.size > 0 && (
              <div className="p-2 border-t border-dashed border-gray-200 bg-sage/30 flex-shrink-0">
                <p className="text-xs text-forest text-center font-semibold">
                  Showing {filtered.length} of {flowers.length} observations
                </p>
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
