"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import FlowerDetails from "./components/FlowerDetails";
import { FlowerData } from "@/types";

// Leaflet requires window — disable SSR for the map component
const FlowerMap = dynamic(() => import("./components/Map"), { ssr: false });

const DC_CENTER: [number, number] = [38.9072, -77.0369];
const DC_ZOOM = 12;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function Home() {
  const [flowers, setFlowers] = useState<FlowerData[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedFlower, setSelectedFlower] = useState<FlowerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [month, setMonth] = useState<number | undefined>(undefined);
  const [showMonthPicker, setShowMonthPicker] = useState(false);

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
      setError(err instanceof Error ? err.message : "Failed to load flower data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFlowers(month); }, [fetchFlowers, month]);

  const handleFlowerClick = useCallback((flower: FlowerData) => setSelectedFlower(flower), []);
  const handleCloseDetails = useCallback(() => setSelectedFlower(null), []);
  const handleMonthSelect = (m: number | undefined) => { setMonth(m); setShowMonthPicker(false); };

  const currentMonthLabel = month ? MONTHS[month - 1] : "All months";

  return (
    <div className="h-screen w-screen flex flex-col bg-cream">
      {/* ── Botanical Hero Header ── */}
      <header
        className="relative z-20 flex-shrink-0"
        style={{
          background: "linear-gradient(135deg, #006400 0%, #1e352f 100%)",
        }}
      >
        {/* Decorative leaf pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5 C35 15 45 20 45 30 C45 40 35 45 30 55 C25 45 15 40 15 30 C15 20 25 15 30 5Z' fill='white'/%3E%3C/svg%3E\")",
            backgroundSize: "80px 80px",
          }}
        />

        <div className="max-w-6xl mx-auto px-5 py-3 flex items-center justify-between relative">
          {/* Brand */}
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              FloraTime
              <span className="ml-2 text-xl" role="img" aria-label="flower">
                🌸
              </span>
            </h1>
            <p className="text-cream/70 text-xs font-light mt-0.5">
              Discover what&apos;s blooming in Washington, D.C.
            </p>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {/* Month Filter */}
            <div className="relative">
              <button
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg
                           bg-white/15 text-white border border-white/20
                           hover:bg-white/25 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {currentMonthLabel}
                <svg className={`w-3 h-3 transition ${showMonthPicker ? "rotate-180" : ""}`}
                  fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showMonthPicker && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setShowMonthPicker(false)} />
                  <div className="absolute right-0 mt-2 w-44 bg-white rounded-lg shadow-xl
                                  border border-sage z-40 py-1.5 max-h-72 overflow-y-auto">
                    <button
                      onClick={() => handleMonthSelect(undefined)}
                      className={`w-full text-left px-4 py-2 text-sm transition
                        ${!month ? "bg-sage text-forest font-semibold" : "text-forest hover:bg-sage/50"}`}
                    >
                      All months
                    </button>
                    <div className="border-t border-dashed border-gray-300 my-1" />
                    {MONTHS.map((name, i) => (
                      <button
                        key={name}
                        onClick={() => handleMonthSelect(i + 1)}
                        className={`w-full text-left px-4 py-2 text-sm transition
                          ${month === i + 1 ? "bg-sage text-forest font-semibold" : "text-forest hover:bg-sage/50"}`}
                      >
                        {name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Observation count */}
            <div className="hidden sm:flex items-center gap-2 text-cream/80 text-xs font-light">
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-3 border-2 border-fern border-t-transparent rounded-full animate-spin" />
                  Searching...
                </span>
              ) : (
                <span>{total.toLocaleString()} observations</span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── Map Area ── */}
      <div className="flex-1 relative">
        {error && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30
                          bg-red-50 border border-red-200 text-red-700
                          px-5 py-3 rounded-lg text-sm shadow-lg animate-fade-in">
            <span>{error}</span>
            <button
              onClick={() => fetchFlowers(month)}
              className="ml-3 font-semibold underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        <FlowerMap
          flowers={flowers}
          center={DC_CENTER}
          zoom={DC_ZOOM}
          onFlowerClick={handleFlowerClick}
        />

        {/* Loading state */}
        {loading && flowers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
            <div className="bg-white/95 backdrop-blur-sm rounded-xl px-8 py-5 shadow-lg
                            border border-sage flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-fern border-t-transparent rounded-full animate-spin" />
              <span className="text-forest font-semibold">
                Finding blooming flowers...
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── Detail Panel ── */}
      {selectedFlower && (
        <FlowerDetails flower={selectedFlower} onClose={handleCloseDetails} />
      )}
    </div>
  );
}
