"use client";

import { useCallback, useEffect, useState } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import { VAULT_ABI } from "@/lib/abi";
import deployment from "@/lib/contract.json";

const SEPOLIA_CHAIN_ID = 11155111n;

export default function Home() {
  const [account, setAccount] = useState(null);
  const [balance, setBalance] = useState("0");
  const [total, setTotal] = useState("0");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const getVault = useCallback(async () => {
    const provider = new BrowserProvider(window.ethereum);
    const net = await provider.getNetwork();
    if (net.chainId !== SEPOLIA_CHAIN_ID) {
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch {
        throw new Error("Please switch MetaMask to the Sepolia network.");
      }
    }
    const fresh = new BrowserProvider(window.ethereum);
    const signer = await fresh.getSigner();
    return new Contract(deployment.address, VAULT_ABI, signer);
  }, []);

  const refresh = useCallback(
    async (addr) => {
      try {
        const vault = await getVault();
        setBalance(formatEther(await vault.balances(addr)));
        setTotal(formatEther(await vault.totalDeposits()));
      } catch (e) {
        setError(e.message);
      }
    },
    [getVault]
  );

  async function connect() {
    setError("");
    if (!window.ethereum) return setError("MetaMask not detected.");
    try {
      const [addr] = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(addr);
      refresh(addr);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const onChange = (accs) => {
      setAccount(accs[0] || null);
      if (accs[0]) refresh(accs[0]);
    };
    window.ethereum.on("accountsChanged", onChange);
    return () => window.ethereum.removeListener("accountsChanged", onChange);
  }, [refresh]);

  async function run(kind) {
    setError("");
    setStatus("");
    setBusy(true);
    try {
      const vault = await getVault();
      const value = parseEther(amount);
      const tx =
        kind === "deposit" ? await vault.deposit({ value }) : await vault.withdraw(value);
      setStatus(`Pending: ${tx.hash}`);
      await tx.wait();
      setStatus(`Confirmed: ${tx.hash}`);
      setAmount("");
      await refresh(account);
    } catch (e) {
      setError(e.shortMessage || e.reason || e.message);
      setStatus("");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h1>Mini DeFi Vault</h1>
      <p className="muted">Deposit and withdraw Sepolia test ETH.</p>

      {!account ? (
        <button onClick={connect}>Connect Wallet</button>
      ) : (
        <>
          <div className="row">
            <span className="muted">Wallet</span>
            <span>{account.slice(0, 6)}…{account.slice(-4)}</span>
          </div>
          <div className="row">
            <span className="muted">Your deposit</span>
            <span>{balance} ETH</span>
          </div>
          <div className="row">
            <span className="muted">Vault total</span>
            <span>{total} ETH</span>
          </div>
          <input
            type="number"
            min="0"
            step="any"
            placeholder="Amount in ETH"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          <button disabled={busy || !amount} onClick={() => run("deposit")}>
            Deposit
          </button>
          <button className="secondary" disabled={busy || !amount} onClick={() => run("withdraw")}>
            Withdraw
          </button>
        </>
      )}

      {status && (
        <div className="status">
          {status}{" "}
          <a
            href={`https://sepolia.etherscan.io/tx/${status.split(": ")[1]}`}
            target="_blank"
            rel="noreferrer"
          >
            View
          </a>
        </div>
      )}
      {error && <div className="status error">{error}</div>}
    </div>
  );
}

