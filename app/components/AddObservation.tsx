"use client";

import { useState } from "react";
import { UserSubmission } from "@/types/submissions";

const STORAGE_KEY = "floratime_submissions";

export function loadSubmissions(): UserSubmission[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveSubmissions(subs: UserSubmission[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(subs)); } catch {}
}

interface Props {
  center: [number, number];
  onSubmit: (s: UserSubmission) => void;
  onClose: () => void;
}

export default function AddObservation({ center, onSubmit, onClose }: Props) {
  const [species, setSpecies] = useState("");
  const [commonName, setCommonName] = useState("");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [type, setType] = useState<"flower" | "tree">("flower");

  const handleSubmit = () => {
    if (!species.trim()) return;
    const sub: UserSubmission = {
      id: `user-${Date.now()}`,
      lat: center[0],
      lng: center[1],
      species: species.trim(),
      commonName: commonName.trim() || "",
      notes: notes.trim(),
      photoUrl: photoUrl.trim(),
      type,
      submittedAt: new Date().toISOString(),
    };
    const all = loadSubmissions();
    all.push(sub);
    saveSubmissions(all);
    onSubmit(sub);
    onClose();
  };

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/40" onClick={onClose} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5 mx-4
                        border border-sage animate-slide-up">
          <h3 className="text-lg font-bold text-forest mb-3">Add Observation 🌱</h3>
          <p className="text-xs text-gray-400 mb-3">
            Pin at: {center[0].toFixed(4)}, {center[1].toFixed(4)}
          </p>

          <div className="space-y-3">
            <div className="flex gap-2">
              <button onClick={() => setType("flower")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition
                  ${type === "flower" ? "bg-fern text-white border-fern" : "border-gray-200 text-gray-500 hover:border-fern"}`}>
                🌸 Flower
              </button>
              <button onClick={() => setType("tree")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition
                  ${type === "tree" ? "bg-amber-700 text-white border-amber-700" : "border-gray-200 text-gray-500 hover:border-amber-700"}`}>
                🌳 Tree
              </button>
            </div>

            <input type="text" placeholder="Species name *" value={species}
              onChange={e => setSpecies(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-fern" />

            <input type="text" placeholder="Common name (optional)" value={commonName}
              onChange={e => setCommonName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-fern" />

            <input type="text" placeholder="Photo URL (optional)" value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-fern" />

            <textarea placeholder="Notes: blooming, height, condition..." value={notes}
              onChange={e => setNotes(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-fern resize-none" />

            <div className="flex gap-2 pt-1">
              <button onClick={onClose}
                className="flex-1 py-2 text-sm font-semibold border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSubmit}
                disabled={!species.trim()}
                className="flex-1 py-2 text-sm font-semibold bg-fern text-white rounded-lg
                           hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed">
                Submit
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
