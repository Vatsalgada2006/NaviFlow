# NaviFlow - India Journey Intelligence Engine

NaviFlow is a live-data journey intelligence engine for drivers anywhere in India. It operates 100% on free tools and APIs (no credit cards or paid map platforms required) and replaces fragmented driving tools by synthesizing travel time, live traffic delays, fuel & FASTag toll costs, verified highway amenities, and EV charging stops into a single, mathematically proven plan.

---

## 🌟 Key Features

1. **One Input. One Explained Plan**: Inputs are strictly: Origin, Destination, Vehicle Powertrain (Petrol, Diesel, CNG, EV presets for Indian cars/bikes), and Journey Style (Fast, Cheap, Comfort).
2. **Multi-Attribute Decision Engine**:
   - Normalized utility metrics: $\text{TimeScore} = \min(T)/T$, $\text{CostScore} = \min(C)/C$, plus verified comfort and stop-quality proxies.
   - Dynamic weight adaptation:
     - **Default**: 35% Time, 25% Cost, 20% Comfort, 20% Stop Quality
     - **Fast**: 50% Time, 20% Cost, 15% Comfort, 15% Stop Quality
     - **Cheap**: 20% Time, 50% Cost, 15% Comfort, 15% Stop Quality
     - **Comfort**: 20% Time, 20% Cost, 30% Comfort, 30% Stop Quality
   - Highest score wins deterministically with concrete explanation bullets (e.g. *"Route B: 9 min slower, ₹250 cheaper, better stops"*).
3. **Primary TomTom Traffic Routing & Dual-Request Strategy**:
   - Primary route call with `maxAlternatives=2`, live traffic delays (`traffic=true`), and ISO departure time (`departAt`).
   - Secondary route call with `avoid=tollRoads&traffic=true` to guarantee a true no-toll candidate.
   - Automatic route deduplication (filters candidates with >85% geographic overlap).
   - Minimizes quota usage to 2 calls per plan.
4. **Resilient Automatic OSRM Fallback**:
   - Seamlessly switches to OSRM public server if `TOMTOM_API_KEY` is not configured, or when rate limits (429) or quota limits are reached.
   - Labeled transparently as **"No live traffic"** and **"OSRM"** provider tag so users are never misled.
5. **TomTom Map Display Integration (Leaflet)**:
   - TomTom raster tiles proxied securely via backend `/api/map-tiles/:style/:z/:x/:y.png` with 24h caching and automatic Carto/OSM fallback (no client-side API keys exposed).
   - Renders chosen highway corridors in high-contrast cyan, alternate routes in dashed slate, and pins verified fuel, CNG, EV, food, and toll stops.
6. **EV Charging & Fuel Logic**: Real-world highway consumption modeling with 12% reserve buffer, fast-charging stop scheduling (₹20/kWh), and CNG station sparsity warnings.
7. **Vertical Journey Timeline**: Chronological arrival times, scheduled stops, toll plazas, durations, and costs.
8. **Live "What If?" Switcher**: Dynamically re-scores and re-ranks routes without server roundtrips or page reloads.
9. **Offline Saved Journeys**: Stored in browser `localStorage` with JSON export/import.
10. **Automated Verification Test Lab**: Live execution of T1 (Mumbai → Goa), T2 (Style Switch), T3 (EV Logic), T4 (Geofence Validation), mathematical hand-check card, weight sensitivity (±5%), and JSON audit export.
11. **Bilingual UI**: Full English and हिन्दी (Hindi) localization.
12. **In-Car Dashboard Mode**: High-contrast, glare-optimized display for vehicle phone mounts.

---

## 🛠️ Free Data Providers & Rate Limit Handling

| Provider | Purpose | Rate Limit & Limit Handling | Fallback Mechanism |
| :--- | :--- | :--- | :--- |
| **TomTom Routing API** | Primary Highway Routing & Live Traffic | 2,500 free calls/day, max 2 calls/plan, in-memory cache | Automatic OSRM routing fallback (labeled "No live traffic") |
| **TomTom Map Display API** | Vector/Raster Map Tiles | Proxied via server `/api/map-tiles`, 24h disk/memory cache | Carto Dark Matter / OpenStreetMap tiles |
| **Project OSRM** | Automatic Routing Fallback | Public server, 10–14s timeout with exponential backoff | Lateral waypoint candidate generator |
| **Photon (Komoot)** | Autocomplete typeahead | India bbox biased (`68°–98°E, 6°–36°N`), fair use, in-memory cache | Nominatim search fallback |
| **Nominatim (OSM)** | Geocoding & Reverse | Strictly enforced **1 req/sec** FIFO queue with 1200ms spacing | In-memory 24h LRU cache |
| **Overpass API** | Corridor POIs (Fuel, EV, Tolls) | Redundant mirrors (`overpass-api.de`, `kumi.systems`), 4km corridor buffer | Synthetic highway spacing model |
| **Gemini 3.8 Flash** | Today's Fuel Rates & Tolls | Grounded with Google Search tool, 24h cache | State Reference Matrix Table (`fuelFallback.ts`) |
| **Open Charge Map** | India EV Station Registry | Free API key, 40-result radius query | Overpass `amenity=charging_station` |

---

## 🔑 Environment Variables

The application starts and operates smoothly with only **`GEMINI_API_KEY`**, **`OCM_API_KEY`**, and **`TOMTOM_API_KEY`**:

```env
# GEMINI_API_KEY: Automatically injected in AI Studio.
# Used for server-side live fuel price search and toll rate estimation.
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# TOMTOM_API_KEY: Free key from https://developer.tomtom.com/
# Used for primary traffic-aware routing, avoid-tolls route, and Map Display tiles.
TOMTOM_API_KEY="YOUR_TOMTOM_API_KEY"

# OCM_API_KEY: Free key from https://openchargemap.org/
# Used for EV charging station discovery across India.
OCM_API_KEY="YOUR_OCM_API_KEY"

# PORT: Server port (defaults to 3000)
PORT=3000
```

---

## 🚀 Running the App

### Development
```bash
npm run dev
# Starts full-stack Express server on http://localhost:3000 with Vite middleware
```

### Production Build & Launch
```bash
npm run build
npm start
```

### Running Test Verification
1. Navigate to the **Test Lab** tab in the navigation bar.
2. Click **Run Live Suite** to execute live integration tests (T1–T4) and decision engine unit tests.
3. Click **Export Evidence** to download a verifiable JSON test certificate.

---

## 📜 Architectural Decisions & Ethical Disclosures
- **No Google Maps Platform**: Complies with the 100% free constraint without requiring credit cards or Google Cloud billing accounts.
- **TomTom Free Tier Preservation**: Exactly 2 routing queries per plan (`maxAlternatives=2` traffic route + `avoid=tollRoads` route), cached aggressively by origin-destination-time tuple.
- **Graceful Degradation**: If `TOMTOM_API_KEY` is missing or daily quota is exceeded, OSRM immediately takes over with clear "No live traffic" labeling.
- **Data Transparency**: Every metric has an interactive Source Chip (`Live`, `Web-sourced`, `Estimated`) disclosing provider, freshness, and fallbacks.
- **SDG Alignment**: Addresses UN SDG 11.2 (Sustainable Transport) and SDG 9.1 (Resilient Infrastructure) as intended architectural impact.
