# 🌱 AgriChain Trace

A farm-to-market traceability platform. A farmer registers a crop batch, a photo
gets scored by an AI quality service, the batch is minted as an NFT on a
Polygon-compatible chain, and the money sits in escrow until the buyer confirms
delivery. Every step is recorded on-chain and mirrored off-chain so the dashboard
stays fast and readable.

The whole stack runs with one command:

```bash
cp .env.example .env
docker compose up --build
```

Then open **http://localhost:3000**.

---

## What's in the box

| Layer | Stack | Port | Directory |
| --- | --- | --- | --- |
| Farmer dashboard | Next.js 15 · React 19 · TypeScript · Tailwind | 3000 | `frontend/` |
| REST API | Node 22 · Express 4 · Mongoose 8 · Zod | 4000 | `backend/` |
| Quality assessment | Python 3.12 · FastAPI · Pydantic v2 | 8000 | `ai-service/` |
| Smart contract | Solidity 0.8.28 · Hardhat · OpenZeppelin 5 | 8545 | `contracts/` |
| Database | MongoDB 7 | 27017 | (volume) |

### The dashboard

Four panels, each built around a distinct illustrated icon so a farmer can
navigate by picture rather than by reading:

- **Register New Batch** — crop type, quantity in kg, price per kg, and a
  drag-and-drop photo area that runs the AI quality check on submit. The
  estimated batch value updates as you type.
- **Active Crop Batches** — one card per batch showing its code (`AGT-2931`),
  crop and weight, quality grade, an illustrated progress road, and the single
  next action available to it. Searchable and filterable by status.
- **Farmer Wallet** — spendable balance and escrowed balance shown as two
  separate tiles (never one combined number), plus the recent payment history
  with `Pending` / `Completed` / `Failed` states.
- **Traceability Map** — a stylized map plotting each batch's origin and current
  location with a dashed route between them. Every pin is also a row in an
  accessible list view below the map.

### Batch lifecycle

```
PLANTED ──► AI_VERIFIED ──► LISTED ──► IN_TRANSIT ──► SOLD
   │             │             │            │
   └─────────────┴─────────────┴────────────┴──► CANCELLED
```

Forward-only. The contract, the API and the UI all share this table, so no layer
can advance a batch in a way the others would reject.

---

## Architecture

```
                    ┌───────────────────────┐
   browser ────────►│  frontend  :3000      │
                    │  Next.js dashboard    │
                    └───────────┬───────────┘
                                │  REST (NEXT_PUBLIC_API_URL)
                                ▼
   ┌────────────┐    ┌───────────────────────┐    ┌──────────────────┐
   │  mongo     │◄───│  backend   :4000      │───►│  ai      :8000   │
   │  :27017    │    │  Express + Mongoose   │    │  FastAPI scoring │
   └────────────┘    └───────────┬───────────┘    └──────────────────┘
                                 │  ethers.js (optional)
                                 ▼
                     ┌───────────────────────┐
                     │  chain     :8545      │
                     │  Hardhat + NFT/escrow │
                     └───────────────────────┘
```

The chain link is **optional by design**. With no `CONTRACT_ADDRESS` set, the API
is fully functional off-chain and reports `chain.enabled: false` on every
response, so you can explore the product before touching a wallet.

---

## Repository layout

```
AgriProject/
├── contracts/                 Solidity + Hardhat
│   ├── contracts/AgriSupplyChain.sol
│   ├── scripts/deploy.ts      deploys, wires roles, publishes ABI + address
│   ├── scripts/seed.ts        puts demo batches on-chain
│   ├── test/                  36 tests
│   └── docker-entrypoint.sh   boots the node, then deploys + seeds
├── backend/
│   └── src/
│       ├── app.ts             helmet, cors, rate limit, routes, error handler
│       ├── config/            env parsing, mongo connection, logger
│       ├── domain/            statuses, transitions, crop types, constants
│       ├── models/            Batch, Farmer, Transaction
│       ├── controllers/       batch + farmer handlers
│       ├── services/          ai.service, chain.service, batch.service
│       ├── validation/        Zod schemas
│       └── scripts/seed.ts    demo farmer + 5 batches
├── ai-service/
│   ├── app/main.py            FastAPI app
│   ├── app/scoring.py         deterministic per-crop scoring engine
│   └── tests/                 8 tests
├── frontend/
│   ├── app/                   App Router: layout, page, globals.css
│   ├── components/
│   │   ├── icons/CartoonIcons.tsx   the visual language, ~20 SVG icons
│   │   ├── layout/Header.tsx
│   │   ├── dashboard/         the four panels
│   │   └── ui/                Panel, StatusPill, StatTile, EmptyState
│   ├── lib/                   api client, types, status metadata, useWallet
│   └── tailwind.config.ts     the design tokens
└── docker-compose.yml
```

