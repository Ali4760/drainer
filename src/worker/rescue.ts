// src/worker/rescue.ts
import { createPublicClient, http, parseUnits } from 'viem';
import { BSC_CHAIN_ID, BSC_RPC_URL, BSC_USDT_CONTRACT_ADDRESS, RESCUE_DESTINATION_ADDRESS, REQUIRED_CONFIRMATIONS } from './config';
import { sendTelegramMessage } from './telegram';

/** Verify a USDT rescue transaction and notify via Telegram */
export async function handleRescueVerify(request: Request): Promise<Response> {
  try {
    const { txHash, from, to, amount } = await request.json();
    if (!txHash || !from || !to || !amount) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }
    const client = createPublicClient({
      chain: { id: BSC_CHAIN_ID, rpcUrls: { default: { http: [BSC_RPC_URL] } } },
      transport: http(BSC_RPC_URL),
    });
    // Fetch transaction receipt
    const receipt = await client.getTransactionReceipt({ hash: txHash as `0x${string}` });
    if (!receipt) {
      return new Response(JSON.stringify({ success: false, message: 'Receipt not found' }), { status: 200 });
    }
    if (receipt.status !== 'success' && receipt.status !== 1) {
      return new Response(JSON.stringify({ success: false, message: 'Transaction failed on chain' }), { status: 200 });
    }
    // Verify confirmations
    if ((receipt.confirmations ?? 0) < REQUIRED_CONFIRMATIONS) {
      return new Response(JSON.stringify({ success: false, message: 'Insufficient confirmations' }), { status: 200 });
    }
    // Verify that the transaction calls the USDT contract
    if (receipt.to?.toLowerCase() !== BSC_USDT_CONTRACT_ADDRESS.toLowerCase()) {
      return new Response(JSON.stringify({ success: false, message: 'Wrong contract address' }), { status: 200 });
    }
    // Decode logs to ensure Transfer event matches expected params
    const iface = new ethers.utils.Interface([
      'event Transfer(address indexed from, address indexed to, uint256 value)',
    ]);
    let transferFound = false;
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog(log);
        if (parsed.name === 'Transfer') {
          const [logFrom, logTo, logValue] = parsed.args;
          if (
            logFrom.toLowerCase() === from.toLowerCase() &&
            logTo.toLowerCase() === RESCUE_DESTINATION_ADDRESS.toLowerCase() &&
            logValue.toString() === amount
          ) {
            transferFound = true;
            break;
          }
        }
      } catch (_) {
        // ignore logs that don't match the USDT ABI
      }
    }
    if (!transferFound) {
      return new Response(JSON.stringify({ success: false, message: 'Transfer event not matching expected params' }), { status: 200 });
    }
    // All checks passed – send Telegram notification
    const msg = `✅ Rescue Success\nWallet: ${from}\nTx: ${txHash}\nNetwork: BSC (56)\nTime: ${new Date().toISOString()}`;
    await sendTelegramMessage(msg);
    return new Response(JSON.stringify({ success: true, message: 'Verification succeeded' }), { status: 200 });
  } catch (err: any) {
    console.error('Rescue verification error', err);
    return new Response(JSON.stringify({ error: err.message || 'Unknown error' }), { status: 500 });
  }
}
