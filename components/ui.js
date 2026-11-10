"use client";
import { X } from "lucide-react";
export const fmt = (n) =>
  "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
export const fmtC = (n) =>
  n >= 1e7
    ? (n / 1e7).toFixed(1) + "Cr"
    : n >= 1e5
      ? (n / 1e5).toFixed(1) + "L"
      : n >= 1e3
        ? (n / 1e3).toFixed(1) + "k"
        : String(Math.round(n));
export const today = () => new Date().toISOString().slice(0, 10);
export const sum = (E, t) =>
  E.filter((e) => e.type === t).reduce((a, e) => a + Number(e.amount), 0);
export function Modal({ title, children, onClose, wide }) {
  return (
    <div className="ov" onClick={onClose}>
      <div
        className={"dlg" + (wide ? " wide" : "")}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="dh">
          <h2>{title}</h2>
          <button className="ibtn" aria-label="Close" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
export const Pill = ({ c, children }) => (
  <span className={"pill " + c}>{children}</span>
);
export const Field = ({ label, children }) => (
  <label className="fld">
    <span>{label}</span>
    {children}
  </label>
);
export function MonthChart({ entries }) {
  const now = new Date(),
    ms = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    ms.push({
      k: d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0"),
      l: d.toLocaleString("en-IN", { month: "short" }),
      in: 0,
      out: 0,
    });
  }
  entries.forEach((e) => {
    const m = ms.find((x) => e.entry_date.startsWith(x.k));
    if (m) m[e.type] += Number(e.amount);
  });
  const max = Math.max(1, ...ms.flatMap((m) => [m.in, m.out])),
    W = 600,
    H = 220,
    pl = 46,
    pb = 26,
    pt = 10,
    bw = 18,
    step = (W - pl) / 6,
    h = (v) => ((H - pt - pb) * v) / max;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="chart"
      role="img"
      aria-label="Income and expenses by month"
    >
      {[0, 1, 2, 3].map((i) => {
        const y = pt + (H - pt - pb) * (1 - i / 3);
        return (
          <g key={i}>
            <line
              x1={pl}
              x2={W}
              y1={y}
              y2={y}
              style={{ stroke: "var(--line)" }}
            />
            <text x={pl - 6} y={y + 4} textAnchor="end" className="ax">
              {fmtC((max * i) / 3)}
            </text>
          </g>
        );
      })}
      {ms.map((m, i) => {
        const x = pl + step * i + step / 2;
        return (
          <g key={m.k}>
            <rect
              x={x - bw - 2}
              y={H - pb - h(m.in)}
              width={bw}
              height={h(m.in)}
              rx="4"
              style={{ fill: "var(--in)" }}
            />
            <rect
              x={x + 2}
              y={H - pb - h(m.out)}
              width={bw}
              height={h(m.out)}
              rx="4"
              style={{ fill: "var(--out)" }}
            />
            <text x={x} y={H - 8} textAnchor="middle" className="ax">
              {m.l}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
