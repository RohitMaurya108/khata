"use client";
export const fmt = n => "₹" + Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
export const today = () => new Date().toISOString().slice(0, 10);
export const sum = (E, t) => E.filter(e => e.type === t).reduce((a, e) => a + Number(e.amount), 0);
export function Modal({ children, onClose }) {
  return <div className="ov" onClick={onClose}><div className="dlg" onClick={e => e.stopPropagation()}>{children}</div></div>;
}
