"use client";
import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { Modal, fmt, today, sum } from "./ui";
import Items from "./Items";
import Invoices, { InvoicePrint } from "./Invoices";

const CATS = { in: ["Sales", "Payment received", "Loan", "Other income"], out: ["Stock purchase", "Rent", "Salary", "Transport", "Electricity", "Food", "Other expense"] };
const MODES = ["Cash", "UPI", "Bank"];

function EntryForm({ type, init, t, onSave, onClose }) {
  const [a, setA] = useState(init ? String(init.amount) : ""); const [c, setC] = useState(init ? init.category : CATS[type][0]);
  const [m, setM] = useState(init ? init.mode : "Cash"); const [d, setD] = useState(init ? init.entry_date : today()); const [n, setN] = useState(init ? init.note || "" : "");
  const col = type === "in" ? "var(--in)" : "var(--out)";
  const cats = CATS[type].includes(c) ? CATS[type] : [c, ...CATS[type]];
  return (<Modal onClose={onClose}>
    <h2>{t(type === "in" ? "Cash in" : "Cash out")}</h2>
    <label>{t("Amount (₹)")}<input className="amtin" type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={a} onChange={e => setA(e.target.value)} /></label>
    <label>{t("Category")}<select className="f" value={c} onChange={e => setC(e.target.value)}>{cats.map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label>
    <label>{t("Paid by")}<select className="f" value={m} onChange={e => setM(e.target.value)}>{MODES.map(x => <option key={x} value={x}>{t(x)}</option>)}</select></label>
    <label>{t("Date")}<input type="date" value={d} onChange={e => setD(e.target.value)} /></label>
    <label>{t("Note (optional)")}<input maxLength={80} value={n} onChange={e => setN(e.target.value)} /></label>
    <button className="save" style={{ background: col }} onClick={() => parseFloat(a) > 0 && onSave({ type, amount: parseFloat(a), category: c, mode: m, entry_date: d || today(), note: n.trim() })}>{t("Save entry")}</button>
    <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>{t("Cancel")}</button>
  </Modal>);
}

export default function Cashbook({ t }) {
  const [books, setBooks] = useState([]); const [cur, setCur] = useState(null);
  const [entries, setEntries] = useState([]); const [parties, setParties] = useState([]); const [ptx, setPtx] = useState([]);
  const [items, setItems] = useState([]); const [invoices, setInvoices] = useState([]); const [biz, setBiz] = useState(null);
  const [view, setView] = useState("book"); const [form, setForm] = useState(null); const [pd, setPd] = useState(null); const [bf, setBf] = useState(null);
  const [pname, setPname] = useState(""); const [pphone, setPphone] = useState(""); const [ptype, setPtype] = useState("customer"); const [pamt, setPamt] = useState("");
  const [q, setQ] = useState(""); const [ft, setFt] = useState("all"); const [from, setFrom] = useState(""); const [to, setTo] = useState("");
  const [pdoc, setPdoc] = useState(null);

  async function loadBooks() {
    let { data } = await sb.from("books").select("*").order("created_at");
    if (!data || !data.length) { const r = await sb.from("books").insert({ name: "My Shop" }).select(); data = r.data; }
    setBooks(data || []); setCur(c => c || (data && data[0] && data[0].id));
    const b = await sb.from("business").select("*").maybeSingle(); setBiz(b.data);
  }
  async function loadBook(id) {
    const [e, p, x, i, v] = await Promise.all([
      sb.from("entries").select("*").eq("book_id", id).order("entry_date", { ascending: false }).order("created_at", { ascending: false }),
      sb.from("parties").select("*").eq("book_id", id).order("name"),
      sb.from("party_tx").select("*").order("created_at"),
      sb.from("items").select("*").eq("book_id", id).order("name"),
      sb.from("invoices").select("*").eq("book_id", id).order("created_at", { ascending: false })]);
    setEntries(e.data || []); setParties(p.data || []); setPtx(x.data || []); setItems(i.data || []); setInvoices(v.data || []);
  }
  useEffect(() => { loadBooks(); }, []);
  useEffect(() => { if (cur) loadBook(cur); }, [cur]);
  const reload = () => loadBook(cur);

  const saveEntry = async v => { if (form.init) await sb.from("entries").update(v).eq("id", form.init.id); else await sb.from("entries").insert({ ...v, book_id: cur }); setForm(null); reload(); };
  const delEntry = async id => { if (confirm("Delete?")) { await sb.from("entries").delete().eq("id", id); reload(); } };
  const newBook = async () => { const n = prompt("Book name (for example, Shop 2)"); if (n && n.trim()) { const r = await sb.from("books").insert({ name: n.trim() }).select(); await loadBooks(); setCur(r.data[0].id); } };
  const addParty = async () => { if (!pname.trim()) return; await sb.from("parties").insert({ book_id: cur, name: pname.trim(), kind: ptype, phone: pphone.trim() || null }); setPname(""); setPphone(""); setPd(null); reload(); };
  const balOf = p => ptx.filter(x => x.party_id === p.id).reduce((a, x) => a + (x.kind === "due" ? 1 : -1) * Number(x.amount), 0);
  const addTx = async (p, kind) => {
    const a = parseFloat(pamt); if (!(a > 0)) return;
    await sb.from("party_tx").insert({ party_id: p.id, kind, amount: a });
    if (kind === "pay") await sb.from("entries").insert({ book_id: cur, type: p.kind === "customer" ? "in" : "out", amount: a, category: p.kind === "customer" ? "Payment received" : "Stock purchase", mode: "Cash", entry_date: today(), note: p.name });
    setPamt(""); setPd(null); reload();
  };
  const remind = (p, v) => {
    const msg = `Hello ${p.name}, your pending balance with ${(biz && biz.name) || "us"} is ${fmt(Math.abs(v))}. Please pay at your earliest convenience. Thank you.`;
    window.open(`https://wa.me/${(p.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`, "_blank");
  };
  const saveBiz = async () => { const u = await sb.auth.getUser(); await sb.from("business").upsert({ user_id: u.data.user.id, name: bf.name, gstin: bf.gstin, address: bf.address, phone: bf.phone }); setBiz(bf); setBf(null); };
  const dl = (name, text, type) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type })); a.download = name; a.click(); };
  const csv = () => {
    const qq = s => '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';
    const rows = [["Date", "Type", "Category", "Mode", "Amount", "Note"], ...fe.map(e => [e.entry_date, e.type === "in" ? "Cash in" : "Cash out", e.category, e.mode, e.amount, e.note])];
    dl("khata.csv", rows.map(r => r.map(qq).join(",")).join("\n"), "text/csv");
  };
  const backup = () => dl("khata-backup-" + today() + ".json", JSON.stringify({ entries, parties, party_tx: ptx, items, invoices, business: biz }, null, 2), "application/json");
  const doPrint = d => { setPdoc(d); setTimeout(() => window.print(), 150); };

  const fe = entries.filter(e => (!q || (e.category + " " + (e.note || "")).toLowerCase().includes(q.toLowerCase())) && (ft === "all" || e.type === ft) && (!from || e.entry_date >= from) && (!to || e.entry_date <= to));
  const inn = sum(entries, "in"), out = sum(entries, "out");
  const month = today().slice(0, 7), M = entries.filter(e => e.entry_date.startsWith(month));
  const recv = parties.filter(p => p.kind === "customer").reduce((a, p) => a + Math.max(0, balOf(p)), 0);
  const pay = parties.filter(p => p.kind === "supplier").reduce((a, p) => a + Math.max(0, balOf(p)), 0);
  const low = items.filter(i => Number(i.stock) <= Number(i.min_stock)).length;
  const grp = (type, col) => {
    const s = {}; fe.filter(e => e.type === type).forEach(e => { s[e.category] = (s[e.category] || 0) + Number(e.amount); });
    const tot = Object.values(s).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(s).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
      <div className="bar" key={k}><div><span>{t(k)}</span><b>{fmt(v)}</b></div><div className="track"><div className="fill" style={{ width: v / tot * 100 + "%", background: col }} /></div></div>));
  };
  const sel = pd && pd !== "new" ? parties.find(p => p.id === pd) : null;
  const filters = (<>
    <input placeholder={t("Search")} value={q} onChange={e => setQ(e.target.value)} />
    <div className="f3"><select className="f" value={ft} onChange={e => setFt(e.target.value)}><option value="all">{t("All")}</option><option value="in">{t("Cash in")}</option><option value="out">{t("Cash out")}</option></select>
      <input type="date" aria-label={t("From")} value={from} onChange={e => setFrom(e.target.value)} /><input type="date" aria-label={t("To")} value={to} onChange={e => setTo(e.target.value)} /></div></>);

  return (<>
    <div className="noprint">
      <div className="top">
        <select aria-label="Book" value={cur || ""} onChange={e => setCur(e.target.value)}>{books.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select>
        <button className="btn" onClick={newBook}>{t("New book")}</button>
      </div>
      <div className="bal"><small>{t("Balance")}</small><div className="n">{fmt(inn - out)}</div>
        <div className="split"><span>{t("In")} {fmt(inn)}</span><span>{t("Out")} {fmt(out)}</span></div></div>
      <div className="stats"><div className="stat"><small>{t("To receive")}</small><b style={{ color: "var(--in)" }}>{fmt(recv)}</b></div><div className="stat"><small>{t("To pay")}</small><b style={{ color: "var(--out)" }}>{fmt(pay)}</b></div><div className="stat"><small>{t("Low stock")}</small><b>{low}</b></div></div>
      <div className="act"><button className="big bin" onClick={() => setForm({ type: "in" })}>{t("+ Cash in")}</button><button className="big bout" onClick={() => setForm({ type: "out" })}>{t("− Cash out")}</button></div>
      <div className="tabs">{[["book", "Entries"], ["rep", "Report"], ["par", "Parties"], ["inv", "Invoices"], ["itm", "Items"]].map(([k, l]) => <button key={k} className={view === k ? "on" : ""} onClick={() => setView(k)}>{t(l)}</button>)}</div>

      {view === "book" && <div>{filters}{fe.length ? fe.map(e => (
        <div className="row" key={e.id}><div><b>{t(e.category)}</b><span>{e.entry_date} · {t(e.mode)}{e.note ? " · " + e.note : ""}</span></div>
          <div className={"amt " + (e.type === "in" ? "i" : "o")}>{e.type === "in" ? "+" : "−"}{fmt(e.amount)}
            <button className="lk" onClick={() => setForm({ type: e.type, init: e })}>{t("Edit")}</button><button className="lk" onClick={() => delEntry(e.id)}>{t("Delete")}</button></div></div>
      )) : <div className="empty">{t("No entries yet. Tap Cash in or Cash out to add your first one.")}</div>}</div>}

      {view === "rep" && <div>{filters}
        <div className="row"><div><b>{t("Income")}</b></div><div className="amt i">{fmt(sum(fe, "in"))}</div></div>
        <div className="row"><div><b>{t("Expenses")}</b></div><div className="amt o">{fmt(sum(fe, "out"))}</div></div>
        <div className="row"><div><b>{t("Profit")}</b></div><div className="amt">{fmt(sum(fe, "in") - sum(fe, "out"))}</div></div>
        <div className="row"><div><b>{t("This month")}</b><span>{t("In")} {fmt(sum(M, "in"))} · {t("Out")} {fmt(sum(M, "out"))}</span></div><div className="amt">{fmt(sum(M, "in") - sum(M, "out"))}</div></div>
        <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("Where money came from")}</h2>{grp("in", "var(--in)")}
        <h2 style={{ fontSize: "1rem", marginTop: 16 }}>{t("Where money went")}</h2>{grp("out", "var(--out)")}</div>}

      {view === "par" && <div>
        <button className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={() => setPd("new")}>{t("Add party")}</button>
        {parties.length ? parties.map(p => { const v = balOf(p), c = p.kind === "customer"; return (
          <div className="row" key={p.id}><div><b>{p.name}</b><span>{t(c ? "Customer" : "Supplier")}{p.phone ? " · " + p.phone : ""}</span></div>
            <div className={"amt " + (c === (v > 0) ? "i" : "o")}>{v === 0 ? t("Settled") : fmt(Math.abs(v))}
              <span style={{ display: "block" }}>{v === 0 ? "" : v < 0 ? t("Advance") : t(c ? "You’ll get" : "You’ll give")}</span>
              <button className="lk" onClick={() => setPd(p.id)}>{t("Open")}</button></div></div>); })
          : <div className="empty">{t("No parties yet. Add a customer or supplier to track dues.")}</div>}</div>}

      {view === "inv" && <Invoices invoices={invoices} items={items} parties={parties} bookId={cur} t={t} reload={reload} onPrint={v => doPrint({ inv: v })} />}
      {view === "itm" && <Items items={items} bookId={cur} t={t} reload={reload} />}

      <div className="tools"><button className="btn" onClick={csv}>{t("Export CSV")}</button><button className="btn" onClick={() => doPrint(null)}>{t("Download PDF")}</button>
        <button className="btn" onClick={backup}>{t("Backup")}</button><button className="btn" onClick={() => setBf({ name: "", gstin: "", address: "", phone: "", ...(biz || {}) })}>{t("Business details")}</button></div>
    </div>

    <div className="print-only">
      {pdoc && pdoc.inv ? <InvoicePrint inv={pdoc.inv} biz={biz} /> : <>
        <h1>{(biz && biz.name) || "Cashbook"} statement</h1><p>Printed {today()} · Cash in {fmt(sum(fe, "in"))} · Cash out {fmt(sum(fe, "out"))} · Balance {fmt(sum(fe, "in") - sum(fe, "out"))}</p>
        <table><thead><tr><th>Date</th><th>Category</th><th>Mode</th><th>Note</th><th>In</th><th>Out</th></tr></thead>
          <tbody>{[...fe].reverse().map(e => <tr key={e.id}><td>{e.entry_date}</td><td>{e.category}</td><td>{e.mode}</td><td>{e.note}</td><td>{e.type === "in" ? fmt(e.amount) : ""}</td><td>{e.type === "out" ? fmt(e.amount) : ""}</td></tr>)}</tbody></table></>}
    </div>

    {form && <EntryForm type={form.type} init={form.init} t={t} onSave={saveEntry} onClose={() => setForm(null)} />}
    {bf && <Modal onClose={() => setBf(null)}><h2>{t("Business details")}</h2>
      {[["name", "Business name"], ["gstin", "GSTIN"], ["address", "Address"], ["phone", "Phone"]].map(([k, l]) => <label key={k}>{t(l)}<input value={bf[k] || ""} onChange={e => setBf({ ...bf, [k]: k === "gstin" ? e.target.value.toUpperCase() : e.target.value })} /></label>)}
      <button className="save" style={{ background: "var(--acc)", color: "var(--accink)" }} onClick={saveBiz}>{t("Save")}</button>
      <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setBf(null)}>{t("Cancel")}</button></Modal>}
    {pd === "new" && <Modal onClose={() => setPd(null)}><h2>{t("Add party")}</h2>
      <label>{t("Name")}<input maxLength={40} value={pname} onChange={e => setPname(e.target.value)} /></label>
      <label>{t("Phone")}<input type="tel" value={pphone} onChange={e => setPphone(e.target.value)} /></label>
      <label>{t("Type")}<select className="f" value={ptype} onChange={e => setPtype(e.target.value)}><option value="customer">{t("Customer")}</option><option value="supplier">{t("Supplier")}</option></select></label>
      <button className="save" style={{ background: "var(--acc)", color: "var(--accink)" }} onClick={addParty}>{t("Save party")}</button>
      <button className="btn" style={{ width: "100%", marginTop: 8 }} onClick={() => setPd(null)}>{t("Cancel")}</button></Modal>}
    {sel && <Modal onClose={() => setPd(null)}><h2>{sel.name}</h2><div className="note">{t(sel.kind === "customer" ? "Customer" : "Supplier")} · {fmt(Math.abs(balOf(sel)))}</div>
      {ptx.filter(x => x.party_id === sel.id).reverse().map(x => <div className="row" key={x.id}><div><b>{t(x.kind === "due" ? "Dues added" : "Payment")}</b><span>{x.tx_date}</span></div><div className="amt">{fmt(x.amount)}</div></div>)}
      <label>{t("Amount (₹)")}<input type="number" inputMode="decimal" min="0" step="0.01" value={pamt} onChange={e => setPamt(e.target.value)} /></label>
      <div className="act" style={{ marginTop: 14 }}><button className="btn" onClick={() => addTx(sel, "due")}>{t("Add dues")}</button><button className="btn" onClick={() => addTx(sel, "pay")}>{t("Record payment")}</button></div>
      {balOf(sel) > 0 && <button className="btn" style={{ width: "100%", marginBottom: 8 }} onClick={() => remind(sel, balOf(sel))}>{t("Remind on WhatsApp")}</button>}
      <button className="btn" style={{ width: "100%" }} onClick={() => setPd(null)}>{t("Close")}</button></Modal>}
  </>);
}
