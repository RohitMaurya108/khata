"use client";
import { useState } from "react";
import { sb } from "../lib/supabase";
import { Modal, fmt } from "./ui";

const blank = { name: "", hsn: "", unit: "pcs", price: "", gst: "0", stock: "0", min_stock: "0" };
export default function Items({ items, bookId, t, reload }) {
  const [f, setF] = useState(null);
  const save = async () => {
    if (!f.name.trim()) return;
    const v = { name: f.name.trim(), hsn: f.hsn, unit: f.unit || "pcs", price: +f.price || 0, gst: +f.gst || 0, stock: +f.stock || 0, min_stock: +f.min_stock || 0 };
    if (f.id) await sb.from("items").update(v).eq("id", f.id); else await sb.from("items").insert({ ...v, book_id: bookId });
    setF(null); reload();
  };
  const del = async id => { if (confirm("Delete?")) { await sb.from("items").delete().eq("id", id); reload(); } };
  const inp = (k, l, type = "text") => <label>{t(l)}<input type={type} step="any" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} /></label>;
  return (<div>
    <button className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={() => setF(blank)}>{t("Add item")}</button>
    {items.length ? items.map(i => { const low = Number(i.stock) <= Number(i.min_stock); return (
      <div className="row" key={i.id}><div><b>{i.name}</b><span>{fmt(i.price)} · GST {i.gst}%{i.hsn ? " · HSN " + i.hsn : ""}</span></div>
        <div className={"amt " + (low ? "o" : "")}>{Number(i.stock)} {i.unit}<span style={{ display: "block" }}>{low ? t("Low stock") : ""}</span>
          <button className="lk" onClick={() => setF({ ...i })}>{t("Edit")}</button><button className="lk" onClick={() => del(i.id)}>{t("Delete")}</button></div></div>); })
      : <div className="empty">No items yet. Add what you sell to track stock and create invoices faster.</div>}
    {f && <Modal onClose={() => setF(null)}><h2>{t(f.id ? "Edit" : "Add item")}</h2>
      {inp("name", "Name")}{inp("hsn", "HSN code")}{inp("unit", "Unit")}{inp("price", "Price", "number")}{inp("gst", "GST %", "number")}{inp("stock", "Stock", "number")}{inp("min_stock", "Min stock", "number")}
      <button className="save" style={{ background: "var(--acc)", color: "var(--accink)" }} onClick={save}>{t("Save")}</button>
      <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setF(null)}>{t("Cancel")}</button></Modal>}
  </div>);
}
