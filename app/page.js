"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import {
  Badge, Button, Card, CopyButton, EmptyState, IconButton, Menu, MenuItem, Sheet, Skeleton, Tabs, Toasts,
} from "@/components/ui";
import { useVault, errorMessage } from "@/utils/useVault";
import { isMobileDevice, walletDeepLinks, getAnnouncedWallets } from "@/utils/wallet";
import { EXPLORER } from "@/utils/abi";

const NAV = [
  { id: "overview", label: "Overview", icon: "overview" },
  { id: "transfer", label: "Deposit & Withdraw", short: "Transfer", icon: "transfer" },
  { id: "activity", label: "Activity", icon: "activity" },
  { id: "contract", label: "Contract", icon: "contract" },
];
const TITLES = {
  overview: ["Overview", "Your position in the vault"],
  transfer: ["Deposit & Withdraw", "Move Sepolia ETH in or out of the vault"],
  activity: ["Activity", "On-chain history for your wallet"],
  contract: ["Contract", "Verified vault deployment details"],
};
const GAS_BUFFER = 0.0005;

const fmt = (v, d = 4) => {
  if (v === null || v === undefined) return "0";
  const n = Number(v);
  if (n === 0) return "0";
  if (n < 0.0001) return "<0.0001";
  return n.toLocaleString("en-US", { maximumFractionDigits: d });
};
const short = (a, s = 6, e = 4) => (a ? `${a.slice(0, s)}...${a.slice(-e)}` : "");
const timeAgo = (t) => {
  if (!t) return "Recent";
  const s = Math.floor((Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

function useMedia(q) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [q]);
  return m;
}

export default function App() {
  const v = useVault();
  const [view, setView] = useState("overview");
  const [mode, setMode] = useState("deposit");
  const [theme, setTheme] = useState("light");
  const [collapsed, setCollapsed] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme || "light");
    setCollapsed(localStorage.getItem("mv-collapsed") === "1");
    const fromHash = window.location.hash.slice(1);
    if (TITLES[fromHash]) setView(fromHash);
  }, []);

  const go = useCallback((id, m) => {
    setView(id);
    if (m) setMode(m);
    setDrawer(false);
    history.replaceState(null, "", `#${id}`);
    document.querySelector(".main")?.scrollTo({ top: 0 });
  }, []);

  const toggleTheme = () => {
    const t = theme === "dark" ? "light" : "dark";
    setTheme(t);
    document.documentElement.dataset.theme = t;
    localStorage.setItem("mv-theme", t);
  };
  const toggleCollapsed = () => {
    setCollapsed((c) => {
      localStorage.setItem("mv-collapsed", c ? "0" : "1");
      return !c;
    });
  };

  const toast = useCallback((t) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((ts) => [...ts.slice(-2), { id, ...t }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), t.type === "error" ? 7000 : 5000);
  }, []);

  const [walletSheet, setWalletSheet] = useState(false);

  const connect = async (preferredProvider = null) => {
    try {
      await v.connect(preferredProvider && preferredProvider.request ? preferredProvider : null);
      setWalletSheet(false);
      toast({ type: "success", title: "Wallet connected" });
    } catch (e) {
      if (e?.code === "NO_WALLET" || e?.code === "WALLET_CONFLICT") {
        setWalletSheet(true);
        return;
      }
      toast({ type: "error", title: "Connection failed", text: errorMessage(e) });
    }
  };

  const [title, subtitle] = TITLES[view];

  return (
    <div className={`app ${collapsed ? "is-collapsed" : ""}`}>
      {/* Sidebar (desktop/tablet) + drawer (mobile) */}
      <div className={`scrim ${drawer ? "is-open" : ""}`} onClick={() => setDrawer(false)} aria-hidden="true" />
      <aside className={`sidebar ${drawer ? "is-open" : ""}`} aria-label="Primary">
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark"><Icon name="vault" size={18} /></div>
            <div className="brand-text">
              <span className="brand-name">MiniVault</span>
              <span className="brand-sub">DeFi on Sepolia</span>
            </div>
          </div>
          <IconButton icon="close" label="Close menu" tooltip={false} className="drawer-close" onClick={() => setDrawer(false)} />
        </div>

        <nav className="nav">
          <p className="nav-label">Vault</p>
          {NAV.map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "is-active" : ""}`}
              aria-current={view === n.id ? "page" : undefined}
              data-tooltip={collapsed ? n.label : undefined}
              onClick={() => go(n.id)}
            >
              <Icon name={n.icon} size={18} />
              <span className="nav-text">{n.label}</span>
              {n.id === "activity" && v.history.some((h) => h.status === "pending") && <span className="nav-dot" />}
            </button>
          ))}
        </nav>

        <div className="sidebar-foot">
          <div className="net-card">
            <span className={`status-dot ${v.account && !v.chainOk ? "warn" : "ok"}`} />
            <div className="net-text">
              <span className="net-name">{v.account && !v.chainOk ? "Wrong network" : "Sepolia testnet"}</span>
              <span className="net-sub">Chain ID 11155111</span>
            </div>
          </div>
          <button className="nav-item collapse-btn" onClick={toggleCollapsed} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} data-tooltip={collapsed ? "Expand" : undefined}>
            <Icon name={collapsed ? "chevronRight" : "chevronLeft"} size={18} />
            <span className="nav-text">Collapse</span>
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="header">
          <div className="header-left">
            <IconButton icon="menu" label="Open menu" tooltip={false} className="menu-btn" onClick={() => setDrawer(true)} />
            <div className="header-titles">
              <h1 className="header-title">{title}</h1>
              <p className="header-sub">{subtitle}</p>
            </div>
          </div>
          <div className="header-right">
            <IconButton icon={theme === "dark" ? "sun" : "moon"} label={theme === "dark" ? "Light mode" : "Dark mode"} onClick={toggleTheme} />
            {v.account ? (
              <Menu
                trigger={({ open, toggle }) => (
                  <button className={`account-btn ${open ? "is-open" : ""}`} onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
                    <span className="avatar" style={{ background: `linear-gradient(135deg, #${v.account.slice(2, 8)}, #${v.account.slice(-6)})` }} />
                    <span className="account-addr">{short(v.account, 5, 4)}</span>
                    <Icon name="chevronDown" size={16} />
                  </button>
                )}
              >
                <div className="menu-head">
                  <span className="menu-label">Connected wallet</span>
                  <span className="mono">{short(v.account, 10, 8)}</span>
                </div>
                <MenuItem icon="copy" onClick={() => { navigator.clipboard?.writeText(v.account); toast({ type: "success", title: "Address copied" }); }}>Copy address</MenuItem>
                <MenuItem icon="external" onClick={() => window.open(`${EXPLORER}/address/${v.account}`, "_blank")}>View on Etherscan</MenuItem>
                <MenuItem icon="refresh" onClick={() => { v.refresh(); v.loadHistory(); }}>Refresh balances</MenuItem>
                <div className="menu-sep" />
                <MenuItem icon="logout" danger onClick={v.disconnect}>Disconnect</MenuItem>
              </Menu>
            ) : (
              <Button icon="wallet" loading={v.connecting} onClick={connect} className="connect-btn">
                <span className="hide-xs">Connect wallet</span><span className="show-xs">Connect</span>
              </Button>
            )}
          </div>
        </header>

        <main className="main" id="main">
          {v.account && !v.chainOk && (
            <div className="banner banner-warn" role="alert">
              <Icon name="alert" size={18} />
              <span>Your wallet is on a different network. Switch to Sepolia to transact.</span>
              <Button size="sm" variant="secondary" onClick={() => v.switchNetwork().catch((e) => toast({ type: "error", title: "Switch failed", text: errorMessage(e) }))}>
                Switch network
              </Button>
            </div>
          )}
          {v.statsError && (
            <div className="banner banner-error" role="alert">
              <Icon name="alert" size={18} />
              <span>{v.statsError}</span>
              <Button size="sm" variant="secondary" icon="refresh" onClick={() => v.refresh()}>Retry</Button>
            </div>
          )}

          <div className="view" key={view}>
            {view === "overview" && <Overview v={v} go={go} connect={connect} />}
            {view === "transfer" && <Transfer v={v} mode={mode} setMode={setMode} connect={connect} toast={toast} />}
            {view === "activity" && <Activity v={v} connect={connect} go={go} />}
            {view === "contract" && <ContractView v={v} />}
          </div>
        </main>

        <nav className="bottom-nav" aria-label="Primary">
          {NAV.map((n) => (
            <button key={n.id} className={`bottom-item ${view === n.id ? "is-active" : ""}`} aria-current={view === n.id ? "page" : undefined} onClick={() => go(n.id)}>
              <Icon name={n.icon} size={20} />
              <span>{n.short || n.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <WalletSheet open={walletSheet} onClose={() => setWalletSheet(false)} onSelectProvider={connect} toast={toast} />
      <Toasts items={toasts} onDismiss={(id) => setToasts((t) => t.filter((x) => x.id !== id))} />
    </div>
  );
}

/* ---------------- Overview ---------------- */

function Overview({ v, go, connect }) {
  const { stats, account } = v;
  const share = stats.vault !== null && Number(stats.tvl) > 0 ? (Number(stats.vault) / Number(stats.tvl)) * 100 : 0;
  const loadingMine = account && stats.vault === null && !v.statsError;

  return (
    <div className="grid-overview">
      <Card className="balance-card">
        <div className="balance-top">
          <span className="eyebrow">Your vault balance</span>
          {account && Number(stats.vault) > 0 && <Badge tone="green">Active</Badge>}
        </div>
        {account ? (
          <>
            <div className="balance-value">
              {loadingMine ? <Skeleton w={200} h={44} r={10} /> : <>{fmt(stats.vault, 6)} <span className="unit">ETH</span></>}
            </div>
            <div className="balance-actions">
              <Button icon="down" onClick={() => go("transfer", "deposit")}>Deposit</Button>
              <Button icon="up" variant="secondary" onClick={() => go("transfer", "withdraw")}>Withdraw</Button>
            </div>
          </>
        ) : (
          <div className="connect-prompt">
            <p className="display-sm">Connect your wallet to start saving</p>
            <p className="muted">MiniVault is non-custodial. Only your wallet can withdraw what you deposit.</p>
            <Button icon="wallet" onClick={connect} loading={v.connecting}>Connect wallet</Button>
            {!v.hasWallet && (
              <p className="hint">No wallet detected in this browser. Tap Connect wallet to open MiniVault in a wallet app.</p>
            )}
          </div>
        )}
      </Card>

      <div className="stat-grid">
        <Stat
          label="Wallet balance"
          icon="wallet"
          value={account ? fmt(stats.wallet) : null}
          unit="ETH"
          loading={account && stats.wallet === null && !v.statsError}
          hint={account ? "Available to deposit" : "Connect to view your balance"}
          action={!account ? <Button size="sm" variant="secondary" icon="wallet" onClick={connect} loading={v.connecting}>Connect wallet</Button> : null}
        />
        <Stat label="Total value locked" icon="layers" value={fmt(stats.tvl)} unit="ETH" loading={stats.tvl === null && !v.statsError} hint="Across all depositors" />
        <Stat
          label="Your share"
          icon="overview"
          value={account ? share.toFixed(2) : null}
          unit="%"
          loading={loadingMine}
          hint={account ? "Of total vault deposits" : "Connect to see your vault share"}
          action={!account ? <Button size="sm" variant="secondary" icon="wallet" onClick={connect} loading={v.connecting}>Connect wallet</Button> : null}
        >
          {account && <div className="meter"><div style={{ width: `${Math.min(share, 100)}%` }} /></div>}
        </Stat>
      </div>

      <Card
        title="Recent activity"
        className="recent-card"
        padded={false}
        action={account && v.history.length > 0 && <Button size="sm" variant="ghost" onClick={() => go("activity")}>View all</Button>}
      >
        {!account ? (
          <EmptyState
            icon="activity"
            title="No wallet connected"
            text="Your deposits and withdrawals will appear here."
            action={<Button size="sm" icon="wallet" onClick={connect} loading={v.connecting}>Connect wallet</Button>}
          />
        ) : v.historyLoading && v.history.length === 0 ? (
          <RowSkeletons />
        ) : v.history.length === 0 ? (
          <EmptyState icon="inbox" title="No activity yet" text="Make your first deposit to start building your position." action={<Button size="sm" icon="down" onClick={() => go("transfer", "deposit")}>Make a deposit</Button>} />
        ) : (
          <ul className="tx-list">
            {v.history.slice(0, 4).map((t) => <TxRow key={t.hash} t={t} onClick={() => go("activity")} />)}
          </ul>
        )}
      </Card>

      <Card title="How it works" className="how-card">
        <ol className="steps">
          <li><span className="step-n">1</span><div><b>Connect</b><p>Link MetaMask on the Sepolia testnet.</p></div></li>
          <li><span className="step-n">2</span><div><b>Deposit</b><p>Send ETH to the vault. Your balance is tracked on-chain.</p></div></li>
          <li><span className="step-n">3</span><div><b>Withdraw</b><p>Pull any amount back to your wallet at any time.</p></div></li>
        </ol>
      </Card>
    </div>
  );
}

function Stat({ label, icon, value, unit, hint, loading, action, children }) {
  return (
    <Card className="stat">
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        <span className="stat-icon"><Icon name={icon} size={16} /></span>
      </div>
      {action ? (
        <div className="stat-action">{action}</div>
      ) : (
        <div className="stat-value">{loading ? <Skeleton w={110} h={28} r={8} /> : <>{value} <span className="unit">{unit}</span></>}</div>
      )}
      <p className="stat-hint">{hint}</p>
      {children}
    </Card>
  );
}

function RowSkeletons({ n = 3 }) {
  return (
    <ul className="tx-list">
      {Array.from({ length: n }).map((_, i) => (
        <li key={i} className="tx-row is-skeleton">
          <Skeleton w={36} h={36} r={10} />
          <div className="tx-main"><Skeleton w="45%" /><Skeleton w="30%" h={12} /></div>
          <Skeleton w={70} />
        </li>
      ))}
    </ul>
  );
}

function TxRow({ t, onClick, selected }) {
  return (
    <li>
      <button className={`tx-row ${selected ? "is-selected" : ""}`} onClick={onClick}>
        <span className={`tx-icon ${t.kind}`}><Icon name={t.kind === "deposit" ? "down" : "up"} size={16} /></span>
        <span className="tx-main">
          <span className="tx-title">{t.kind === "deposit" ? "Deposit" : "Withdrawal"}</span>
          <span className="tx-sub">{timeAgo(t.time)} / <span className="mono">{short(t.hash)}</span></span>
        </span>
        <span className="tx-end">
          <span className={`tx-amt ${t.kind}`}>{t.kind === "deposit" ? "+" : "-"}{fmt(t.amount, 6)} ETH</span>
          <StatusBadge s={t.status} />
        </span>
      </button>
    </li>
  );
}

function StatusBadge({ s }) {
  if (s === "pending") return <Badge tone="amber">Pending</Badge>;
  if (s === "failed") return <Badge tone="red">Failed</Badge>;
  return <Badge tone="green">Confirmed</Badge>;
}

/* ---------------- Transfer ---------------- */

function Transfer({ v, mode, setMode, connect, toast }) {
  const [amount, setAmount] = useState("");
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [lastHash, setLastHash] = useState(null);
  const inputRef = useRef(null);
  const { stats, account } = v;

  useEffect(() => { setAmount(""); setTouched(false); }, [mode]);

  const available = mode === "deposit" ? Math.max(Number(stats.wallet || 0) - GAS_BUFFER, 0) : Number(stats.vault || 0);
  const n = Number(amount);
  let error = null;
  if (amount && (isNaN(n) || n <= 0)) error = "Enter an amount greater than 0.";
  else if (amount && account && n > available + 1e-12)
    error = mode === "deposit"
      ? `Exceeds your wallet balance (keeping ~${GAS_BUFFER} ETH for gas).`
      : "Exceeds your vault balance.";
  else if (amount && amount.split(".")[1]?.length > 18) error = "Too many decimal places (max 18).";

  const after = account && stats.vault !== null && amount && !error
    ? Number(stats.vault) + (mode === "deposit" ? n : -n)
    : null;

  const setPct = (p) => {
    const val = available * p;
    setAmount(val > 0 ? String(Math.floor(val * 1e6) / 1e6) : "0");
    setTouched(true);
    inputRef.current?.focus();
  };

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    if (!account) return connect();
    if (!amount || error) return;
    setBusy(true);
    setLastHash(null);
    try {
      const hash = await v.send(mode, amount, (h) => {
        setLastHash(h);
        toast({ type: "info", title: "Transaction submitted", text: "Waiting for confirmation on Sepolia.", href: `${EXPLORER}/tx/${h}` });
      });
      toast({ type: "success", title: mode === "deposit" ? "Deposit confirmed" : "Withdrawal confirmed", text: `${amount} ETH ${mode === "deposit" ? "added to" : "sent from"} the vault.`, href: `${EXPLORER}/tx/${hash}` });
      setAmount("");
      setTouched(false);
    } catch (err) {
      toast({ type: "error", title: "Transaction failed", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid-transfer">
      <Card className="transfer-card">
        <Tabs
          full
          value={mode}
          onChange={setMode}
          items={[
            { value: "deposit", label: "Deposit", icon: "down" },
            { value: "withdraw", label: "Withdraw", icon: "up" },
          ]}
        />
        <form onSubmit={submit} noValidate>
          <div className="field">
            <div className="field-head">
              <label htmlFor="amount" className="label">Amount</label>
              <span className="field-meta">
                {mode === "deposit" ? "Wallet" : "Vault"}:{" "}
                {account ? (
                  `${fmt(mode === "deposit" ? stats.wallet : stats.vault, 6)} ETH`
                ) : (
                  <button type="button" className="inline-connect" onClick={connect}>Connect wallet</button>
                )}
              </span>
            </div>
            <div className={`amount-input ${touched && error ? "is-invalid" : ""}`}>
              <input
                ref={inputRef}
                id="amount"
                inputMode="decimal"
                autoComplete="off"
                placeholder="0.00"
                value={amount}
                aria-invalid={!!(touched && error)}
                aria-describedby="amount-msg"
                onChange={(e) => {
                  const val = e.target.value.replace(",", ".");
                  if (/^\d*\.?\d*$/.test(val)) { setAmount(val); setTouched(true); }
                }}
                disabled={busy}
              />
              <span className="token-chip"><span className="eth-dot"><Icon name="eth" size={12} /></span>ETH</span>
            </div>
            <p id="amount-msg" className={`field-msg ${touched && error ? "is-error" : ""}`}>
              {touched && error ? <><Icon name="alert" size={14} /> {error}</> : mode === "deposit" ? "Deposits are credited after one confirmation." : "Withdrawals are sent straight to your connected wallet."}
            </p>
            <div className="chips" role="group" aria-label="Quick amounts">
              {[0.25, 0.5, 0.75, 1].map((p) => (
                <button type="button" key={p} className="chip" disabled={!account || busy || available <= 0} onClick={() => setPct(p)}>
                  {p === 1 ? "Max" : `${p * 100}%`}
                </button>
              ))}
            </div>
          </div>

          <dl className="summary">
            <div>
              <dt>Current vault balance</dt>
              <dd>{account ? `${fmt(stats.vault, 6)} ETH` : <button type="button" className="inline-connect" onClick={connect}>Connect wallet</button>}</dd>
            </div>
            <div><dt>After this {mode}</dt><dd className={after !== null ? "is-strong" : ""}>{after !== null ? `${fmt(Math.max(after, 0), 6)} ETH` : "0 ETH"}</dd></div>
            <div><dt>Network</dt><dd>Sepolia</dd></div>
          </dl>

          <Button type="submit" size="lg" className="w-full" loading={busy} disabled={account && (!amount || !!error)}>
            {!account ? "Connect wallet to continue" : busy ? "Confirm in wallet..." : mode === "deposit" ? "Deposit ETH" : "Withdraw ETH"}
          </Button>
          {busy && lastHash && (
            <a className="pending-link" href={`${EXPLORER}/tx/${lastHash}`} target="_blank" rel="noreferrer">
              <span className="spinner sm" /> Waiting for confirmation - <span className="mono">{short(lastHash)}</span> <Icon name="external" size={14} />
            </a>
          )}
        </form>
      </Card>

      <div className="transfer-side">
        <Card title="Position">
          {account ? (
            <dl className="kv">
              <div><dt>In vault</dt><dd>{`${fmt(stats.vault, 6)} ETH`}</dd></div>
              <div><dt>In wallet</dt><dd>{`${fmt(stats.wallet, 6)} ETH`}</dd></div>
              <div><dt>Vault TVL</dt><dd>{fmt(stats.tvl)} ETH</dd></div>
            </dl>
          ) : (
            <div className="pos-connect">
              <p className="muted">Connect your wallet to view your personal vault and wallet balances.</p>
              <Button size="sm" variant="secondary" icon="wallet" onClick={connect} loading={v.connecting}>Connect wallet</Button>
              <dl className="kv">
                <div><dt>Vault TVL</dt><dd>{fmt(stats.tvl)} ETH</dd></div>
              </dl>
            </div>
          )}
        </Card>
        <Card title="Good to know">
          <ul className="notes">
            <li><Icon name="shield" size={16} /><span>Withdrawals are protected by a reentrancy guard.</span></li>
            <li><Icon name="clock" size={16} /><span>Sepolia blocks take about 12 seconds to confirm.</span></li>
            <li><Icon name="info" size={16} /><span>Testnet ETH has no real value. Get some from a Sepolia faucet.</span></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

/* ---------------- Activity (list + detail) ---------------- */

function Activity({ v, connect, go }) {
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [listW, setListW] = useState(400);
  const wide = useMedia("(min-width: 1024px)");
  const dragging = useRef(false);

  const items = v.history.filter((t) => filter === "all" || t.kind === filter);
  const current = items.find((t) => t.hash === selected) || (wide ? items[0] : null);

  const onDown = (e) => {
    dragging.current = true;
    const startX = e.clientX;
    const startW = listW;
    e.currentTarget.setPointerCapture(e.pointerId);
    const move = (ev) => dragging.current && setListW(Math.min(Math.max(startW + ev.clientX - startX, 300), 640));
    const up = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const onKey = (e) => {
    if (e.key === "ArrowLeft") setListW((w) => Math.max(w - 24, 300));
    if (e.key === "ArrowRight") setListW((w) => Math.min(w + 24, 640));
  };

  if (!v.account) {
    return (
      <Card>
        <EmptyState icon="wallet" title="Connect to see your activity" text="We read your deposit and withdrawal events directly from the vault contract." action={<Button icon="wallet" onClick={connect}>Connect wallet</Button>} />
      </Card>
    );
  }

  const list = (
    <Card padded={false} className="split-list">
      <div className="list-toolbar">
        <Tabs
          value={filter}
          onChange={setFilter}
          items={[{ value: "all", label: "All" }, { value: "deposit", label: "Deposits" }, { value: "withdraw", label: "Withdrawals" }]}
        />
        <IconButton icon="refresh" label="Refresh" onClick={() => { v.loadHistory(); v.refresh(); }} className={v.historyLoading ? "is-spinning" : ""} />
      </div>
      {v.historyError ? (
        <EmptyState icon="alert" title="Couldn't load activity" text={v.historyError} action={<Button size="sm" variant="secondary" icon="refresh" onClick={() => v.loadHistory()}>Try again</Button>} />
      ) : v.historyLoading && v.history.length === 0 ? (
        <RowSkeletons n={5} />
      ) : items.length === 0 ? (
        <EmptyState icon="inbox" title={filter === "all" ? "No transactions yet" : `No ${filter === "deposit" ? "deposits" : "withdrawals"} yet`} text="Transactions appear here as soon as they are submitted." action={<Button size="sm" icon="down" onClick={() => go("transfer", "deposit")}>Make a deposit</Button>} />
      ) : (
        <ul className="tx-list scroll">
          {items.map((t) => <TxRow key={t.hash} t={t} selected={wide && current?.hash === t.hash} onClick={() => setSelected(t.hash)} />)}
        </ul>
      )}
    </Card>
  );

  if (!wide) {
    return (
      <>
        {list}
        <Sheet open={!!selected && !!current} onClose={() => setSelected(null)} title="Transaction details">
          {current && <TxDetail t={current} />}
        </Sheet>
      </>
    );
  }

  return (
    <div className="split" style={{ gridTemplateColumns: `${listW}px 12px minmax(320px, 1fr)` }}>
      {list}
      <div className="resizer" role="separator" aria-orientation="vertical" aria-label="Resize panels" tabIndex={0} onPointerDown={onDown} onKeyDown={onKey}>
        <span />
      </div>
      <Card className="split-detail" title={current ? "Transaction details" : undefined}>
        {current ? <TxDetail t={current} /> : <EmptyState icon="activity" title="Select a transaction" text="Choose an item from the list to see its details." />}
      </Card>
    </div>
  );
}

function TxDetail({ t }) {
  return (
    <div className="detail">
      <div className="detail-hero">
        <span className={`tx-icon lg ${t.kind}`}><Icon name={t.kind === "deposit" ? "down" : "up"} size={20} /></span>
        <div>
          <p className="muted">{t.kind === "deposit" ? "Deposited to vault" : "Withdrawn to wallet"}</p>
          <p className={`detail-amt ${t.kind}`}>{t.kind === "deposit" ? "+" : "-"}{fmt(t.amount, 8)} ETH</p>
        </div>
      </div>
      <dl className="kv">
        <div><dt>Status</dt><dd><StatusBadge s={t.status} /></dd></div>
        <div><dt>Time</dt><dd>{t.time ? new Date(t.time).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "Recent"}</dd></div>
        <div><dt>Block</dt><dd className="mono">{t.block ?? "Pending"}</dd></div>
        <div><dt>Transaction</dt><dd className="mono row-gap">{short(t.hash, 10, 8)} <CopyButton value={t.hash} label="Copy hash" /></dd></div>
      </dl>
      <a className="btn btn-secondary btn-md w-full" href={`${EXPLORER}/tx/${t.hash}`} target="_blank" rel="noreferrer">
        <Icon name="external" size={18} /><span>View on Etherscan</span>
      </a>
    </div>
  );
}

/* ---------------- Contract ---------------- */

function ContractView({ v }) {
  const d = v.deployment;
  const fns = [
    { sig: "deposit()", type: "payable", desc: "Adds msg.value to your vault balance and emits Deposited." },
    { sig: "withdraw(uint256 amount)", type: "write", desc: "Sends amount back to you. Reverts if it exceeds your balance." },
    { sig: "balances(address)", type: "view", desc: "Returns the ETH balance a wallet holds in the vault." },
    { sig: "totalDeposits()", type: "view", desc: "Returns the total ETH held by the vault." },
  ];
  return (
    <div className="grid-contract">
      <Card title="Deployment" subtitle="MiniVault.sol / Solidity 0.8.24">
        <dl className="kv">
          <div><dt>Address</dt><dd className="mono row-gap">{short(d.address, 10, 8)} <CopyButton value={d.address} label="Copy address" /></dd></div>
          <div><dt>Network</dt><dd>Ethereum Sepolia <Badge tone="green">Live</Badge></dd></div>
          <div><dt>Chain ID</dt><dd className="mono">{d.chainId}</dd></div>
          <div><dt>Deploy block</dt><dd className="mono">{d.deployBlock.toLocaleString()}</dd></div>
          <div><dt>Deploy tx</dt><dd className="mono row-gap">{short(d.deployTx, 10, 8)} <CopyButton value={d.deployTx} label="Copy tx hash" /></dd></div>
          <div><dt>Total value locked</dt><dd>{fmt(v.stats.tvl)} ETH</dd></div>
        </dl>
        <div className="btn-row">
          <a className="btn btn-primary btn-md" href={`${EXPLORER}/address/${d.address}`} target="_blank" rel="noreferrer"><Icon name="external" size={18} /><span>Open in Etherscan</span></a>
          <a className="btn btn-ghost btn-md" href="https://github.com/Bookofharry/mini-defi-vault" target="_blank" rel="noreferrer"><Icon name="link" size={18} /><span>Source code</span></a>
        </div>
      </Card>

      <Card title="Functions" subtitle="Public interface" padded={false}>
        <ul className="fn-list">
          {fns.map((f) => (
            <li key={f.sig}>
              <div className="fn-top">
                <code className="mono">{f.sig}</code>
                <Badge tone={f.type === "view" ? "neutral" : f.type === "payable" ? "blue" : "amber"}>{f.type}</Badge>
              </div>
              <p className="muted">{f.desc}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Security">
        <ul className="notes">
          <li><Icon name="shield" size={16} /><span><b>Reentrancy guard</b> on withdraw prevents recursive drains.</span></li>
          <li><Icon name="check" size={16} /><span><b>Checks-effects-interactions</b>: balances update before ETH is sent.</span></li>
          <li><Icon name="check" size={16} /><span><b>Non-custodial</b>: no owner or admin can move user funds.</span></li>
        </ul>
      </Card>
    </div>
  );
}

/* ---------------- Wallet picker (no injected wallet or conflict) ---------------- */

function WalletSheet({ open, onClose, onSelectProvider, toast }) {
  const [mobile, setMobile] = useState(false);
  const [links, setLinks] = useState([]);
  const [announced, setAnnounced] = useState([]);

  useEffect(() => {
    if (!open) return;
    setMobile(isMobileDevice());
    setLinks(walletDeepLinks());
    setAnnounced(getAnnouncedWallets());
  }, [open]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({ type: "success", title: "Link copied", text: "Paste it into your wallet app's browser." });
    } catch {
      toast({ type: "error", title: "Could not copy", text: window.location.href });
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title={mobile ? "Open in a wallet app" : "Connect your wallet"}>
      {mobile ? (
        <div className="wallet-sheet">
          <p className="muted">
            Mobile browsers cannot connect to a wallet directly. Open MiniVault inside your wallet app's built-in browser to connect.
          </p>
          <ul className="wallet-list">
            {links.map((w) => (
              <li key={w.id}>
                <a className="wallet-option" href={w.url}>
                  <span className="wallet-option-icon"><Icon name="wallet" size={18} /></span>
                  <span className="wallet-option-text">
                    <b>{w.name}</b>
                    <small>Open MiniVault in {w.name}</small>
                  </span>
                  <Icon name="chevronRight" size={18} />
                </a>
              </li>
            ))}
          </ul>
          <Button variant="secondary" icon="copy" className="w-full" onClick={copyLink}>Copy link for another wallet</Button>
          <p className="hint center">
            No wallet yet? <a href="https://metamask.io/download/" target="_blank" rel="noreferrer">Get MetaMask</a>, create a wallet, then come back.
          </p>
        </div>
      ) : (
        <div className="wallet-sheet">
          {announced.length > 0 && (
            <>
              <p className="muted">Select the wallet extension you want to connect with:</p>
              <ul className="wallet-list">
                {announced.map((item, idx) => (
                  <li key={item.info?.uuid || idx}>
                    <button type="button" className="wallet-option w-full" onClick={() => onSelectProvider(item.provider)}>
                      <span className="wallet-option-icon">
                        {item.info?.icon ? <img src={item.info.icon} alt="" width={22} height={22} /> : <Icon name="wallet" size={18} />}
                      </span>
                      <span className="wallet-option-text">
                        <b>{item.info?.name || "Browser Wallet"}</b>
                        <small>Click to connect</small>
                      </span>
                      <Icon name="chevronRight" size={18} />
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
          <div className="conflict-box">
            <p className="conflict-title"><Icon name="alert" size={16} /> Why did connection fail?</p>
            <ol className="steps">
              <li>
                <span className="step-n">1</span>
                <div>
                  <b>Unlock MetaMask first</b>
                  <p>Click the MetaMask fox icon in your browser's top-right toolbar and enter your password so it is unlocked.</p>
                </div>
              </li>
              <li>
                <span className="step-n">2</span>
                <div>
                  <b>Disable conflicting wallet extensions</b>
                  <p>Another wallet extension (producing <code>evmAsk.js</code>, such as Phantom, OKX, or Coinbase Wallet) is intercepting MetaMask. Open <code>chrome://extensions</code> and toggle off the other wallet extension.</p>
                </div>
              </li>
              <li>
                <span className="step-n">3</span>
                <div>
                  <b>Try connecting again</b>
                  <p>Once MetaMask is unlocked, click Retry below.</p>
                </div>
              </li>
            </ol>
          </div>
          <div className="btn-row">
            <Button variant="primary" icon="wallet" onClick={() => onSelectProvider(null)}>Retry connection</Button>
            <Button variant="secondary" icon="refresh" onClick={() => window.location.reload()}>Reload page</Button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
