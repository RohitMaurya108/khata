"use client";
import { useState } from "react";
import { sb } from "../lib/supabase";
import { Modal, fmt, today } from "./ui";

export const calc = (lines, same) => {
  let sub = 0, tax = 0;
  const L = lines.map(l => { const tv = (+l.qty || 0) * (+l.rate || 0), tx = tv * (+l.gst || 0) / 100; sub += tv; tax += tx; return { ...l, taxable: tv, tax: tx }; });
  return { lines: L, sub, tax, total: sub + tax, cgst: same ? tax / 2 : 0, sgst: same ? tax / 2 : 0, igst: same ? 0 : tax };
};

export function InvoicePrint({ inv, biz }) {
  const c = calc(inv.items, inv.same_state), due = Number(inv.total) - Number(inv.paid);
  return (<div>
    <h1 style={{ margin: 0 }}>{(biz && biz.name) || "Tax Invoice"}</h1>
    <div>{biz && biz.address}{biz && biz.phone ? " · " + biz.phone : ""}{biz && biz.gstin ? " · GSTIN " + biz.gstin : ""}</div>
    <h2>Tax Invoice {inv.number}</h2>
    <p>Date: {inv.inv_date}<br />Bill to: {inv.customer_name || "Walk-in customer"}{inv.customer_gstin ? " · GSTIN " + inv.customer_gstin : ""}</p>
    <table><thead><tr><th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>GST %</th><th>Taxable</th><th>Tax</th><th>Amount</th></tr></thead>
      <tbody>{c.lines.map((l, i) => <tr key={i}><td>{i + 1}</td><td>{l.name}</td><td>{l.qty}</td><td>{fmt(l.rate)}</td><td>{l.gst}</td><td>{fmt(l.taxable)}</td><td>{fmt(l.tax)}</td><td>{fmt(l.taxable + l.tax)}</td></tr>)}</tbody></table>
    <p style={{ textAlign: "right" }}>Subtotal {fmt(c.sub)}<br />
      {inv.same_state ? <>CGST {fmt(c.cgst)}<br />SGST {fmt(c.sgst)}</> : <>IGST {fmt(c.igst)}</>}<br />
      <b>Total {fmt(c.total)}</b><br />Paid {fmt(inv.paid)}<br /><b>Balance due {fmt(due)}</b></p>
  </div>);
}

