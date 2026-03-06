/**
 * src/components/UI.jsx
 * Atom-level reusable components
 */

import { useState } from "react";
import { X } from "lucide-react";
import { THEME } from "../lib/constants";

// ─── TOAST NOTIFICATION ─────────────────────────────────
export const AppToast = ({ notification }) => {
  if (!notification) return null;

  const styles = {
    red:   { bg: THEME.rBg, border: THEME.rBdr, color: THEME.red },
    amber: { bg: THEME.aBg, border: THEME.aBdr, color: THEME.amber },
    green: { bg: THEME.gBg, border: THEME.gBdr, color: THEME.green },
    blue:  { bg: THEME.lBg, border: THEME.lBdr, color: THEME.blue },
  };
  const s = styles[notification.type] || styles.green;

  return (
    <div
      className="fi"
      style={{
        position: "fixed", top: "20px", left: "50%",
        transform: "translateX(-50%)", zIndex: 9999,
        background: s.bg, border: `1px solid ${s.border}`,
        color: s.color, padding: "12px 24px",
        borderRadius: "99px", fontWeight: 800, fontSize: "14px",
        boxShadow: "0 10px 40px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
        maxWidth: "90vw", textAlign: "center",
      }}
    >
      {notification.msg}
    </div>
  );
};

// ─── STATUS PILL ────────────────────────────────────────
export const StatusPill = ({ color, backgroundColor, borderColor, children }) => (
  <span
    style={{
      background: backgroundColor || THEME.bg3,
      color: color || THEME.t2,
      border: `1px solid ${borderColor || THEME.bdr}`,
      fontSize: "10px", fontWeight: 700,
      padding: "4px 10px", borderRadius: "99px", whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

// ─── ADVISORY BOX ────────────────────────────────────────
export const AdvisoryBox = ({ type, text }) => {
  const map = {
    red:     { bg: THEME.rBg, col: THEME.red,   bdr: THEME.rBdr, icon: "▼" },
    amber:   { bg: THEME.aBg, col: THEME.amber, bdr: THEME.aBdr, icon: "●" },
    green:   { bg: THEME.gBg, col: THEME.green, bdr: THEME.gBdr, icon: "▲" },
    blue:    { bg: THEME.lBg, col: THEME.blue,  bdr: THEME.lBdr, icon: "⚡" },
    neutral: { bg: THEME.bg3, col: THEME.t2,    bdr: THEME.bdr,  icon: "—" },
  };
  const t = map[type] || map.neutral;

  return (
    <div
      className="fu"
      style={{
        background: t.bg, border: `1px solid ${t.bdr}`,
        borderRadius: "12px", padding: "12px 16px",
        marginBottom: "8px", display: "flex", gap: "12px",
        alignItems: "flex-start",
      }}
    >
      <span style={{ color: t.col, fontWeight: 900, fontSize: "14px", marginTop: "2px", flexShrink: 0 }}>
        {t.icon}
      </span>
      <span style={{ fontSize: "13px", color: t.col, lineHeight: 1.5, fontWeight: 500 }}>
        {text}
      </span>
    </div>
  );
};

// ─── LOADING SPINNER ─────────────────────────────────────
export const LoadingIndicator = ({ size = 16 }) => (
  <div
    className="spin"
    style={{
      width: `${size}px`, height: `${size}px`,
      border: `2px solid ${THEME.bdr2}`,
      borderTopColor: THEME.em, borderRadius: "50%",
      display: "inline-block", flexShrink: 0,
    }}
  />
);

// ─── ACTION BUTTON ───────────────────────────────────────
export const ActionButton = ({
  children, variant = "primary", icon,
  isFullWidth, onClick, isDisabled, customStyle = {},
  type = "button",
}) => {
  const variants = {
    primary:   { background: THEME.em,  color: THEME.bg0, border: "none" },
    secondary: { background: THEME.bg2, color: THEME.t1,  border: `1px solid ${THEME.bdr2}` },
    danger:    { background: THEME.rBg, color: THEME.red,  border: `1px solid ${THEME.rBdr}` },
    ghost:     { background: "transparent", color: THEME.t2, border: `1px solid ${THEME.bdr2}` },
  };
  const v = variants[variant];

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className="tap"
      style={{
        ...v, borderRadius: "14px", padding: "14px 20px",
        fontSize: "14px", fontWeight: 800,
        cursor: isDisabled ? "not-allowed" : "pointer",
        display: "inline-flex", alignItems: "center",
        justifyContent: "center", gap: "8px",
        width: isFullWidth ? "100%" : "auto",
        opacity: isDisabled ? 0.6 : 1,
        transition: "all 0.2s ease",
        ...customStyle,
      }}
    >
      {icon} {children}
    </button>
  );
};

// ─── FORM INPUT ──────────────────────────────────────────
export const FormInput = ({
  label, hint, value, onChange, placeholder,
  type = "text", prefixText,
}) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div style={{ marginBottom: "16px" }}>
      {label && (
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
          <span style={{ fontSize: "11px", fontWeight: 800, color: THEME.t2, letterSpacing: "0.5px" }}>
            {label.toUpperCase()}
          </span>
          {hint && (
            <span style={{ fontSize: "11px", color: THEME.t3 }}>{hint}</span>
          )}
        </div>
      )}
      <div
        style={{
          display: "flex", background: THEME.bg3,
          border: `1.5px solid ${isFocused ? THEME.em : THEME.bdr2}`,
          borderRadius: "14px", overflow: "hidden",
          transition: "border 0.2s ease",
        }}
      >
        {prefixText && (
          <div
            style={{
              padding: "0 14px", fontSize: "14px", color: THEME.t3,
              background: THEME.bg2, display: "flex", alignItems: "center",
              borderRight: `1px solid ${THEME.bdr2}`, fontWeight: 700,
            }}
          >
            {prefixText}
          </div>
        )}
        <input
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={{
            flex: 1, background: "transparent", border: "none",
            padding: "14px 16px", color: THEME.t1,
            fontSize: "15px", fontWeight: 600, width: "100%",
          }}
        />
      </div>
    </div>
  );
};