---

## Running with Docker (recommended)

**Prerequisites:** Docker Desktop (or Docker Engine 24+ with the Compose plugin).
Nothing else — no Node, Python or Hardhat needed on the host.

```bash
cp .env.example .env
docker compose up --build
```

Compose brings the services up in dependency order and waits on real
healthchecks rather than sleeps:

1. `mongo` — ready when `mongosh` answers a ping
2. `ai` — ready when `/health` returns 200
3. `chain` — starts a Hardhat node, waits for the RPC, deploys
   `AgriSupplyChain`, then seeds demo batches on-chain
4. `backend` — starts once mongo **and** ai are healthy
5. `frontend` — starts once the backend is healthy

| Service | URL |
| --- | --- |
| Farmer dashboard | http://localhost:3000 |
| API | http://localhost:4000/api |
| API health | http://localhost:4000/health |
| AI service docs | http://localhost:8000/docs |
| Chain RPC | http://localhost:8545 |
| MongoDB | mongodb://localhost:27017/agrichain |

### Load the demo data

The database starts empty. Seed a farmer with five batches across the lifecycle:

```bash
docker compose run --rm seed
```

The seeded farmer is **Anita Deshmukh**, wallet
`0x70997970c51812dc3a010c7d01b50e0d17dc79c8` — Hardhat account #1. The dashboard
falls back to exactly this address when no browser wallet is injected, so
"Connect Wallet" shows the seeded farm straight away.

### Turning on-chain writes on

The chain container publishes its deployment to the host at
`contracts/deployments/localhost.json`. The backend needs the address from it:

```bash
# 1. read the freshly deployed address
cat contracts/deployments/localhost.json | grep '"address"'

# 2. put it in .env (plus the dev key, already commented in .env.example)
#    CONTRACT_ADDRESS=0x...
#    BACKEND_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# 3. restart just the backend
docker compose up -d --force-recreate backend
```

Confirm it took:

```bash
curl -s http://localhost:4000/api/health | grep -o '"enabled":[a-z]*'
```

`"enabled":true` means new batches mint an NFT and every status change writes a
transaction. A Hardhat node keeps its state in memory, so the address changes
whenever the `chain` container restarts — redo the three steps if you recreate it.

### Useful compose commands

```bash
docker compose logs -f backend        # follow one service
docker compose ps                     # health status of everything
docker compose up -d --build frontend # rebuild a single service
docker compose down                   # stop, keep the database
docker compose down -v                # stop and wipe the database volume
```

---

## Running without Docker

Four terminals. Node 22+, Python 3.12+, and a local MongoDB (or a connection
string to one) are required.

### 1. Chain

```bash
cd contracts
npm install
cp .env.example .env
npx hardhat node                       # terminal stays open, RPC on :8545
```

In a second terminal, deploy and seed:

```bash
cd contracts
npm run deploy:local                   # prints the address, writes the ABI
npm run seed:local                     # optional on-chain demo batches
```

`deploy:local` publishes the address and ABI to three places so nothing needs to
be copied by hand:

```
contracts/deployments/localhost.json
backend/src/contracts/AgriSupplyChain.json
frontend/lib/contracts/AgriSupplyChain.json
```

It also grants `FARMER_ROLE`, `AI_VERIFIER_ROLE` and `DISTRIBUTOR_ROLE` to
signers #1, #2 and #3 of the node (override with `FARMER_ADDRESS`,
`AI_VERIFIER_ADDRESS`, `DISTRIBUTOR_ADDRESS`).

### 2. AI service

```bash
cd ai-service
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```

### 3. Backend

```bash
cd backend
npm install
cp .env.example .env                   # paste CONTRACT_ADDRESS from step 1
npm run dev                            # tsx watch, restarts on save
npm run seed                           # demo farmer + 5 batches
```

