"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { FlowerData } from "@/types";
import { UserSubmission } from "@/types/submissions";

function fixLeafletIcons() {
  delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
    iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
    shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  });
}

let FLOWER_ICON: L.DivIcon | null = null;
function getFlowerIcon(): L.DivIcon {
  if (!FLOWER_ICON) {
    FLOWER_ICON = new L.DivIcon({
      className: "flower-marker",
      html: `<div style="
        width: 26px; height: 26px;
        background: linear-gradient(135deg, #5fb021, #468019);
        border-radius: 50% 50% 0 50%;
        transform: rotate(-45deg);
        border: 2px solid white;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex; align-items: center; justify-content: center;
      "><span style="transform: rotate(45deg); font-size: 13px;">🌸</span></div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 26],
      popupAnchor: [0, -26],
    });
  }
  return FLOWER_ICON;
}

function esc(s: string | null | undefined): string {
  if (!s) return "";
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#039;");
}

function fmtDate(d: string | null): string {
  if (!d) return "";
  try {
    const clean = d.split("/")[0].trim();
    const date = new Date(clean);
    if (isNaN(date.getTime())) return "";
    return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  } catch { return ""; }
}

interface Props {
  flowers: FlowerData[];
  center: [number, number];
  zoom?: number;
  onFlowerClick?: (flower: FlowerData) => void;
  onMoveEnd?: (center: [number, number]) => void;
  submissions?: UserSubmission[];
}

const TILE_URL = "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | <a href="https://carto.com/">CARTO</a>';

export default function FlowerMap({ flowers, center, zoom = 12, onFlowerClick, onMoveEnd, submissions }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const subMarkersRef = useRef<L.Marker[]>([]);
  const tileRef = useRef<L.TileLayer | null>(null);

  // Init map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    if (typeof window === "undefined") return;

    fixLeafletIcons();
    const map = L.map(containerRef.current).setView(center, zoom);

    tileRef.current = L.tileLayer(TILE_URL, {
      attribution: TILE_ATTR,
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    if (onMoveEnd) {
      map.on("moveend", () => {
        const c = map.getCenter();
        onMoveEnd([c.lat, c.lng]);
      });
    }

    return () => { map.remove(); mapRef.current = null; tileRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update flower markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    flowers.forEach(f => {
      if (!f.lat || !f.lng) return;
      const photo = f.photoUrl
        ? `<img src="${esc(f.photoUrl)}" alt="${esc(f.species)}"
              style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:4px;"
              onerror="this.style.display='none'" />`
        : "";
      const date = fmtDate(f.observedOn);

      const marker = L.marker([f.lat, f.lng], { icon: getFlowerIcon() })
        .addTo(map)
        .bindPopup(
          `<div style="min-width:160px;max-width:240px;font-family:'Source Sans Pro',sans-serif;">
            ${photo}
            <strong style="color:#1e352f;">${esc(f.species)}</strong>
            ${f.commonName ? `<br/><em style="color:#5fb021;">${esc(f.commonName)}</em>` : ""}
            ${date ? `<br/><span style="font-size:12px;">📅 ${date}</span>` : ""}
          </div>`,
          { maxWidth: 260 }
        );

      marker.on("click", () => onFlowerClick?.(f));
      markersRef.current.set(f.id, marker);
    });
  }, [flowers, onFlowerClick]);

  // Render user submissions
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    subMarkersRef.current.forEach(m => m.remove());
    subMarkersRef.current = [];

    if (submissions?.length) {
      const subIcon = new L.DivIcon({
        className: "flower-marker",
        html: `<div style="width:24px;height:24px;background:#f59e0b;border-radius:50%;border:2px solid white;box-shadow:0 2px 4px rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center;"><span style="font-size:12px;">📝</span></div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12],
      });

      submissions.forEach(s => {
        const m = L.marker([s.lat, s.lng], { icon: subIcon })
          .addTo(map)
          .bindPopup(`<div style="min-width:150px;font-family:'Source Sans Pro',sans-serif;">
            <strong>${esc(s.species)}</strong>
            ${s.commonName ? `<br/><em>${esc(s.commonName)}</em>` : ""}
            ${s.notes ? `<br/><span style="font-size:11px;">${esc(s.notes)}</span>` : ""}
            <br/><span style="font-size:10px;color:#999;">Added by community</span>
          </div>`, { maxWidth: 220 });
        subMarkersRef.current.push(m);
      });
    }
  }, [submissions]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
