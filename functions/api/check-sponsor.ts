// functions/api/check-sponsor.ts
// GET /api/check-sponsor?addr=0x...

import type { Env } from '../lib/types';
import { findSponsorship } from '../lib/db';

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const addr = url.searchParams.get('addr');

  if (!addr) {
    return new Response(JSON.stringify({ error: 'Missing addr' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const row = await findSponsorship(context.env.DRAIN_DB, addr);
  const status = (row as any)?.status ?? 'NONE';
  const txHash = (row as any)?.transaction_hash ?? null;

  return new Response(JSON.stringify({ status, txHash }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
