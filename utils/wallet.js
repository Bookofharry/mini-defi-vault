"use client";

// Finds and connects to an injected EIP-1193 wallet provider safely.
// Supports EIP-6963 multi-wallet discovery and window.ethereum.providers,
// bypassing broken proxy interceptors like evmAsk.js when multiple wallets are installed.

const announcedProviders = [];
let activeProvider = null;

if (typeof window !== "undefined") {
  window.addEventListener("eip6963:announceProvider", (e) => {
    const detail = e?.detail;
    if (!detail?.provider) return;
    if (!announcedProviders.some((x) => x.provider === detail.provider)) {
      announcedProviders.push({
        info: detail.info || {},
        provider: detail.provider,
      });
    }
  });
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {}
}

// Returns an ordered list of candidate wallet providers, putting genuine MetaMask first
export function getCandidateProviders() {
  if (typeof window === "undefined") return [];
  try {
    window.dispatchEvent(new Event("eip6963:requestProvider"));
  } catch {}

  const list = [];
  const add = (p) => {
    if (p && typeof p.request === "function" && !list.includes(p)) {
      list.push(p);
    }
  };

  // 1. Prefer EIP-6963 announced io.metamask
  for (const item of announcedProviders) {
    if (item.info?.rdns === "io.metamask" || item.info?.name?.toLowerCase() === "metamask") {
      add(item.provider);
    }
  }

  // 2. Other EIP-6963 announced wallets
  for (const item of announcedProviders) {
    add(item.provider);
  }

  // 3. window.ethereum.providers array (if present)
  const eth = window.ethereum;
  if (Array.isArray(eth?.providers)) {
    const realMM = eth.providers.find((p) => p.isMetaMask && !p.isBraveWallet && !p.isRabby && !p.isTrust);
    if (realMM) add(realMM);
    for (const p of eth.providers) add(p);
  }

  // 4. Direct window.ethereum last (since evmAsk.js often hijacks this top-level object)
  if (eth) add(eth);

  return list;
}

export function getEthereum() {
  if (activeProvider) return activeProvider;
  const candidates = getCandidateProviders();
  return candidates[0] || null;
}

export function setActiveProvider(p) {
  activeProvider = p;
}

// Tries every available candidate provider until one connects without throwing "Unexpected error"
export async function requestAccountsFromAnyProvider() {
  const candidates = getCandidateProviders();
  let lastError = null;

  for (const provider of candidates) {
    try {
      const accs = await provider.request({ method: "eth_requestAccounts" });
      if (accs && accs.length > 0) {
        activeProvider = provider;
        return { provider, account: accs[0] };
      }
    } catch (err) {
      lastError = err;
      // If the user explicitly clicked "Cancel/Reject" in a real wallet popup, stop immediately
      if (err?.code === 4001 || err?.code === "ACTION_REJECTED") {
        throw err;
      }
      // If request is already pending in the wallet popup, let the user know
      if (err?.code === -32002) {
        throw new Error("A connection request is already open in your wallet. Click your wallet extension icon to approve it.");
      }
      // Otherwise (e.g., evmAsk.js "Unexpected error"), continue to the next candidate provider
    }
  }

  throw lastError || new Error("Could not connect to wallet.");
}

// Waits briefly for wallets that inject after page load.
export function waitForEthereum(timeout = 1000) {
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
    const poll = setInterval(() => getEthereum() && finish(), 120);
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
