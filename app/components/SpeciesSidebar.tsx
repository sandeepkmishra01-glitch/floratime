"use client";

import { FlowerData } from "@/types";

interface SpeciesItem {
  name: string;
  common: string | null;
  photo: string | null;
}

interface Props {
  species: SpeciesItem[];
  selectedSpecies: Set<string>;
  loading: boolean;
  filteredCount: number;
  totalCount: number;
  onToggleSpecies: (name: string) => void;
  onClearSelection: () => void;
  onClickSpecies: (flower: FlowerData) => void;
  flowers: FlowerData[];
}

export default function SpeciesSidebar({
  species,
  selectedSpecies,
  loading,
  filteredCount,
  totalCount,
  onToggleSpecies,
  onClearSelection,
  onClickSpecies,
  flowers,
}: Props) {
  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-2 border-b border-dashed border-gray-200">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide px-1">
          Species ({species.length})
          {selectedSpecies.size > 0 && (
            <button onClick={onClearSelection}
              className="ml-2 text-fern hover:underline font-normal normal-case">clear</button>
          )}
        </p>
      </div>

      {species.length === 0 ? (
        <div className="p-4 text-center text-xs text-gray-400">
          {loading ? "Loading..." : "No species found"}
        </div>
      ) : (
        species.map(s => {
          const flower = flowers.find(f => f.species === s.name);
          const selected = selectedSpecies.has(s.name);
          return (
            <div key={s.name}
              className={"w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-sage/30 transition border-b border-gray-50" +
                (selected ? " bg-sage/50" : "")}>
              <button onClick={() => onToggleSpecies(s.name)}
                className={"w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center transition" +
                  (selected ? " bg-fern border-fern" : " border-gray-300")}>
                {selected && (
                  <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </button>
              {s.photo ? (
                <img src={s.photo} alt="" className="w-7 h-7 rounded object-cover flex-shrink-0"
                  onError={e => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <div className="w-7 h-7 rounded bg-sage/30 flex-shrink-0 flex items-center justify-center text-xs">🌸</div>
              )}
              <button onClick={() => flower && onClickSpecies(flower)}
                className="min-w-0 text-left">
                <p className="text-xs font-semibold italic text-forest truncate hover:underline">{s.name}</p>
                {s.common && <p className="text-[10px] text-fern truncate">{s.common}</p>}
              </button>
            </div>
          );
        })
      )}

      {selectedSpecies.size > 0 && (
        <div className="p-2 border-t border-dashed border-gray-200 bg-sage/30 flex-shrink-0">
          <p className="text-xs text-forest text-center font-semibold">
            Showing {filteredCount} of {totalCount} observations
          </p>
        </div>
      )}
    </div>
  );
}
