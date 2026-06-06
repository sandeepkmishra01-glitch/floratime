"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { FlowerData } from "@/types";

// Fix Leaflet's default icon paths (they break with bundlers)
delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const FLOWER_ICON = new L.DivIcon({
  className: "flower-marker",
  html: `<div style="
    width: 28px; height: 28px;
    background: linear-gradient(135deg, #5fb021, #468019);
    border-radius: 50% 50% 0 50%;
    transform: rotate(-45deg);
    border: 2px solid white;
    box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  "><span style="transform: rotate(45deg); font-size: 14px;">🌸</span></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

interface Props {
  flowers: FlowerData[];
  center: [number, number];
  zoom?: number;
  onFlowerClick?: (flower: FlowerData) => void;
}

export default function FlowerMap({
  flowers,
  center,
  zoom = 12,
  onFlowerClick,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<globalThis.Map<string, L.Marker>>(new globalThis.Map());

  // Initialize map once
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView(center, zoom);

    // OpenFreeMap tiles: free, no API key, zero tracking
    L.tileLayer("https://tiles.openfreemap.org/liberty/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://openfreemap.org">OpenFreeMap</a> | <a href="https://openstreetmap.org">OSM</a>',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when flowers change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove old markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

    // Add new markers
    flowers.forEach((flower) => {
      if (!flower.lat || !flower.lng) return;

      const marker = L.marker([flower.lat, flower.lng], { icon: FLOWER_ICON })
        .addTo(map)
        .bindPopup(
          `<div style="min-width: 180px;">
            ${
              flower.photoUrl
                ? `<img src="${flower.photoUrl}" alt="${flower.species}" 
                    style="width:100%;height:120px;object-fit:cover;border-radius:6px;margin-bottom:6px;" />`
                : ""
            }
            <strong>${flower.species}</strong>
            ${flower.commonName ? `<br/><em>${flower.commonName}</em>` : ""}
            ${
              flower.observedOn
                ? `<br/>📅 ${new Date(flower.observedOn).toLocaleDateString()}`
                : ""
            }
            ${flower.placeGuess ? `<br/>📍 ${flower.placeGuess}` : ""}
          </div>`,
          { maxWidth: 260 }
        );

      marker.on("click", () => {
        onFlowerClick?.(flower);
      });

      markersRef.current.set(flower.id, marker);
    });
  }, [flowers, onFlowerClick]);

  return (
    <div
      ref={containerRef}
      style={{ width: "100%", height: "100%", borderRadius: "0.5rem" }}
    />
  );
}
