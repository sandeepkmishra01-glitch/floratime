# FloraTime 🌸

Explore flowering plants across the USA — powered by GBIF, styled like OregonFlora.

**floratime.railway.app** (or your Railway URL)

## What it does

- Interactive Leaflet map showing flowering plant observations from GBIF
- Search any US city → map flies there
- Filter by month (e.g. April blooms)
- Sidebar species checklist — check/uncheck to filter map
- Click a flower marker or species name → detail panel with photo, date, location
- Community observations (localStorage, no account needed)

## Stack

| Layer | Tech |
|-------|------|
| Framework | Next.js 15 (App Router) |
| Map | Leaflet + CARTO light tiles |
| Flower data | GBIF Occurrence API (free, no key) |
| Geocoding | OpenStreetMap Nominatim |
| Deployment | Railway (auto-build from GitHub) |

All APIs are free and key-less.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000

## Build for production

```bash
npm run build
npm start
```

## Project structure

```
floratime/
├── app/
│   ├── page.tsx              ← Main page (header, map, sidebar)
│   ├── layout.tsx
│   ├── globals.css
│   ├── api/
│   │   ├── flowers/          ← GBIF proxy (/api/flowers?lat=&lng=&month=)
│   │   ├── species-info/     ← Wikidata enrichment (optional)
│   │   └── area-info/        ← Overpass park info (optional)
│   └── components/
│       ├── Map.tsx            ← Leaflet map + markers
│       ├── FlowerDetails.tsx  ← Detail panel (click a flower)
│       ├── SpeciesSidebar.tsx ← Species checklist sidebar
│       ├── AddObservation.tsx ← Community submission form
│       ├── DropdownPortal.tsx ← Portal-based dropdown
│       ├── Portal.tsx
│       └── ErrorBoundary.tsx
├── lib/
│   └── gbif.ts               ← GBIF API client
├── types/
│   ├── index.ts              ← FlowerData type
│   └── submissions.ts        ← UserSubmission type
└── public/
```

## APIs

### GBIF (flowers)
`/api/flowers?lat=38.9&lng=-77.0&radius=30&month=4&per_page=100`

Returns observations around a point, month-filtered. No API key needed.

### Nominatim (geocoding)
Client-side fetch to `nominatim.openstreetmap.org` with `User-Agent: FloraTime/1.0`.

## Design

Palette inspired by OregonFlora:
- Forest `#1e352f` — headers, text
- Fern `#5fb021` — accents, buttons
- Sage `#d4e4d0` — backgrounds
- Cream `#fefdf8` — page background

Font: Source Sans Pro (Google Fonts)

## License

MIT