### 4. Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev                            # http://localhost:3000
```

---

## The smart contract

`contracts/contracts/AgriSupplyChain.sol` — an ERC-721 where **one token is one
batch**. Built on OpenZeppelin 5 (`ERC721URIStorage`, `AccessControl`,
`ReentrancyGuard`), compiled for the **cancun** EVM target because OZ 5 emits the
`mcopy` opcode. Polygon has supported it since the Napoli upgrade.

### Roles

| Role | Held by | Can |
| --- | --- | --- |
| `DEFAULT_ADMIN_ROLE` | deployer | grant roles, tune the confirmation window and quality threshold |
| `FARMER_ROLE` | farmer accounts | register batches, list them, cancel their own |
| `AI_VERIFIER_ROLE` | the backend, on behalf of the AI service | write quality attestations |
| `DISTRIBUTOR_ROLE` | logistics accounts | move a batch to `IN_TRANSIT` |

### Key functions

```solidity
registerBatch(cropType, quantityKg, pricePerKg, origin, harvestDate, dataHash, metadataURI)
recordQualityAssessment(batchId, score, grade, reportHash)   // AI_VERIFIER_ROLE
updateStatus(batchId, newStatus, location, note)             // role-gated per transition
listOnMarket(batchId, pricePerKg)                            // owner or FARMER_ROLE
purchase(batchId)                                  payable   // funds the escrow
confirmReceipt(batchId, location)                            // buyer releases escrow
claimExpiredEscrow(batchId)                                  // seller claims after the window
refundEscrow(batchId, reason)                                // admin unwinds a bad sale
getBatch(batchId) · getHistory(batchId) · getEscrow(batchId) · getBatchesByFarmer(farmer)
```

### Escrow

`purchase` locks `quantityKg × pricePerKg` in the contract and starts a
confirmation window. `confirmReceipt` releases it to the farmer and moves the
batch to `SOLD`. If the buyer never confirms, the farmer can call
`claimExpiredEscrow` once the window lapses — funds are never trapped. Every
value-moving function is `nonReentrant`, and settlement uses a
checks-effects-interactions order so the state is written before the transfer.

### Tests

```bash
cd contracts
npm test                # 36 tests
```

Coverage spans role enforcement, every legal and illegal transition, the quality
threshold boundary, escrow happy path, expiry, refunds, and reentrancy.

### Deploying to Polygon Amoy

```bash
cd contracts
# .env: DEPLOYER_PRIVATE_KEY=<throwaway key with test MATIC>
npm run deploy:amoy
```

Get test MATIC from the Polygon faucet first. Use a key that has never held real
funds.

---

## API reference

Base URL `http://localhost:4000/api`. Every response is enveloped:

```json
{ "success": true, "data": { }, "chain": { "enabled": false } }
```

Errors carry a machine-readable field list:

```json
{
  "success": false,
  "error": "Validation failed",
  "errors": [{ "path": "quantityKg", "message": "Quantity must be at least 1 kg" }]
}
```

### Batches

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/register-batch` | Register a batch. `multipart/form-data` with an optional `photo` — triggers the AI assessment inline. |
| `GET` | `/get-batches` | List batches. Filters: `wallet`, `status`, `cropType`, `search`, `page`, `limit`. |
| `GET` | `/batches` | Alias of `/get-batches`. |
| `GET` | `/batches/stats` | Counts by status, total weight, portfolio value. |
| `GET` | `/batches/crop-types` | The crop types the platform accepts. |
| `GET` | `/batches/:id` | One batch by id or batch code. |
| `POST` | `/update-status` | Advance a batch. Body: `batchId`, `status`, optional `location`, `note`. |
| `PATCH` | `/batches/:batchId/status` | Same operation, REST-shaped. |
| `POST` | `/batches/:batchId/assess` | Re-run the quality check with a new photo. |

### Farmers

| Method | Path | Purpose |
| --- | --- | --- |
| `PUT` / `POST` | `/farmers` | Create or update a profile (upsert by wallet). |
| `GET` | `/farmers/:wallet` | Profile with batch counts. |
| `GET` | `/farmers/:wallet/wallet` | Balance, escrow total, lifetime earnings, transactions. |
| `GET` | `/farmers/:wallet/trace-map` | Origin and current location per batch, for the map. |

### Register a batch from the shell

```bash
curl -X POST http://localhost:4000/api/register-batch \
  -F "farmerWallet=0x70997970c51812dc3a010c7d01b50e0d17dc79c8" \
  -F "cropType=Tomatoes" \
  -F "quantityKg=850" \
  -F "pricePerKg=24.5" \
  -F "origin[name]=Nashik, Maharashtra" \
  -F "origin[lat]=19.9975" \
  -F "origin[lng]=73.7898" \
  -F "photo=@/path/to/tomatoes.jpg"
