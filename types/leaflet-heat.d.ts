declare module "leaflet.heat" {
  import * as L from "leaflet";

  interface HeatLatLngTuple extends Array<number> {
    0: number; // lat
    1: number; // lng
    2?: number; // intensity
  }

  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatLayerOptions
  ): L.Layer;
}
