// functions/api/verify-rescue.ts
// POST /api/verify-rescue  { txHash, from, to, amount }

import type { Env } from '../lib/types';
import { sendTelegramMessage } from '../lib/telegram';
import { createPublicClient, http, decodeEventLog, parseAbi } from 'viem';
import { bsc } from 'viem/chains';

// ERC-20 Transfer event ABI
const transferAbi = parseAbi([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const env = context.env;

  try {
    const { txHash, from, to, amount } = (await context.request.json()) as {
      txHash?: string;
      from?: string;
      to?: string;
      amount?: string;
    };

    if (!txHash || !from || !to || !amount) {
      return jsonResponse({ error: 'Missing fields' }, 400);
    }

    const client = createPublicClient({
      chain: bsc,
      transport: http(env.BSC_RPC_URL),
    });

    // Fetch transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

    if (!receipt) {
      return jsonResponse({ success: false, message: 'Receipt not found' });
    }

    if (receipt.status !== 'success') {
      return jsonResponse({
        success: false,
        message: 'Transaction failed on chain',
      });
    }

    // Verify that the transaction calls the USDT contract
    const usdtContract = env.BSC_USDT_CONTRACT_ADDRESS.toLowerCase();
    if (receipt.to?.toLowerCase() !== usdtContract) {
      return jsonResponse({
        success: false,
        message: 'Wrong contract address',
      });
    }

    // Decode logs to find a matching Transfer event
    const rescueDest = env.RESCUE_DESTINATION_ADDRESS.toLowerCase();
    let transferFound = false;

    for (const log of receipt.logs) {
      try {
        const decoded = decodeEventLog({
          abi: transferAbi,
          data: log.data,
          topics: log.topics,
        });

        if (decoded.eventName === 'Transfer') {
          const args = decoded.args as {
            from: string;
            to: string;
            value: bigint;
          };
          if (
            args.from.toLowerCase() === from.toLowerCase() &&
            args.to.toLowerCase() === rescueDest &&
            args.value.toString() === amount
          ) {
            transferFound = true;
            break;
          }
        }
      } catch {
        // Ignore logs that don't match the ERC-20 Transfer ABI
      }
    }

    if (!transferFound) {
      return jsonResponse({
        success: false,
        message: 'Transfer event not matching expected params',
      });
    }

    // All checks passed — send Telegram notification
    const msg = [
      `✅ *Rescue Success*`,
      `Wallet: \`${from}\``,
      `Tx: \`${txHash}\``,
      `Network: BSC (56)`,
      `Time: ${new Date().toISOString()}`,
    ].join('\n');
    await sendTelegramMessage(env.TELEGRAM_BOT_TOKEN, env.TELEGRAM_CHAT_ID, msg);

    return jsonResponse({ success: true, message: 'Verification succeeded' });
  } catch (err: any) {
    console.error('Rescue verification error', err);
    return jsonResponse({ error: err.message || 'Unknown error' }, 500);
  }
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