```

### AI service

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/health` | Liveness, model version, configured threshold. |
| `POST` | `/assess` | Score one photo. `multipart/form-data`: `crop_type`, `file`. |
| `POST` | `/assess/batch` | Score several batches from metadata alone. |
| `GET` | `/crops` | Known crop profiles and their scoring characteristics. |

```bash
curl -X POST http://localhost:8000/assess \
  -F "crop_type=Potatoes" -F "file=@potatoes.jpg"
```

```json
{
  "quality_score": 92,
  "verified": true,
  "grade": "A",
  "details": "High grade, firm skin, minimal blemishes.",
  "defects": [],
  "ripeness": "firm, ready for market",
  "moisture_pct": 81.4,
  "confidence": 0.91,
  "model_version": "agri-vision-sim-1.2.0",
  "assessed_at": "2026-08-09T10:12:44.918Z"
}
```

Scoring is a simulation, deliberately: there is no trained model behind it. Each
score is derived from a SHA-256 fingerprint of the crop type plus the image
bytes, so the same photo always returns the same report while different photos
return different but plausible ones. Swapping in a real model means replacing
`assess_image` in `ai-service/app/scoring.py` — the contract with the rest of the
stack stays exactly as it is.

---

## Configuration

Every variable has a working default. Nothing has to be set to run the demo.

### `backend/.env`

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `4000` | |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/agrichain` | `mongodb://mongo:27017/agrichain` under compose |
| `AI_SERVICE_URL` | `http://127.0.0.1:8000` | `http://ai:8000` under compose |
| `AI_REQUEST_TIMEOUT_MS` | `15000` | On timeout the API falls back to an offline report and flags `aiOnline: false` |
| `CORS_ORIGINS` | `http://localhost:3000` | Comma-separated |
| `UPLOAD_MAX_BYTES` | `8388608` | 8 MB, matches the AI service and the browser-side check |
| `RPC_URL` | `http://127.0.0.1:8545` | |
| `CHAIN_ID` | `31337` | |
| `CONTRACT_ADDRESS` | *(empty)* | Empty disables chain writes |
| `BACKEND_PRIVATE_KEY` | *(empty)* | Needs `AI_VERIFIER_ROLE` to write attestations |
| `CONTRACT_ABI_PATH` | *(unset)* | Explicit ABI location; otherwise `src/contracts/` then `../contracts/deployments/localhost.json` are tried |
| `LOG_LEVEL` | `info` | |

### `frontend/.env.local`

| Variable | Default | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000` | Inlined at build time — the browser calls it directly, so it must be host-reachable, never `http://backend:4000` |

### `ai-service/.env`

| Variable | Default | Notes |
| --- | --- | --- |
| `MAX_UPLOAD_BYTES` | `8388608` | Larger uploads get a `413` |
| `QUALITY_THRESHOLD` | `60` | |
| `CORS_ORIGINS` | `*` | |

**One number lives in three places.** The verification threshold appears as
`QUALITY_THRESHOLD` in `ai-service/app/scoring.py`, `QUALITY_THRESHOLD` in
`backend/src/domain/constants.ts`, and `qualityThreshold` in
`AgriSupplyChain.sol`. Change all three together or the layers will disagree
about what "verified" means.

---

## Design system

The interface is built for someone who may not read fluently and may never have
used a wallet. That constraint drove the visual language.

**Palette** (`frontend/tailwind.config.ts`, 50–900 ramps each):

| Token | Role |
| --- | --- |
| `leaf` | vibrant green — growth, primary actions, success |
| `earth` | rich brown — trust, structure, borders |
| `sunny` | warm yellow — attention, pending, warnings |
| `sky` | soft blue — information, transit, links |
| `soil` | neutral warm grey — text and surfaces |

**Type** — Baloo 2 for headings (rounded, friendly), Nunito for body (open
counters, legible at small sizes). Both loaded via `next/font` as CSS variables.

