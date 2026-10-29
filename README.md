# NaviFlow - India Journey Intelligence Engine

NaviFlow is the decision layer for road trips across India. Standard navigation maps give routes; toll calculators give toll fees; EV apps list chargers. NaviFlow gives **ONE explained plan tailored for the driver's own vehicle**: *"Route B: 9 min slower, ₹250 cheaper, better stops, and why."*

It operates 100% on free tools and open APIs (no billing credit cards required) and synthesizes travel time, live traffic delays, fuel & FASTag toll costs, verified highway amenities, EV charging corridors, and weather safety into a single, mathematically proven plan.

---

## 🚀 Feature Status Matrix

| Capability / Feature | Status | Implementation Details |
| :--- | :---: | :--- |
| **One-Screen Map & Card Flow** | **Implemented** | Full-bleed Leaflet map with floating desktop planner card & mobile draggable bottom sheet (peek / half / full). No page jumps. |
| **TomTom Primary Traffic Routing** | **Implemented** | `maxAlternatives=2` + `avoid=tollRoads` dual query with `traffic=true` and departure timestamps. |
| **Resilient OSRM Fallback** | **Implemented** | Instant automatic switchover if TomTom hits 429 quota or missing key. Labeled "No live traffic". |
| **Quick-Start Live Corridor Chips** | **Implemented** | Mumbai → Pune, Mumbai → Goa, Delhi → Jaipur, Bengaluru → Chennai execute live searches on click. |
| **Multi-Criteria Scoring Engine** | **Implemented** | Continuous normalized utility scoring across Time, Cost, Comfort, and Stop Quality with Fast / Cheap / Comfort policies. |
| **Optional Refine Options** | **Implemented** | Collapsed refine row: Passengers (1–7 cost split), Avoid Tolls, Vegetarian food, Clean washrooms, Family/women friendly, Pet-friendly. |
| **Hero Journey Timeline** | **Implemented** | Chronological checkpoints with arrival times, detour minutes, stop duration, cost, amenity chips, battery/fuel levels, and "Safe to skip?" hints. |
| **Range & Fuel Buffer Bar** | **Implemented** | Corridors analyzed for the lowest buffer point; warns before reserve thresholds. |
| **"Leave Now vs Later" Comparison** | **Implemented** | Compares 3 departure time slots (Now, +1h, +2h) using TomTom traffic and recommends the optimal window. |
| **Comprehensive Cost Card** | **Implemented** | Energy/fuel, FASTag tolls, per-person split, round-trip with 25% FASTag return discount, EV vs Petrol savings. |
| **Corridor Weather & Safety Layer** | **Implemented** | Open-Meteo live temperatures & rain/heat warnings; Overpass hospitals, police chowkis, and 24/7 tyre repair hubs. |
| **Fatigue & Night Driving Advisories**| **Implemented** | Recommends break after 2 hours of continuous cruising; night-driving caution for unlit corridor stretches. |
| **Trust, Honesty & Source Chips** | **Implemented** | Every number carries a Live / Web-sourced / Estimated chip with timestamp; "How we score" modal explains objective stop quality (no fake ratings). |
| **Actions: Share, Save, Print, Maps** | **Implemented** | WhatsApp direct sharing, copy link with query params, Print/PDF stylesheet, Google Maps waypoints, Report Wrong Info. |
| **PWA Installability** | **Implemented** | Web App Manifest, PNG & SVG icons, app-shell workbox caching, in-app install button with iOS Safari guide. |
| **Bilingual Localisation** | **Implemented** | English and हिन्दी (Hindi) with Indian number formatting (`₹`, `km`, `en-IN`). |
| **Auto Day/Night & Dashboard Mode** | **Implemented** | Auto theme follows time-of-day/system with manual override; high-contrast Dashboard Mode for in-car mounts. |
| **Evaluator Suite Isolation** | **Implemented** | Test Lab (T1–T4 automated tests) & Methodology whitepaper housed in dedicated "For Evaluators" dialog. |
| **Crowdsourced Toll Crowd-reporting**| **Planned** | Community verified toll photo OCR pipeline. |
| **OBD-II Bluetooth Telemetry** | **Planned** | Live State-of-Charge (SoC) ingestion via Web Bluetooth. |

