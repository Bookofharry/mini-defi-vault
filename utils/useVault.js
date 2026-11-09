"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BrowserProvider, Contract, JsonRpcProvider, formatEther, parseEther } from "ethers";
import { VAULT_ABI, READ_RPC } from "./abi";
import deployment from "./contract.json";

const CHAIN_HEX = "0xaa36a7";

export function useVault() {
  const readProvider = useMemo(
    () => new JsonRpcProvider(READ_RPC, deployment.chainId, { staticNetwork: true }),
    []
  );
  const readVault = useMemo(
    () => new Contract(deployment.address, VAULT_ABI, readProvider),
    [readProvider]
  );

  const [hasWallet, setHasWallet] = useState(true);
  const [account, setAccount] = useState(null);
  const [chainOk, setChainOk] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [stats, setStats] = useState({ wallet: null, vault: null, tvl: null });
  const [statsError, setStatsError] = useState(null);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);
  const blockTimes = useRef({});

  const refresh = useCallback(
    async (addr = account) => {
      setStatsError(null);
      try {
        const tvl = await readVault.totalDeposits();
        let wallet = null;
        let vault = null;
        if (addr) {
          [wallet, vault] = await Promise.all([readProvider.getBalance(addr), readVault.balances(addr)]);
        }
        setStats({
          tvl: formatEther(tvl),
          wallet: wallet === null ? null : formatEther(wallet),
          vault: vault === null ? null : formatEther(vault),
        });
      } catch (e) {
        setStatsError("Could not reach the Sepolia network. Check your connection and retry.");
      }
    },
    [account, readProvider, readVault]
  );

  const loadHistory = useCallback(
    async (addr = account) => {
      if (!addr) return setHistory([]);
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const from = deployment.deployBlock;
        const [deps, wds] = await Promise.all([
          readVault.queryFilter(readVault.filters.Deposited(addr), from, "latest"),
          readVault.queryFilter(readVault.filters.Withdrawn(addr), from, "latest"),
        ]);
        const logs = [
          ...deps.map((l) => ({ l, kind: "deposit" })),
          ...wds.map((l) => ({ l, kind: "withdraw" })),
        ];
        const needed = [...new Set(logs.map(({ l }) => l.blockNumber))].filter((b) => !blockTimes.current[b]);
        await Promise.all(
          needed.map(async (b) => {
            try {
              const blk = await readProvider.getBlock(b);
              blockTimes.current[b] = blk ? blk.timestamp * 1000 : null;
            } catch {
              blockTimes.current[b] = null;
            }
          })
        );
        const items = logs
          .map(({ l, kind }) => ({
            hash: l.transactionHash,
            kind,
            amount: formatEther(l.args[1]),
            block: l.blockNumber,
            time: blockTimes.current[l.blockNumber],
            status: "confirmed",
          }))
          .sort((a, b) => b.block - a.block);
        setHistory((prev) => {
          const pending = prev.filter((p) => p.status === "pending" && !items.some((i) => i.hash === p.hash));
          return [...pending, ...items];
        });
      } catch (e) {
        setHistoryError("Could not load on-chain activity.");
      } finally {
        setHistoryLoading(false);
      }
    },
    [account, readProvider, readVault]
  );

  const checkChain = useCallback(async () => {
    if (!window.ethereum) return;
    const id = await window.ethereum.request({ method: "eth_chainId" });
    setChainOk(id?.toLowerCase() === CHAIN_HEX);
  }, []);

  // Initial load + silent reconnect.
  useEffect(() => {
    refresh(null);
    if (typeof window === "undefined" || !window.ethereum) {
      setHasWallet(false);
      return;
    }
    if (localStorage.getItem("mv-disconnected") !== "1") {
      window.ethereum.request({ method: "eth_accounts" }).then((accs) => {
        if (accs?.[0]) setAccount(accs[0]);
      });
    }
    checkChain();
    const onAccounts = (accs) => setAccount(accs[0] || null);
    const onChain = () => checkChain();
    window.ethereum.on?.("accountsChanged", onAccounts);
    window.ethereum.on?.("chainChanged", onChain);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccounts);
      window.ethereum.removeListener?.("chainChanged", onChain);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setStats((s) => ({ ...s, wallet: null, vault: null }));
    refresh(account);
    loadHistory(account);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account]);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setHasWallet(false);
      throw new Error("No Ethereum wallet found. Install MetaMask to continue.");
    }
    setConnecting(true);
    try {
      const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
      localStorage.removeItem("mv-disconnected");
      setAccount(addr);
      await checkChain();
      return addr;
    } finally {
      setConnecting(false);
    }
  }, [checkChain]);

  const disconnect = useCallback(() => {
    localStorage.setItem("mv-disconnected", "1");
    setAccount(null);
    setHistory([]);
  }, []);

  const switchNetwork = useCallback(async () => {
    try {
      await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_HEX }] });
    } catch (e) {
      if (e?.code === 4902) {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: CHAIN_HEX,
            chainName: "Sepolia",
            nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
            rpcUrls: [READ_RPC],
            blockExplorerUrls: ["https://sepolia.etherscan.io"],
          }],
        });
      } else throw e;
    }
    await checkChain();
  }, [checkChain]);

  // Sends a deposit/withdraw. onSubmitted fires once the tx hash is known.
  const send = useCallback(
    async (kind, amount, onSubmitted) => {
      if (!chainOk) await switchNetwork();
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const vault = new Contract(deployment.address, VAULT_ABI, signer);
      const value = parseEther(amount);
      const tx = kind === "deposit" ? await vault.deposit({ value }) : await vault.withdraw(value);
      setHistory((h) => [{ hash: tx.hash, kind, amount, time: Date.now(), status: "pending" }, ...h]);
      onSubmitted?.(tx.hash);
      try {
        await tx.wait();
        setHistory((h) => h.map((x) => (x.hash === tx.hash ? { ...x, status: "confirmed" } : x)));
      } catch (e) {
        setHistory((h) => h.map((x) => (x.hash === tx.hash ? { ...x, status: "failed" } : x)));
        throw e;
      }
      await refresh(account);
      loadHistory(account);
      return tx.hash;
    },
    [account, chainOk, loadHistory, refresh, switchNetwork]
  );

  return {
    deployment,
    hasWallet,
    account,
    chainOk,
    connecting,
    stats,
    statsError,
    history,
    historyLoading,
    historyError,
    refresh,
    loadHistory,
    connect,
    disconnect,
    switchNetwork,
    send,
  };
}

export function errorMessage(e) {
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001) return "You rejected the request in your wallet.";
  if (e?.code === "INSUFFICIENT_FUNDS") return "Not enough Sepolia ETH to cover the amount and gas.";
  return e?.reason || e?.shortMessage || e?.message || "Something went wrong.";
}

