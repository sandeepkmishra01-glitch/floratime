"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet.heat";
import { FlowerData } from "@/types";

// Fix Leaflet default icon paths
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FLOWER_ICON = new L.DivIcon({
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
  showHeatmap?: boolean;
  onFlowerClick?: (flower: FlowerData) => void;
}

export default function FlowerMap({ flowers, center, zoom = 12, showHeatmap = false, onFlowerClick }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());
  const heatRef = useRef<L.Layer | null>(null);

  // Init map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const map = L.map(containerRef.current).setView(center, zoom);

    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> | <a href="https://carto.com/">CARTO</a>',
      subdomains: "abcd",
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    return () => { map.remove(); mapRef.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach(m => m.remove());
    markersRef.current.clear();

    if (showHeatmap) {
      // Heatmap mode: hide individual markers, show density layer
      const points: [number, number, number][] = flowers
        .filter(f => f.lat && f.lng)
        .map(f => [f.lat, f.lng, 0.5] as [number, number, number]);

      if (heatRef.current) heatRef.current.remove();
      if (points.length > 0) {
        heatRef.current = (L as any).heatLayer(points, {
          radius: 25,
          blur: 15,
          maxZoom: 10,
          gradient: { 0.2: "#dfefd3", 0.5: "#5fb021", 0.8: "#468019", 1.0: "#1e352f" },
        }).addTo(map);
      }
    } else {
      // Marker mode
      if (heatRef.current) { heatRef.current.remove(); heatRef.current = null; }

      flowers.forEach(f => {
        if (!f.lat || !f.lng) return;
        const photo = f.photoUrl
          ? `<img src="${esc(f.photoUrl)}" alt="${esc(f.species)}"
                style="width:100%;height:100px;object-fit:cover;border-radius:4px;margin-bottom:4px;"
                onerror="this.style.display='none'" />`
          : "";
        const date = fmtDate(f.observedOn);

        const marker = L.marker([f.lat, f.lng], { icon: FLOWER_ICON })
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
    }
  }, [flowers, showHeatmap, onFlowerClick]);

  return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
}
