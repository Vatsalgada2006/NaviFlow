# NaviFlow - India Journey Intelligence Engine

NaviFlow is the decision layer for road trips across India. Standard navigation maps give lines on a map; toll calculators give toll fees; EV apps list chargers. NaviFlow gives **ONE explained plan tailored for the driver's own vehicle**: *"Route B: 9 min slower, ₹250 cheaper, better stops, and why."*

Operates 100% on free tools and open APIs (no billing keys required) and synthesizes travel time, live traffic delays, fuel & FASTag toll costs, verified highway amenities, EV charging corridors, and weather safety into transparent weighted scoring.

---

## 🚀 Feature Status Matrix

| Capability / Feature | Status | Implementation Details |
| :--- | :---: | :--- |
| **No Minimising Dialogs / No Draggable Sheets** | **Implemented** | Mobile: ~35vh top map with full-map modal, vertically scrolling plan below. Desktop: fixed ~420px left panel that never collapses, interactive map fills the rest. |
| **Data Honesty & Zero Synthetic Fallbacks** | **Implemented** | Zero synthetic rest stops, zero seasonal weather baselines, zero fake numbers. If an external API is down, displays an honest message with a Retry button. |
| **Live Highway Routing** | **Implemented** | Live traffic feed with dual queries (`avoid=tollRoads` and alternatives) cached by corridor and departure hour. Automatic fallback to road network alignment labeled "Normal travel time (No live traffic)". |
| **Stale Request Cancellation** | **Implemented** | `AbortController` attached to planning queries; cancels in-flight network requests immediately when user modifies search or changes corridors. |
| **Planning Skeleton & Progress Text** | **Implemented** | Responsive skeleton with rotating plain progress stages delivering plans in ~10 seconds. |
| **Quick-Start Live Corridor Chips** | **Implemented** | One-tap live execution for Mumbai → Pune, Mumbai → Goa, Delhi → Jaipur, Bengaluru → Chennai. |
| **Returning User Memory** | **Implemented** | Persists last origin, destination, vehicle, and style in `localStorage`; displays last 3 trips as one-tap chips. |
| **Transparent Weighted Scoring** | **Implemented** | Multi-attribute utility function across Time, Cost, Comfort, and Stop Quality with Fast, Cheap, and Comfort policies. |
| **Toll Concession Rules** | **Implemented** | FASTag return discount (default 25% for return within 24h) is configurable in Settings and labeled "Estimated, verify with NHAI". |
| **EV Range & Charger Intelligence** | **Implemented** | Enforces ≥10% reserve buffer, checks charger connector type and power (≥50kW), adds real charging minutes to total transit duration. |
| **CNG Pump Sparsity Alerts** | **Implemented** | Corridors with sparse CNG stations display amber warning advisories and suggest carrying emergency fuel reserves. |
| **Unreachable Gap Banner** | **Implemented** | If no verified EV fast charger is reachable before battery drops below 10%, displays a prominent gap notice with nearby suggestions. |
| **Corridor Weather Radar** | **Implemented** | Hourly temperature and rain/aquaplaning hazard detection along corridor points, with an explicit Retry button if unavailable. |
| **Road Safety & Fatigue Layer** | **Implemented** | Real 24/7 highway patrol chowkis, government trauma hospitals, puncture repair hubs, and fatigue rest recommendations. |
| **Evaluator Page & Hermetic Tests** | **Implemented** | Full-page review route with live integration tests (T1–T4), physical sanity checks assertions, deterministic hand-check calculation proof, and ±5% weight sensitivity analysis. |
| **PWA Installability** | **Implemented** | Web App Manifest, PNG & SVG icons, app-shell service worker caching, in-app install button with iOS Safari guide. |
| **Calm Road-App Theme & Typography** | **Implemented** | Highway green `#0B6B3A`, amber `#F5A524`, orange `#EA580C`, red `#DC2626`. Inter typography, strict minimum 14px text, tabular numbers, touch targets ≥44px. |

