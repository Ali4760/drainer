// src/worker/index.ts
import { handleSponsor } from './sponsor';
import { handleRescueVerify } from './rescue';

addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.pathname === '/api/check-sponsor' && request.method === 'GET') {
    // query param addr
    const addr = url.searchParams.get('addr');
    if (!addr) {
      event.respondWith(new Response(JSON.stringify({ error: 'Missing addr' }), { status: 400 }));
      return;
    }
    // Reuse db to fetch status
    import('./db').then(({ findSponsorship }) =>
      findSponsorship(addr).then((row) => {
        const status = row?.status ?? 'NONE';
        const txHash = row?.transaction_hash ?? null;
        event.respondWith(
          new Response(JSON.stringify({ status, txHash }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          })
        );
      })
    );
    return;
  }
  if (url.pathname === '/api/sponsor' && request.method === 'POST') {
    event.respondWith(handleSponsor(request));
    return;
  }
  if (url.pathname === '/api/verify-rescue' && request.method === 'POST') {
    event.respondWith(handleRescueVerify(request));
    return;
  }
  // Fallback 404
  event.respondWith(new Response('Not Found', { status: 404 }));
});
