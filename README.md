# Neptune — Industrial Waste Heat Compliance & Trading Platform (by jua2.0)

Neptune matches heavy industrial grid emitters (like high-density edge Data Centers) generating unrecovered waste heat with near-proximity heat sinks (like district heating operations, water treatment infrastructure, greenhouse hubs, and textile mills). 

It converts a regulatory punishment—specifically under **EU Energy Efficiency & CE-Directives (DDADUE laws)** restricting compute centers with low waste-heat reuse metrics—into a liquid, tradeable grid asset.

---

## 1. Core Technical Pillars

1. **Compliance Guard**: Performs rolling 30-day calculations of the facility's **Energy Reuse Factor (ERF)** against legal thresholds (default 20%). Computes remaining countdown days to penalties.
2. **Geospatial Matchmaking Engine**: Plots physical coordinate sets and uses high-precision **Great-Circle Haversine distance computations** (mimicking PostGIS ST_Distance) to calculate real-world pipe network route lengths, heat dissipation factors, and volume fit alignment scores.
3. **Flow Contracts Ledger & Settlement**: Dispatches raw IoT meter logs to resolve energy exchanges, records financial earnings settlements (e.g. €/GJ exchanges), and certifies offsets through SHA-256 backed Carbon Offset certificate blocks.

---

## 2. Dynamic Simulator Layout

The system starts a background simulation daemon (`simulator.ts` running on 5s pulses) that:
- Drifts **exhaust exit temperatures** ($\pm0.5^\circ\text{C}$ inside realistic $55^\circ\text{C}$ – $75^\circ\text{C}$ bounds) and **compute network loading metrics** ($\pm3\%$ inside $40\%$ – $95\%$ ranges).
- Re-calculates maximum available capacity peak outputs (adjusting thermal output from $5.0$ to $15.0$ Megawatts).
- Automatically converts system loading capacity to **volumetric energy deliveries (GJ)** relative to active pipeline contracts:
  $$\text{GJ Delivered} = \text{Peak MWth} \times 5 \text{ seconds} \times 0.005$$
- Randomly drifts four macro green energy trading indices.
- Feeds connected clients dynamically using an **HTML5 Server-Sent Events (SSE)** pipeline on port 3000.

---

## 3. Mathematical Equations

### Geospatial Compatibility Score
For each potential buyer within search radius $R$:
1. **Pipe thermal loss deduction**:
   $$T_{\text{effective}} = T_{\text{exit}} - \left( d_{\text{distance}} \times 0.5^\circ\text{C/km} \right)$$
   *If $T_{\text{effective}} < T_{\text{required}}$, the candidate is excluded from matching lists.*
2. **Parameter Compatibility Factors**:
   $$\text{Temp Compatibility} = \text{clamp}\left(1 - \frac{T_{\text{effective}} - T_{\text{required}}}{30}, 0, 1\right)$$
   $$\text{Proximity Score} = \text{clamp}\left(1 - \frac{d_{\text{distance}}}{R}, 0, 1\right)$$
   $$\text{Volume Alignment} = \text{clamp}\left(\frac{\min(\text{Supply}_{GJe},\text{Demand}_{GJ})}{\max(\text{Supply}_{GJe},\text{Demand}_{GJ})}, 0, 1\right)$$
3. **Composite Match Rating**:
   $$\text{Match Score} = \text{round}\left( \left[ \text{TempComp} \times 0.4 + \text{Proximity} \times 0.35 + \text{Volume} \times 0.25 \right] \times 100 \right)$$

### Energy Reuse Factor (ERF) Compliance Index
$$\text{ERF}_{30d} = \frac{\sum_{i=1}^{n} \text{GJ}_{\text{delivered}} \text{ (over last 30 rolling days)}}{\text{Peak Capacity MWth} \times 2592}$$
- **Compliant**: $\text{ERF}_{30d} \ge \text{Threshold}$ (default $20\%$)
- **At Risk**: $\text{ERF}_{30d} \ge 0.8 \times \text{Threshold}$
- **Violation**: $\text{ERF}_{30d} < 0.8 \times \text{Threshold}$

---

## 4. REST Endpoint API Index

All service calls must incorporate a bearer authorization header where required (`Authorization: Bearer <JWT_Token>`).

### Auth Directory
* `POST /api/v1/auth/register`: Create operational credentials.
* `POST /api/v1/auth/login`: Issue continuous JWT access token.
* `POST /api/v1/auth/refresh`: Check and renew tokens.

### Infrastructure & Telemetry
* `GET /api/v1/facilities`: List node structures. Pass `?mine=true` to isolate owned yards.
* `POST /api/v1/facilities`: Create local coordinates, dimensions, types, and cooling setups.
* `PATCH /api/v1/facilities/:id/thermal-profile`: Manually feed or adjust active grid parameters.
* `GET /api/v1/facilities/:id/compliance`: Read automated compliance factor logs and deadlines.

### Spatial Matching & Trading
* `GET /api/v1/matches/nearby?facilityId=<id>&radiusKm=<km>`: Live spatial projection calculations.
* `POST /api/v1/matches/:id/propose`: Transmit pipe interface link प्रस्ताव (proposal).
* `POST /api/v1/contracts/:matchId/accept`: Execute contract and lock flow rate.
* `GET /api/v1/contracts/:id/deliveries`: Retain historical and live metered flow deliveries page scans.
* `POST /api/v1/carbon-credits/generate`: Lock deliveries and issue cryptographic SHA-256 certificate hashes.

### Event Broadcasting Stream
* `GET /api/v1/stream`: Client real-time EventSource telemetry hooks.

---

## 5. Development & Verification Guide

### Quick Install & Run
Start local development with standard Node.js scripts:
```bash
# Clean previous builds
npm run clean

# Run local server + React front-end (Vite)
npm run dev
```

### Build & Package Bundling
Run production package generation:
```bash
# Builds SPA client-side and compiles server.ts cleanly using esbuild to CJS
npm run build

# Start live production stack
npm run start
```

### Static Analysis
```bash
# Verify absolute type-safety of front-end and back-end logic
npm run lint
```
