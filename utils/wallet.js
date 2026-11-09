"use client";

// Finds an injected EIP-1193 wallet provider safely.
// Supports window.ethereum, late injection (ethereum#initialized) and EIP-6963 discovery,
// avoiding evmAsk.js proxy collisions when multiple wallet extensions are installed.

let announcedMetaMask = null;
let announcedFallback = null;

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e) => {
    const p = e?.detail?.provider;
    const rdns = e?.detail?.info?.rdns || "";
    if (!p) return;
    if (rdns.includes("metamask") || p.isMetaMask) {
      announcedMetaMask = p;
    } else if (!announcedFallback) {
      announcedFallback = p;
    }
  });
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {}
}

export function getEthereum() {
  if (typeof window === "undefined") return null;
  if (announcedMetaMask) return announcedMetaMask;
  const eth = window.ethereum;
  if (eth?.providers?.length) {
    return eth.providers.find((p) => p.isMetaMask) || eth.providers[0];
  }
  return eth || announcedFallback || null;
}

// Safely invokes provider.request without throwing unhandled rejections from evmAsk.js
export async function safeRequest(eth, args) {
  if (!eth || typeof eth.request !== "function") return null;
  try {
    return await eth.request(args);
  } catch (e) {
    throw e;
  }
}

// Waits briefly for wallets that inject after page load.
export function waitForEthereum(timeout = 1200) {
  return new Promise((resolve) => {
    const found = getEthereum();
    if (found || typeof window === "undefined") return resolve(found);
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      window.removeEventListener("ethereum#initialized", finish);
      clearInterval(poll);
      resolve(getEthereum());
    };
    window.addEventListener("ethereum#initialized", finish, { once: true });
    try {
      window.dispatchEvent(new Event("eip6963:requestProvider"));
    } catch {}
    const poll = setInterval(() => getEthereum() && finish(), 150);
    setTimeout(finish, timeout);
  });
}

export function isMobileDevice() {
  if (typeof navigator === "undefined") return false;
  return (
    /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))
  );
}

// Deep links that reopen this dApp inside a wallet's in-app browser.
export function walletDeepLinks() {
  if (typeof window === "undefined") return [];
  const href = window.location.href;
  const hostPath = window.location.host + window.location.pathname + window.location.hash;
  return [
    { id: "metamask", name: "MetaMask", url: `https://metamask.app.link/dapp/${hostPath}` },
    { id: "trust", name: "Trust Wallet", url: `https://link.trustwallet.com/open_url?coin_id=60&url=${encodeURIComponent(href)}` },
    { id: "coinbase", name: "Coinbase Wallet", url: `https://go.cb-w.com/dapp?cb_url=${encodeURIComponent(href)}` },
  ];
}
