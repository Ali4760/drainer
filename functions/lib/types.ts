// functions/lib/types.ts

/** Environment bindings available in Cloudflare Pages Functions */
export interface Env {
  // D1 Database binding (must match wrangler.toml [[d1_databases]] binding name)
  DRAIN_DB: D1Database;

  // Workers vars (set in wrangler.toml [vars])
  BSC_CHAIN_ID: string;

  // Secrets (set via Cloudflare dashboard or `wrangler secret put`)
  BSC_RPC_URL: string;
  SPONSOR_WALLET_PRIVATE_KEY: string;
  SPONSOR_BNB_AMOUNT: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  BSC_USDT_CONTRACT_ADDRESS: string;
  RESCUE_DESTINATION_ADDRESS: string;
  REQUIRED_CONFIRMATIONS: string;
}
