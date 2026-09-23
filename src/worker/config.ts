// src/worker/config.ts
/**
 * Server‑side configuration accessed via Cloudflare environment variables.
 * All values that are secrets must be added as Workers Secrets (wrangler secret put).
 */
export const BSC_RPC_URL = process.env.BSC_RPC_URL ?? '';
export const SPONSOR_PRIVATE_KEY = process.env.SPONSOR_WALLET_PRIVATE_KEY ?? '';
export const SPONSOR_BNB_AMOUNT_DECIMAL = process.env.SPONSOR_BNB_AMOUNT ?? '0.01'; // decimal string
export const SPONSOR_BNB_AMOUNT_WEI = (Number(SPONSOR_BNB_AMOUNT_DECIMAL) * 1e18).toString(); // simple conversion, fine for small amounts
export const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? '';
export const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID ?? '';
export const BSC_USDT_CONTRACT_ADDRESS = process.env.BSC_USDT_CONTRACT_ADDRESS ?? '';
export const RESCUE_DESTINATION_ADDRESS = process.env.RESCUE_DESTINATION_ADDRESS ?? '';
export const REQUIRED_CONFIRMATIONS = Number(process.env.REQUIRED_CONFIRMATIONS ?? '1');
export const BSC_CHAIN_ID = 56;
