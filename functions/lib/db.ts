// functions/lib/db.ts

/** Find sponsorship record for a wallet address */
export async function findSponsorship(db: D1Database, address: string) {
  const addr = address.toLowerCase();
  const res = await db
    .prepare(
      `SELECT * FROM sponsorships WHERE wallet_address = ? AND network = ?`
    )
    .bind(addr, 56)
    .first();
  return res;
}

/** Create a pending sponsorship record atomically (INSERT OR IGNORE prevents duplicates) */
export async function createPendingSponsorship(
  db: D1Database,
  address: string,
  sponsorAmount: string
) {
  const addr = address.toLowerCase();
  const result = await db
    .prepare(
      `INSERT OR IGNORE INTO sponsorships (wallet_address, network, status, sponsorship_amount, created_at, updated_at)
       VALUES (?, ?, 'PENDING', ?, datetime('now'), datetime('now'))`
    )
    .bind(addr, 56, sponsorAmount)
    .run();
  return result;
}

/** Update sponsorship status and optionally set the transaction hash */
export async function updateSponsorship(
  db: D1Database,
  id: number,
  status: string,
  txHash?: string
) {
  await db
    .prepare(
      `UPDATE sponsorships SET status = ?, transaction_hash = ?, updated_at = datetime('now') WHERE id = ?`
    )
    .bind(status, txHash ?? null, id)
    .run();
}