---

## 🌟 Architecture & Information Model

### 1. Minimal 3-Tab Main Nav
The main navigation is strictly focused on driver utility:
- **Plan**: Full-bleed interactive map and floating decision card.
- **Saved**: Offline library of saved routes with JSON export/import.
- **Settings**: Theme (Auto/Light/Dark), In-Car Dashboard Mode, and Language.

Footer links provide transparent access without cluttering the primary driving UI:
- **About**: NaviFlow's product mission and highway decision science.
- **Data sources**: Real-time provider health dashboard.
- **For evaluators**: Holds the automated Test Lab suite (T1–T4 live integration tests) and the complete algorithmic methodology paper.

### 2. Decision Engine Multi-Attribute Utility Function

Each candidate route is normalized across 4 dimensions:
- $\text{TimeScore} = \frac{\min(T)}{T}$
- $\text{CostScore} = \frac{\min(C)}{C}$
- $\text{ComfortScore} \in [0, 1]$ (Expressway fraction, turns per 100km, surface smoothness, toll friction, night penalty)
- $\text{StopQualityScore} \in [0, 1]$ (Verified amenity completeness: clean washrooms, 24/7 dining, lighting, secure parking, EV 50kW+ power)

Weights by Journey Style:
- **Fast Policy**: $0.50 \times \text{Time} + 0.20 \times \text{Cost} + 0.15 \times \text{Comfort} + 0.15 \times \text{Stops}$
- **Cheap Policy**: $0.50 \times \text{Cost} + 0.20 \times \text{Time} + 0.15 \times \text{Comfort} + 0.15 \times \text{Stops}$
- **Comfort Policy**: $0.30 \times \text{Comfort} + 0.30 \times \text{Stops} + 0.20 \times \text{Time} + 0.20 \times \text{Cost}$

---

## 🛠️ Free Live Data Providers

| Provider | Purpose | Rate Limit & Handling | Fallback |
| :--- | :--- | :--- | :--- |
| **TomTom Routing API** | Primary Routing & Live Traffic | 2,500 daily requests free plan; cached by corridor | Automatic OSRM fallback ("No live traffic") |
| **TomTom Map Display API**| Raster Tiles | Server-side proxy with 24h cache | OpenStreetMap / Carto raster tiles |
| **Project OSRM** | Fallback Routing Engine | Public server, timeout backoff | Lateral waypoint candidate generator |
| **Open-Meteo Weather API** | Corridor Weather & Warnings | 100% Free, No API key, 10,000 daily calls | Standard seasonal baseline |
| **Photon (Komoot)** | Autocomplete Typeahead | Biased to India bounding box (`68°–98°E, 6°–36°N`) | Nominatim search queue |
| **Nominatim (OSM)** | Geocoding & Reverse | Strictly enforced 1 req/sec FIFO queue | In-memory 24h LRU cache |
| **Overpass API** | Corridor POIs (Amenities, Safety) | Redundant mirrors (`overpass-api.de`, `kumi.systems`) | Synthetic corridor spacing model |
| **Gemini 3.8 Flash** | Live Fuel Price Grounding | Google Search tool grounding | State Reference Matrix (`fuelFallback.ts`) |
| **Open Charge Map (OCM)** | EV Charging Registry | Live OCM registry key | Overpass `amenity=charging_station` |

---

## 🔑 Environment Variables

```env
PORT=3000
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"
TOMTOM_API_KEY="YOUR_TOMTOM_API_KEY"
OCM_API_KEY="YOUR_OCM_API_KEY"
```

---

## 🚀 Running the App

```bash
# Install dependencies
npm install

# Start development server (Port 3000)
npm run dev

# Run TypeScript linter
npm run lint

# Production build
npm run build
npm start
```
