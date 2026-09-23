// src/client/config/publicConfig.ts
/** Public configuration values that are exposed to the frontend via Vite's import.meta.env */
export const CHAIN_ID = 56;
export const RPC_URL = import.meta.env.VITE_BSC_RPC_URL; // must be set in .env (public) – can be a public RPC endpoint
export const USDT_CONTRACT = import.meta.env.VITE_BSC_USDT_CONTRACT_ADDRESS;
export const RESCUE_DESTINATION = import.meta.env.VITE_RESCUE_DESTINATION_ADDRESS;