export default function Invoices({ invoices, items, parties, bookId, t, reload, onPrint }) {
  const [f, setF] = useState(null); const [r, setR] = useState(null);
  const blank = { cust: "", name: "", gstin: "", same: true, date: today(), lines: [{ item_id: "", name: "", qty: 1, rate: "", gst: 0 }], paid: "", mode: "Cash" };
  const setLine = (i, p) => setF(x => ({ ...x, lines: x.lines.map((l, j) => j === i ? { ...l, ...p } : l) }));
  const pickItem = (i, id) => { const it = items.find(z => z.id === id); setLine(i, it ? { item_id: id, name: it.name, rate: it.price, gst: it.gst } : { item_id: "" }); };
  const pickParty = id => { const p = parties.find(z => z.id === id); setF(x => ({ ...x, cust: id, name: p ? p.name : x.name })); };
  const live = f ? calc(f.lines.filter(l => l.name && +l.qty > 0), f.same) : null;

  const save = async () => {
    const c = calc(f.lines.filter(l => l.name && +l.qty > 0), f.same); if (!c.lines.length) return;
    const nums = invoices.map(i => +String(i.number).replace(/\D/g, "") || 0);
    const number = "INV-" + String(Math.max(0, ...nums) + 1).padStart(4, "0");
    const paid = Math.min(+f.paid || 0, c.total);
    const { error } = await sb.from("invoices").insert({ book_id: bookId, number, inv_date: f.date, party_id: f.cust || null, customer_name: f.name, customer_gstin: f.gstin, same_state: f.same,
      items: c.lines.map(l => ({ item_id: l.item_id, name: l.name, qty: +l.qty, rate: +l.rate, gst: +l.gst })), subtotal: c.sub, tax: c.tax, total: c.total, paid });
    if (error) { alert(error.message); return; }
    const use = {}; c.lines.forEach(l => { if (l.item_id) use[l.item_id] = (use[l.item_id] || 0) + +l.qty; });
    for (const id of Object.keys(use)) { const it = items.find(z => z.id === id); if (it) await sb.from("items").update({ stock: Number(it.stock) - use[id] }).eq("id", id); }
    if (paid > 0) await sb.from("entries").insert({ book_id: bookId, type: "in", amount: paid, category: "Sales", mode: f.mode, entry_date: f.date, note: number });
    if (f.cust && c.total - paid > 0) await sb.from("party_tx").insert({ party_id: f.cust, kind: "due", amount: c.total - paid });
    setF(null); reload();
  };
  const receive = async () => {
    const inv = r.inv, a = Math.min(+r.amt || 0, Number(inv.total) - Number(inv.paid)); if (!(a > 0)) return;
    await sb.from("invoices").update({ paid: Number(inv.paid) + a }).eq("id", inv.id);
    await sb.from("entries").insert({ book_id: bookId, type: "in", amount: a, category: "Payment received", mode: r.mode, entry_date: today(), note: inv.number });
    if (inv.party_id) await sb.from("party_tx").insert({ party_id: inv.party_id, kind: "pay", amount: a });
    setR(null); reload();
  };
  const del = async inv => {
    if (!confirm("Delete " + inv.number + "? Stock will be restored. Cashbook entries stay.")) return;
    for (const l of inv.items) { if (l.item_id) { const it = items.find(z => z.id === l.item_id); if (it) await sb.from("items").update({ stock: Number(it.stock) + Number(l.qty) }).eq("id", l.item_id); } }
    await sb.from("invoices").delete().eq("id", inv.id); reload();
  };

  return (<div>
    <button className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={() => setF(blank)}>{t("New invoice")}</button>
    {invoices.length ? invoices.map(v => { const due = Number(v.total) - Number(v.paid); return (
      <div className="row" key={v.id}><div><b>{v.number} · {v.customer_name || "Walk-in"}</b><span>{v.inv_date} · {due > 0 ? t("Due") + " " + fmt(due) : t("Paid")}</span></div>
        <div className="amt">{fmt(v.total)}
          <button className="lk" onClick={() => onPrint(v)}>{t("Print")}</button>
          {due > 0 && <button className="lk" onClick={() => setR({ inv: v, amt: due, mode: "Cash" })}>{t("Receive payment")}</button>}
          <button className="lk" onClick={() => del(v)}>{t("Delete")}</button></div></div>); })
      : <div className="empty">No invoices yet. Create your first GST invoice.</div>}

    {f && <Modal onClose={() => setF(null)}><h2>{t("New invoice")}</h2>
      <label>{t("Customer")}<select className="f" value={f.cust} onChange={e => pickParty(e.target.value)}><option value="">—</option>{parties.filter(p => p.kind === "customer").map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label>{t("Customer name")}<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <label>{t("Customer GSTIN")}<input value={f.gstin} onChange={e => setF({ ...f, gstin: e.target.value.toUpperCase() })} /></label>
      <label><input type="checkbox" style={{ width: "auto", marginRight: 8 }} checked={f.same} onChange={e => setF({ ...f, same: e.target.checked })} />{t("Same state (CGST + SGST)")}</label>
      <label>{t("Date")}<input type="date" value={f.date} onChange={e => setF({ ...f, date: e.target.value })} /></label>
      {f.lines.map((l, i) => (<div key={i} style={{ borderTop: "1px solid var(--line)", marginTop: 12, paddingTop: 4 }}>
        <label>{t("Item")}<select className="f" value={l.item_id} onChange={e => pickItem(i, e.target.value)}><option value="">—</option>{items.map(z => <option key={z.id} value={z.id}>{z.name}</option>)}</select></label>
        <input placeholder={t("Item")} value={l.name} onChange={e => setLine(i, { name: e.target.value })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
          <input type="number" min="0" step="any" placeholder={t("Quantity")} value={l.qty} onChange={e => setLine(i, { qty: e.target.value })} />
          <input type="number" min="0" step="any" placeholder={t("Rate")} value={l.rate} onChange={e => setLine(i, { rate: e.target.value })} />
          <input type="number" min="0" step="any" placeholder="GST %" value={l.gst} onChange={e => setLine(i, { gst: e.target.value })} /></div>
        {f.lines.length > 1 && <button className="lk" style={{ border: 0, background: "none", color: "var(--out)", cursor: "pointer" }} onClick={() => setF({ ...f, lines: f.lines.filter((_, j) => j !== i) })}>{t("Delete")}</button>}</div>))}
      <button className="btn" style={{ marginTop: 10 }} onClick={() => setF({ ...f, lines: [...f.lines, { item_id: "", name: "", qty: 1, rate: "", gst: 0 }] })}>{t("Add line")}</button>
      <div className="row"><b>{t("Total")}</b><b>{fmt(live.total)}</b></div>
      <label>{t("Received now (₹)")}<input type="number" min="0" step="any" value={f.paid} onChange={e => setF({ ...f, paid: e.target.value })} /></label>
      <label>{t("Paid by")}<select className="f" value={f.mode} onChange={e => setF({ ...f, mode: e.target.value })}>{["Cash", "UPI", "Bank"].map(m => <option key={m} value={m}>{t(m)}</option>)}</select></label>
      <button className="save" style={{ background: "var(--acc)", color: "var(--accink)" }} onClick={save}>{t("Save invoice")}</button>
      <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setF(null)}>{t("Cancel")}</button></Modal>}

    {r && <Modal onClose={() => setR(null)}><h2>{t("Receive payment")} · {r.inv.number}</h2>
      <label>{t("Amount (₹)")}<input type="number" step="any" value={r.amt} onChange={e => setR({ ...r, amt: e.target.value })} /></label>
      <label>{t("Paid by")}<select className="f" value={r.mode} onChange={e => setR({ ...r, mode: e.target.value })}>{["Cash", "UPI", "Bank"].map(m => <option key={m} value={m}>{t(m)}</option>)}</select></label>
      <button className="save" style={{ background: "var(--in)" }} onClick={receive}>{t("Save")}</button>
      <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setR(null)}>{t("Cancel")}</button></Modal>}
  </div>);
}
