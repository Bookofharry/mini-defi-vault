"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

export function Button({ variant = "primary", size = "md", loading, icon, children, className = "", ...rest }) {
  return (
    <button
      className={`btn btn-${variant} btn-${size} ${loading ? "is-loading" : ""} ${className}`}
      disabled={rest.disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <span className="spinner" aria-hidden="true" /> : icon ? <Icon name={icon} size={size === "sm" ? 16 : 18} /> : null}
      {children && <span>{children}</span>}
    </button>
  );
}

export function IconButton({ icon, label, tooltip = true, className = "", ...rest }) {
  return (
    <button className={`icon-btn ${className}`} aria-label={label} data-tooltip={tooltip ? label : undefined} {...rest}>
      <Icon name={icon} size={18} />
    </button>
  );
}

export function Card({ title, subtitle, action, children, className = "", padded = true }) {
  return (
    <section className={`card ${padded ? "card-pad" : ""} ${className}`}>
      {(title || action) && (
        <header className="card-head">
          <div>
            {title && <h2 className="card-title">{title}</h2>}
            {subtitle && <p className="card-sub">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

export function Badge({ tone = "neutral", children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Skeleton({ w = "100%", h = 14, r = 6 }) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r }} />;
}

export function Tabs({ value, onChange, items, full }) {
  return (
    <div className={`tabs ${full ? "tabs-full" : ""}`} role="tablist">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          className={`tab ${value === it.value ? "is-active" : ""}`}
          onClick={() => onChange(it.value)}
        >
          {it.icon && <Icon name={it.icon} size={16} />}
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ icon = "inbox", title, text, action }) {
  return (
    <div className="empty">
      <div className="empty-icon"><Icon name={icon} size={20} /></div>
      <p className="empty-title">{title}</p>
      {text && <p className="empty-text">{text}</p>}
      {action}
    </div>
  );
}

export function Menu({ trigger, children, align = "end" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);
  return (
    <div className="menu-wrap" ref={ref}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}
      {open && (
        <div className={`menu menu-${align}`} role="menu" onClick={() => setOpen(false)}>
          {children}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, danger, ...rest }) {
  return (
    <button role="menuitem" className={`menu-item ${danger ? "is-danger" : ""}`} {...rest}>
      {icon && <Icon name={icon} size={16} />}
      {children}
    </button>
  );
}

// Bottom sheet on mobile, centered dialog on larger screens.
export function Sheet({ open, onClose, title, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="overlay" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grip" aria-hidden="true" />
        <header className="sheet-head">
          <h2 className="card-title">{title}</h2>
          <IconButton icon="close" label="Close" tooltip={false} onClick={onClose} />
        </header>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Toasts({ items, onDismiss }) {
  return (
    <div className="toasts" aria-live="polite">
      {items.map((t) => (
        <div key={t.id} className={`toast toast-${t.type}`} role="status">
          <Icon name={t.type === "success" ? "check" : t.type === "error" ? "alert" : "info"} size={18} />
          <div className="toast-body">
            <p className="toast-title">{t.title}</p>
            {t.text && <p className="toast-text">{t.text}</p>}
            {t.href && (
              <a href={t.href} target="_blank" rel="noreferrer" className="toast-link">
                View on Etherscan <Icon name="external" size={14} />
              </a>
            )}
          </div>
          <button className="toast-x" aria-label="Dismiss" onClick={() => onDismiss(t.id)}>
            <Icon name="close" size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export function CopyButton({ value, label = "Copy" }) {
  const [done, setDone] = useState(false);
  return (
    <IconButton
      icon={done ? "check" : "copy"}
      label={done ? "Copied" : label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {}
      }}
    />
  );
}