---

## 🛡️ Data Honesty & Invariants

NaviFlow enforces strict data honesty policies:
1. **Zero Synthetic Stops**: Only stops verified in OpenStreetMap or Open Charge Map along the corridor are displayed. If no stop exists, an honest empty notice is displayed.
2. **Zero Weather Baselines**: If the weather provider fails, an honest "Weather unavailable right now" message with a Retry button is shown.
3. **Allowed Static Matrices**: Only vehicle specification presets, the editable state fuel reference table (marked with `~` and "Estimated"), and estimated toll rates.
4. **Dev-Time Physical Invariants**:
   - Distance within ±15% of routing provider geometry.
   - Transit duration > 0 minutes.
   - Non-negative financial costs (fuel/energy, tolls, per-person share ≥ ₹0).
   - Stop coordinates located strictly within corridor bounding box.
   - EV battery state on arrival never < 0% (target ≥ 10% reserve).
   - Timeline arrival timestamps strictly monotonically increasing.

---

## 🌟 Algorithmic Scoring Pipeline

Each candidate route is normalized and scored across 4 primary attributes:
- $\text{TimeScore} = \frac{\min(T)}{T}$
- $\text{CostScore} = \frac{\min(C)}{C}$
- $\text{ComfortScore} \in [0, 1]$ (Expressway fraction, turns per 100km, surface smoothness, toll friction, night driving risk)
- $\text{StopQualityScore} \in [0, 1]$ (Verified amenity completeness: clean washrooms, 24/7 food plazas, lighting, secure parking, EV ≥50kW DC fast power)

Weights by Journey Style:
- **Fast Policy**: $0.50 \times \text{Time} + 0.20 \times \text{Cost} + 0.15 \times \text{Comfort} + 0.15 \times \text{Stops}$
- **Cheap Policy**: $0.50 \times \text{Cost} + 0.20 \times \text{Time} + 0.15 \times \text{Comfort} + 0.15 \times \text{Stops}$
- **Comfort Policy**: $0.30 \times \text{Comfort} + 0.30 \times \text{Stops} + 0.20 \times \text{Time} + 0.20 \times \text{Cost}$

---

## 🛠️ Free Live Data Providers & Free-Tier Quotas

| Service | Role | Free Limits & Resilience |
| :--- | :--- | :--- |
| **TomTom Routing API** | Primary routing & live traffic | 2,500 daily requests free tier. Server-side caching by corridor + departure hour (`h${depHour}`). |
| **Project OSRM** | Fallback road network routing | Public OpenStreetMap routing cluster. Automatic fallback labeled "Normal travel time (No live traffic)". |
| **Open-Meteo API** | Corridor weather radar & alerts | 100% free, no API key required, 10,000 daily calls. Zero synthetic data. |
| **Photon (Komoot)** | Autocomplete typeahead | Free public geocoding biased to India bounding box (`68°–98°E, 6°–36°N`). |
| **Nominatim (OSM)** | Geocoding & reverse geocoding | Strictly enforced 1 req/sec rate limiter queue with 24-hour LRU cache. |
| **Overpass API** | Corridor POIs (amenities, safety) | Free public servers (`overpass-api.de`, `kumi.systems`). Corridor offset query. |
| **Gemini Flash (Search Grounding)** | Live retail fuel grounding | Server-side retail pump rate lookup with state-specific reference table fallback. |
| **Open Charge Map (OCM)** | EV fast charging registry | Free API key with server-side caching. |

---

## 🔑 Environment Variables

```env
PORT=3000
GEMINI_API_KEY=""
TOMTOM_API_KEY=""
OCM_API_KEY=""
```

All API keys are securely accessed server-side only. No client secrets are exposed.

---

## 💻 Development & Build

```bash
# Install dependencies
npm install

# Start full-stack development server (Express + Vite on Port 3000)
npm run dev

# Check TypeScript types
npm run lint

# Production build
npm run build

# Start production server
npm start
```