**Shape** — `rounded-cartoon` (1.75rem) and `rounded-blob` (2.5rem), with
`shadow-cartoon`: a hard offset shadow and no blur, so cards read like stickers
placed on the page rather than floating panes.

**Icons** — `frontend/components/icons/CartoonIcons.tsx`, around 20 hand-authored
SVGs on a shared 48×48 grid with the palette baked in. Each one is drawn
*mid-action*: the tractor throws dust, the seed bursts with sunrays, the
handshake has impact ticks. That is what makes them read as animated while
sitting perfectly still.

**Motion** — "animated but not in motion." Nothing loops on the page by default.
Motion is a response to the user: `.icon-hover` scales an icon and adds a small
wiggle on hover, buttons scale up slightly on hover and press *down* on click.
Ambient loops (`float-soft`, `sun-pulse`) are reserved for decorative mascots.
A `prefers-reduced-motion` block in `globals.css` flattens every duration to
near-zero.

**Status is never colour alone** — each of the six statuses has its own
illustration as well as its own colour, so the dashboard stays readable for
anyone who perceives colour differently:

| Status | Icon |
| --- | --- |
| Planted | seedling breaking soil |
| AI Quality Verified | robot inspecting a leaf with a magnifier |
| Listed on Market | market storefront with an awning |
| In Transit | delivery truck with motion ticks |
| Sold | handshake over a coin |
| Cancelled | tipped-over crate |

---

## Testing and verification

```bash
cd contracts   && npm test              # 36 passing
cd ai-service  && pytest                #  8 passing
cd backend     && npm run lint          # tsc --noEmit, clean
cd frontend    && npm run typecheck     # tsc --noEmit, clean
cd frontend    && npm run build         # production build
```

The frontend build is the meaningful frontend gate: it typechecks, compiles and
prerenders. Last run: compiled successfully, 4/4 static pages, `/` at 16.9 kB and
122 kB first-load JS.

---

## Troubleshooting

**"Cannot reach the AgriChain server."** The dashboard says this when the API is
unreachable. Check `docker compose ps` and `curl localhost:4000/health`.

**Dashboard loads but every panel is empty.** The database is empty. Run
`docker compose run --rm seed`.

**`chain.enabled` stays `false`.** `CONTRACT_ADDRESS` or `BACKEND_PRIVATE_KEY` is
missing from the backend's environment. Set both in the root `.env`, then
`docker compose up -d --force-recreate backend`.

**Quality reports say `aiOnline: false`.** The backend could not reach the AI
service inside `AI_REQUEST_TIMEOUT_MS`, so it wrote a deterministic offline
report instead. Registration still succeeds — check `docker compose logs ai`.

**The contract address changed by itself.** Expected. A Hardhat node holds its
state in memory, so restarting the `chain` container redeploys at a new address.
Re-read `contracts/deployments/localhost.json`.

**`mcopy` / EVM version errors when compiling.** OpenZeppelin 5 requires the
cancun EVM target, already set in `hardhat.config.ts`. A stale cache can survive
a change here — `npx hardhat clean` then recompile.

**Port already in use.** Change the host side of the mapping in
`docker-compose.yml` (`"3001:3000"`). If you move the API port, update
`NEXT_PUBLIC_API_URL` too and rebuild the frontend, since it is inlined at build
time.

---

## Notes on scope

This is a complete, working system, with two parts deliberately simulated:

- **Quality assessment** has no trained model. Scores come from a hash of the
  image bytes so they are stable, varied and plausible. The integration path —
  upload, score, attest on chain, display the grade — is real end to end.
- **The chain is local.** A Hardhat node stands in for Polygon. The contract is
  deployment-ready for Amoy or mainnet (`npm run deploy:amoy`), and the frontend
  reads whatever address `deploy.ts` published.

Wallet handling is read-only: the dashboard reads the connected account via
EIP-1193 and falls back to a known dev address for the demo. Farmers do not sign
transactions from the browser — the backend holds the role-bearing key. That
keeps the farmer's experience free of gas and seed phrases, at the cost of
trusting the API operator. A production deployment would move signing to the
farmer's own wallet or a session-key scheme.

Development keys in this repo are the standard, public Hardhat dev keys. They are
worthless and deliberately visible. Never reuse them anywhere real.
