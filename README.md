# NaviFlow - India Journey Intelligence Engine

NaviFlow is the decision layer for road trips across India. Standard navigation maps give lines on a map; toll calculators give toll fees; EV apps list chargers. NaviFlow gives **ONE explained plan tailored for the driver's own vehicle**: *"Route B: 9 min slower, ₹250 cheaper, better stops, and why."*

Operates 100% on free tools and open APIs (no billing keys required) and synthesizes travel time, live traffic delays, fuel & FASTag toll costs, verified highway amenities, EV charging corridors, and weather safety into transparent weighted scoring.

---

## 🚀 Feature Status Matrix

| Capability / Feature | Status | Implementation Details |
| :--- | :---: | :--- |
| **Desktop 440px Panel & Live Leaflet Map** | **Implemented** | Desktop: fixed 440px left panel that never collapses, map container has explicit 100% height minus header with `invalidateSize()` timers on layout/resize/route change, automatic tile fallback with retry banner. Single column at ≤768px. |
| **First Open Planner Experience** | **Implemented** | Fresh visit shows the planner with 4 inputs (From, To, Vehicle, Style), "Plan my journey" button, and quick-start chips on live map of India. Returning users see a prominent "Continue your last trip: Origin → Destination" chip plus last 3 trips as 1-tap chips. |
| **Glanceable Summary Card (No Clipping)** | **Implemented** | Line 1 plain recommendation sentence, then a 2×2 grid of equal tiles (`min-width: 0`): Arrive by, Total time ("2 h 32 min"), Total cost ("~₹1,147"), Stops. Bold values clamp(24px, 2.2vw, 32px), tabular numbers, cost per person only when passengers > 1, single clean status line. |
| **Data Honesty & Zero Contradictory Claims** | **Implemented** | 0-stop routes accurately report "no stop needed on this route" and never claim better stop quality. Headline min/₹ differences strictly match underlying numbers. Unit test suite asserts 10 diverse plans pass data consistency. |
| **Journey Timeline with FASTag Tolls** | **Implemented** | First checkpoint shows "Start · 1:26 pm · Origin" with "Starting with a full tank" (or "Starting at 80% charge" for EVs) and NO odometer text. Toll plazas along corridor are interleaved chronologically with fee and automated deduction note. |
| **No Minimising Dialogs / No Draggable Sheets** | **Implemented** | Mobile: ~35vh top map with full-map modal, vertically scrolling plan below. Desktop: fixed 440px left panel that never collapses, interactive map fills the rest. |
| **Plan In One Sentence (NL Input)** | **Implemented** | Natural language text box + Web Speech API mic button. Gemini 3.8 Flash extracts origin, destination, vehicle, style, and stops with strict JSON schema; pre-fills form for 1-tap confirmation. |
| **Personalised Weights (Explainable ML)** | **Implemented** | On-device Bradley–Terry pairwise logistic regression on anonymous choices. Blends `0.7*style + 0.3*learned`, bounded between `0.05` and `0.60`, sum = 1.00. Replay experiment in Evaluator page. |
| **Grounded Trip Q&A** | **Implemented** | Ask about any planned trip. Gemini 3.8 Flash answers strictly from plan JSON with server-side numeric post-validation check to prevent hallucinated numbers. Highlights referenced stops. |
| **Intermediate Via-Stops (Waypoints)** | **Implemented** | Multi-waypoint planning up to 3 intermediate stops re-planned seamlessly across national highway corridors. |
| **Arrive-By Timing Mode** | **Implemented** | Set target arrival time; NaviFlow computes latest recommended departure time factoring traffic and halts, with `.ics` calendar reminder download. |
| **Night Driving Safety & Overnight Halt** | **Implemented** | "Avoid driving after 10 PM" preference automatically schedules a safe overnight halt in a highway town with nearby accommodation. |
| **Meal Windows Alignment** | **Implemented** | Schedules stops to align with lunch (12:30–2:30 PM) and dinner (7:30–9:30 PM) windows, respecting vegetarian dietary preferences. |
| **Side-by-Side Vehicle Comparison** | **Implemented** | Compare fuel/charging expenses, stops, and total journey costs side-by-side with any other vehicle preset. |
| **Offline Plan Caching** | **Implemented** | IndexedDB stores full geometries, stops, and candidate plans for reliable offline access without internet connectivity. |
| **10-Second Post-Trip Feedback** | **Implemented** | Thumbs up/down with reason tags to calibrate highway corridor models anonymously. |
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
| **Evaluator Page & Hermetic Tests** | **Implemented** | Full-page review route with 9 unit tests, live integration tests (T1–T4), ML choice replay experiment, physical sanity check assertions, and deterministic hand-check proof. |
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

Standard Weights by Journey Style:
- **Fast Policy**: $0.50 \times \text{Time} + 0.20 \times \text{Cost} + 0.15 \times \text{Comfort} + 0.15 \times \text{Stops}$
- **Cheap Policy**: $0.50 \times \text{Cost} + 0.20 \times \text{Time} + 0.15 \times \text{Comfort} + 0.15 \times \text{Stops}$
- **Comfort Policy**: $0.30 \times \text{Comfort} + 0.30 \times \text{Stops} + 0.20 \times \text{Time} + 0.20 \times \text{Cost}$

### Explainable On-Device ML Personalization:
- User choices (saving, sharing, opening in Maps) are logged anonymously to localStorage.
- After $\ge 10$ choices, a pairwise logistic regression (Bradley–Terry) model fits weights on-device in pure TypeScript.
- Blended formula: $\text{Final} = 0.7 \times \text{Style} + 0.3 \times \text{Learned}$, bounded in $[0.05, 0.60]$ and normalized to sum to $1.00$.

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
| **Gemini 3.8 Flash** | Natural language trip parsing & grounded Q&A | Server-side with strict JSON schema, temperature 0, and numeric validation filter. |
| **Open Charge Map (OCM)** | EV fast charging registry | Free API key with server-side caching. |

---

## 🔑 Environment Variables

```env
APP_PORT=3000
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

# Compile and check types
npm run build
```
