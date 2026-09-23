// src/worker/db.ts
import { D1Database } from '@cloudflare/workers-types';

/** D1 binding name must match what is declared in wrangler.toml */
declare const RESCUE_DB: D1Database;

/** Find sponsorship record for a wallet (lower‑cased address) */
export async function findSponsorship(address: string) {
  const addr = address.toLowerCase();
  const res = await RESCUE_DB.prepare(
    `SELECT * FROM sponsorships WHERE wallet_address = ? AND network = ?`
  )
    .bind(addr, 56)
    .first();
  return res;
}

/** Create a pending sponsorship record atomically. Returns the inserted row id. */
export async function createPendingSponsorship(address: string) {
  const addr = address.toLowerCase();
  // INSERT OR IGNORE guarantees only one row per wallet+network
  const result = await RESCUE_DB.prepare(
    `INSERT OR IGNORE INTO sponsorships (wallet_address, network, status, sponsorship_amount, created_at, updated_at)
     VALUES (?, ?, 'PENDING', ?, datetime('now'), datetime('now'))`
  )
    .bind(addr, 56, process.env.SPONSORED_BNB_AMOUNT ?? '0.01')
    .run();
  // If a row was inserted, result.meta.last_row_id will be non‑zero
  return result;
}

/** Update sponsorship status and optionally transaction hash */
export async function updateSponsorship(id: number, status: string, txHash?: string) {
  await RESCUE_DB.prepare(
    `UPDATE sponsorships SET status = ?, transaction_hash = ?, updated_at = datetime('now') WHERE id = ?`
  )
    .bind(status, txHash ?? null, id)
    .run();
}
