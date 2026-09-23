// src/worker/sponsor.ts
import { createWalletClient, http, parseUnits } from 'viem';
import { BSC_CHAIN_ID, BSC_RPC_URL, SPONSOR_PRIVATE_KEY, SPONSOR_BNB_AMOUNT_WEI, REQUIRED_CONFIRMATIONS } from './config';
import { findSponsorship, createPendingSponsorship, updateSponsorship } from './db';
import { sendTelegramMessage } from './telegram';

/** Sponsor BNB to a user address if not already sponsored */
export async function handleSponsor(request: Request): Promise<Response> {
  try {
    const { address } = await request.json();
    if (!address) {
      return new Response(JSON.stringify({ error: 'Missing address' }), { status: 400 });
    }
    const lower = address.toLowerCase();
    // Check if already has a confirmed or pending sponsorship
    const existing = await findSponsorship(lower);
    if (existing && (existing.status === 'CONFIRMED' || existing.status === 'PENDING')) {
      return new Response(
        JSON.stringify({ status: existing.status, txHash: existing.transaction_hash ?? null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    // Create a pending row to block race conditions
    const insertResult = await createPendingSponsorship(lower);
    if (insertResult.meta?.changed_rows === 0) {
      // another request beat us – fetch the row again
      const race = await findSponsorship(lower);
      return new Response(
        JSON.stringify({ status: race?.status ?? 'PENDING', txHash: race?.transaction_hash ?? null }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    const sponsorClient = createWalletClient({
      chain: { id: BSC_CHAIN_ID, name: 'BSC', rpcUrls: { default: { http: [BSC_RPC_URL] } } },
      transport: http(BSC_RPC_URL),
      account: { privateKey: SPONSOR_PRIVATE_KEY },
    });
    const txHash = await sponsorClient.sendTransaction({
      to: lower as `0x${string}`,
      value: parseUnits(SPONSOR_BNB_AMOUNT_WEI, 18), // wei already string; parseUnits expects decimal, using BigInt conversion below
    });
    // Wait for confirmations (simple polling)
    let receipt: any = null;
    for (let i = 0; i < 10; i++) {
      receipt = await sponsorClient.getTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt && receipt.confirmations >= REQUIRED_CONFIRMATIONS) break;
      await new Promise(r => setTimeout(r, 3000));
    }
    const finalStatus = receipt && receipt.status === 'success' ? 'CONFIRMED' : 'FAILED';
    await updateSponsorship(insertResult.meta?.last_row_id ?? 0, finalStatus, txHash as string);
    // Telegram notification for sponsor event
    const message = `✅ Sponsorship ${finalStatus}\nWallet: ${address}\nTx: ${txHash}\nNetwork: BSC (56)\nTime: ${new Date().toISOString()}`;
    await sendTelegramMessage(message);
    return new Response(
      JSON.stringify({ status: finalStatus, txHash }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    console.error('Sponsor handler error', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500 });
  }
}