// ─── SLIDE UP MODAL ──────────────────────────────────────
export const SlideUpModal = ({ isOpen, onClose, title, subtitle, children }) => {
  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", flexDirection: "column", justifyContent: "flex-end",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="fi"
        style={{
          position: "absolute", inset: 0,
          background: "rgba(4, 9, 16, 0.85)",
          backdropFilter: "blur(12px)",
        }}
        onClick={onClose}
      />
      <div
        className="su"
        style={{
          position: "relative", background: THEME.bg1,
          borderTop: `1px solid ${THEME.bdr2}`,
          borderRadius: "28px 28px 0 0",
          width: "100%", maxWidth: "480px",
          margin: "0 auto", maxHeight: "90vh",
          overflowY: "auto",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {/* Header */}
        <div
          style={{
            position: "sticky", top: 0, background: THEME.bg1,
            zIndex: 10, padding: "16px 24px",
            borderBottom: `1px solid ${THEME.bdr}`,
          }}
        >
          <div
            style={{
              width: "40px", height: "5px", background: THEME.bdr2,
              borderRadius: "99px", margin: "0 auto 16px",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div>
              <h2 style={{ fontSize: "20px", fontWeight: 800, color: THEME.t1 }}>{title}</h2>
              {subtitle && (
                <p style={{ fontSize: "12px", color: THEME.t3, marginTop: "4px" }}>{subtitle}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="tap"
              style={{
                background: THEME.bg3, border: "none",
                width: "36px", height: "36px", borderRadius: "12px",
                display: "flex", alignItems: "center",
                justifyContent: "center", cursor: "pointer",
              }}
            >
              <X size={16} color={THEME.t2} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "24px" }}>{children}</div>
      </div>
    </div>
  );
};

// ─── BOTTOM NAVIGATION ───────────────────────────────────
export const BottomNavigation = ({ currentTab, onTabChange }) => {
  // Import icons inline agar tidak circular
  const {
    LayoutDashboard, Search, BookOpen, BarChart2, TrendingUp,
  } = require("lucide-react");

  const items = [
    { id: "portfolio", label: "Portofolio", Icon: LayoutDashboard },
    { id: "screener",  label: "Screener",   Icon: Search },
    { id: "jurnal",    label: "Jurnal",      Icon: BookOpen },
    { id: "monitor",   label: "Monitor",     Icon: BarChart2 },
    { id: "forecast",  label: "Forecast",    Icon: TrendingUp },
  ];

  return (
    <div
      style={{
        position: "fixed", bottom: 0, left: "50%",
        transform: "translateX(-50%)",
        width: "100%", maxWidth: "480px", zIndex: 100,
        background: "rgba(8, 15, 26, 0.97)",
        backdropFilter: "blur(20px)",
        borderTop: `1px solid ${THEME.bdr2}`,
        display: "flex", justifyContent: "space-around",
        padding: "12px 8px calc(12px + env(safe-area-inset-bottom))",
      }}
    >
      {items.map(({ id, label, Icon }) => {
        const active = currentTab === id;
        return (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              display: "flex", flexDirection: "column",
              alignItems: "center", gap: "6px", flex: 1,
              transition: "all 0.2s",
            }}
          >
            <Icon
              size={22}
              color={active ? THEME.em : THEME.t3}
              strokeWidth={active ? 2.5 : 2}
              style={{ transition: "all 0.2s", transform: active ? "scale(1.1)" : "scale(1)" }}
            />
            <span style={{ fontSize: "10px", fontWeight: active ? 800 : 600, color: active ? THEME.em : THEME.t3 }}>
              {label}
            </span>
          </button>
        );
      })}
    </div>
  );
};