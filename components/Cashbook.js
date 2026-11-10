"use client";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Wallet,
  FileText,
  Users,
  Package,
  BarChart3,
  Settings as Cog,
  Shield,
  Plus,
  Minus,
  Search,
  Pencil,
  Trash2,
  Download,
  Languages,
  LogOut,
  MoreHorizontal,
  ArrowDownLeft,
  ArrowUpRight,
  MessageCircle,
} from "lucide-react";
import { sb } from "../lib/supabase";
import { Modal, Field, Pill, MonthChart, fmt, today, sum } from "./ui";
import Items from "./Items";
import Admin from "./Admin";
import Invoices, { InvoicePrint, status } from "./Invoices";

const CATS = {
  in: ["Sales", "Payment received", "Loan", "Other income"],
  out: [
    "Stock purchase",
    "Rent",
    "Salary",
    "Transport",
    "Electricity",
    "Food",
    "Other expense",
  ],
};
const MODES = ["Cash", "UPI", "Bank"];

function EntryForm({ type, init, t, onSave, onClose }) {
  const [a, setA] = useState(init ? String(init.amount) : "");
  const [c, setC] = useState(init ? init.category : CATS[type][0]);
  const [m, setM] = useState(init ? init.mode : "Cash");
  const [d, setD] = useState(init ? init.entry_date : today());
  const [n, setN] = useState(init ? init.note || "" : "");
  const cats = CATS[type].includes(c) ? CATS[type] : [c, ...CATS[type]];
  return (
    <Modal title={t(type === "in" ? "Cash in" : "Cash out")} onClose={onClose}>
      <Field label={t("Amount (₹)")}>
        <input
          style={{ fontSize: "1.5rem", fontWeight: 800 }}
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          autoFocus
          value={a}
          onChange={(e) => setA(e.target.value)}
        />
      </Field>
      <div className="set">
        <Field label={t("Category")}>
          <select value={c} onChange={(e) => setC(e.target.value)}>
            {cats.map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("Paid by")}>
          <select value={m} onChange={(e) => setM(e.target.value)}>
            {MODES.map((x) => (
              <option key={x} value={x}>
                {t(x)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("Date")}>
        <input type="date" value={d} onChange={(e) => setD(e.target.value)} />
      </Field>
      <Field label={t("Note (optional)")}>
        <input
          maxLength={80}
          value={n}
          onChange={(e) => setN(e.target.value)}
        />
      </Field>
      <button
        className={"btn block " + type}
        style={{ marginTop: 18, padding: 13 }}
        onClick={() =>
          parseFloat(a) > 0 &&
          onSave({
            type,
            amount: parseFloat(a),
            category: c,
            mode: m,
            entry_date: d || today(),
            note: n.trim(),
          })
        }
      >
        {t("Save entry")}
      </button>
    </Modal>
  );
}

const Kpi = ({ l, v, c, sub }) => (
  <div className="card kpi">
    <small>{l}</small>
    <div className="v" style={c ? { color: c } : null}>
      {v}
    </div>
    {sub && <div className="sub">{sub}</div>}
  </div>
);

export default function Cashbook({
  t,
  lang,
  toggleLang,
  signOut,
  profile,
  email,
}) {
  const [books, setBooks] = useState([]);
  const [cur, setCur] = useState(null);
  const [entries, setEntries] = useState([]);
  const [parties, setParties] = useState([]);
  const [ptx, setPtx] = useState([]);
  const [items, setItems] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [biz, setBiz] = useState(null);
  const [bz, setBz] = useState(null);
  const [sec, setSec] = useState("dash");
  const [more, setMore] = useState(false);
  const [invNew, setInvNew] = useState(0);
  const [form, setForm] = useState(null);
  const [pd, setPd] = useState(null);
  const [pname, setPname] = useState("");
  const [pphone, setPphone] = useState("");
  const [ptype, setPtype] = useState("customer");
  const [pamt, setPamt] = useState("");
  const [q, setQ] = useState("");
  const [ft, setFt] = useState("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [pdoc, setPdoc] = useState(null);

  async function loadBooks() {
    let { data } = await sb.from("books").select("*").order("created_at");
    if (!data || !data.length) {
      const r = await sb.from("books").insert({ name: "My Shop" }).select();
      data = r.data;
    }
    setBooks(data || []);
    setCur((c) => c || (data && data[0] && data[0].id));
    const b = await sb.from("business").select("*").maybeSingle();
    setBiz(b.data);
  }
  async function loadBook(id) {
    const [e, p, x, i, v] = await Promise.all([
      sb
        .from("entries")
        .select("*")
        .eq("book_id", id)
        .order("entry_date", { ascending: false })
        .order("created_at", { ascending: false }),
      sb.from("parties").select("*").eq("book_id", id).order("name"),
      sb.from("party_tx").select("*").order("created_at"),
      sb.from("items").select("*").eq("book_id", id).order("name"),
      sb
        .from("invoices")
        .select("*")
        .eq("book_id", id)
        .order("created_at", { ascending: false }),
    ]);
    setEntries(e.data || []);
    setParties(p.data || []);
    setPtx(x.data || []);
    setItems(i.data || []);
    setInvoices(v.data || []);
  }
  useEffect(() => {
    loadBooks();
  }, []);
  useEffect(() => {
    if (cur) loadBook(cur);
  }, [cur]);
  useEffect(() => {
    setBz({ name: "", gstin: "", address: "", phone: "", ...(biz || {}) });
  }, [biz]);
  const reload = () => loadBook(cur);

  const saveEntry = async (v) => {
    if (form.init) await sb.from("entries").update(v).eq("id", form.init.id);
    else await sb.from("entries").insert({ ...v, book_id: cur });
    setForm(null);
    reload();
  };
  const delEntry = async (id) => {
    if (confirm("Delete?")) {
      await sb.from("entries").delete().eq("id", id);
      reload();
    }
  };
  const newBook = async () => {
    const n = prompt("Book name (for example, Shop 2)");
    if (n && n.trim()) {
      const r = await sb.from("books").insert({ name: n.trim() }).select();
      await loadBooks();
      setCur(r.data[0].id);
    }
  };
  const addParty = async () => {
    if (!pname.trim()) return;
    await sb
      .from("parties")
      .insert({
        book_id: cur,
        name: pname.trim(),
        kind: ptype,
        phone: pphone.trim() || null,
      });
    setPname("");
    setPphone("");
    setPd(null);
    reload();
  };
  const balOf = (p) =>
    ptx
      .filter((x) => x.party_id === p.id)
      .reduce((a, x) => a + (x.kind === "due" ? 1 : -1) * Number(x.amount), 0);
  const addTx = async (p, kind) => {
    const a = parseFloat(pamt);
    if (!(a > 0)) return;
    await sb.from("party_tx").insert({ party_id: p.id, kind, amount: a });
    if (kind === "pay")
      await sb
        .from("entries")
        .insert({
          book_id: cur,
          type: p.kind === "customer" ? "in" : "out",
          amount: a,
          category:
            p.kind === "customer" ? "Payment received" : "Stock purchase",
          mode: "Cash",
          entry_date: today(),
          note: p.name,
        });
    setPamt("");
    setPd(null);
    reload();
  };
  const remind = (p, v) => {
    const msg = `Hello ${p.name}, your pending balance with ${(biz && biz.name) || "us"} is ${fmt(Math.abs(v))}. Please pay at your earliest convenience. Thank you.`;
    window.open(
      `https://wa.me/${(p.phone || "").replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`,
      "_blank",
    );
  };
  const saveBiz = async () => {
    const u = await sb.auth.getUser();
    await sb
      .from("business")
      .upsert({
        user_id: u.data.user.id,
        name: bz.name,
        gstin: bz.gstin,
        address: bz.address,
        phone: bz.phone,
      });
    setBiz(bz);
    alert("Saved");
  };
  const dl = (name, text, type) => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type }));
    a.download = name;
    a.click();
  };
  const csv = () => {
    const qq = (s) =>
      '"' + String(s == null ? "" : s).replace(/"/g, '""') + '"';
    const rows = [
      ["Date", "Type", "Category", "Mode", "Amount", "Note"],
      ...fe.map((e) => [
        e.entry_date,
        e.type === "in" ? "Cash in" : "Cash out",
        e.category,
        e.mode,
        e.amount,
        e.note,
      ]),
    ];
    dl(
      "khata.csv",
      rows.map((r) => r.map(qq).join(",")).join("\n"),
      "text/csv",
    );
  };
  const backup = () =>
    dl(
      "khata-backup-" + today() + ".json",
      JSON.stringify(
        { entries, parties, party_tx: ptx, items, invoices, business: biz },
        null,
        2,
      ),
      "application/json",
    );
  const doPrint = (d) => {
    setPdoc(d);
    setTimeout(() => window.print(), 150);
  };
  const go = (s) => {
    setSec(s);
    setMore(false);
    window.scrollTo(0, 0);
  };
  const newInv = () => {
    setSec("inv");
    setInvNew((n) => n + 1);
  };

  const fe = entries.filter(
    (e) =>
      (!q ||
        (e.category + " " + (e.note || ""))
          .toLowerCase()
          .includes(q.toLowerCase())) &&
      (ft === "all" || e.type === ft) &&
      (!from || e.entry_date >= from) &&
      (!to || e.entry_date <= to),
  );
  const inn = sum(entries, "in"),
    out = sum(entries, "out");
  const M = entries.filter((e) => e.entry_date.startsWith(today().slice(0, 7)));
  const recv = parties
    .filter((p) => p.kind === "customer")
    .reduce((a, p) => a + Math.max(0, balOf(p)), 0);
  const pay = parties
    .filter((p) => p.kind === "supplier")
    .reduce((a, p) => a + Math.max(0, balOf(p)), 0);
  const lowItems = items.filter((i) => Number(i.stock) <= Number(i.min_stock));
  const sel = pd && pd !== "new" ? parties.find((p) => p.id === pd) : null;
  const grp = (type, col) => {
    const s = {};
    fe.filter((e) => e.type === type).forEach((e) => {
      s[e.category] = (s[e.category] || 0) + Number(e.amount);
    });
    const tot = Object.values(s).reduce((a, b) => a + b, 0) || 1;
    const list = Object.entries(s).sort((a, b) => b[1] - a[1]);
    return list.length ? (
      list.map(([k, v]) => (
        <div className="bar" key={k}>
          <div>
            <span>{t(k)}</span>
            <b>{fmt(v)}</b>
          </div>
          <div className="track">
            <div
              className="fill"
              style={{ width: (v / tot) * 100 + "%", background: col }}
            />
          </div>
        </div>
      ))
    ) : (
      <div className="empty">{t("Nothing to show yet")}</div>
    );
  };

  const TxTable = ({ rows, actions }) =>
    rows.length ? (
      <div className="tw">
        <table className="tbl">
          <thead>
            <tr>
              <th>{t("Date")}</th>
              <th>{t("Category")}</th>
              <th className="hm">{t("Paid by")}</th>
              <th className="hm">{t("Note")}</th>
              <th className="num">{t("Amount")}</th>
              {actions && <th />}
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id}>
                <td>{e.entry_date}</td>
                <td>
                  <span className={"dot " + e.type}>
                    {e.type === "in" ? (
                      <ArrowDownLeft size={14} />
                    ) : (
                      <ArrowUpRight size={14} />
                    )}
                  </span>
                  {t(e.category)}
                </td>
                <td className="hm">{t(e.mode)}</td>
                <td className="hm">{e.note}</td>
                <td className={"num " + (e.type === "in" ? "pos" : "neg")}>
                  {e.type === "in" ? "+" : "−"}
                  {fmt(e.amount)}
                </td>
                {actions && (
                  <td className="num">
                    <button
                      className="ibtn"
                      aria-label="Edit"
                      onClick={() => setForm({ type: e.type, init: e })}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      className="ibtn red"
                      aria-label="Delete"
                      onClick={() => delEntry(e.id)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="empty">
        {t("No entries yet. Tap Cash in or Cash out to add your first one.")}
      </div>
    );

  const quick = (
    <div className="qa">
      <button className="btn in" onClick={() => setForm({ type: "in" })}>
        <Plus size={16} />
        {t("Cash in")}
      </button>
      <button className="btn out" onClick={() => setForm({ type: "out" })}>
        <Minus size={16} />
        {t("Cash out")}
      </button>
      <button className="btn pri" onClick={newInv}>
        <FileText size={16} />
        {t("New invoice")}
      </button>
    </div>
  );
  const filters = (
    <div className="fbar">
      <div style={{ position: "relative" }}>
        <Search
          size={16}
          style={{
            position: "absolute",
            left: 11,
            top: 11,
            color: "var(--mute)",
          }}
        />
        <input
          style={{ paddingLeft: 34 }}
          placeholder={t("Search")}
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <select value={ft} onChange={(e) => setFt(e.target.value)}>
        <option value="all">{t("All")}</option>
        <option value="in">{t("Cash in")}</option>
        <option value="out">{t("Cash out")}</option>
      </select>
      <input
        type="date"
        aria-label={t("From")}
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <input
        type="date"
        aria-label={t("To")}
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
    </div>
  );

  const views = {
    dash: (
      <>
        {quick}
        <div className="kpis">
          <Kpi
            l={t("Total balance")}
            v={fmt(inn - out)}
            sub={`${t("In")} ${fmt(inn)} · ${t("Out")} ${fmt(out)}`}
          />
          <Kpi l={t("To receive")} v={fmt(recv)} c="var(--in)" />
          <Kpi l={t("To pay")} v={fmt(pay)} c="var(--out)" />
          <Kpi
            l={t("Profit") + " · " + t("This month")}
            v={fmt(sum(M, "in") - sum(M, "out"))}
          />
        </div>
        <div className="grid2">
          <div className="card">
            <div className="ch">
              <h3>{t("Cash flow")}</h3>
              <span className="leg">
                <i className="in" />
                {t("In")}
                <i className="out" />
                {t("Out")}
              </span>
            </div>
            <MonthChart entries={entries} />
          </div>
          <div className="card">
            <div className="ch">
              <h3>{t("Low stock")}</h3>
              <Pill c={lowItems.length ? "r" : "g"}>{lowItems.length}</Pill>
            </div>
            {lowItems.length ? (
              lowItems.slice(0, 6).map((i) => (
                <div
                  key={i.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    padding: "8px 0",
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <span>{i.name}</span>
                  <b className="neg">
                    {Number(i.stock)} {i.unit}
                  </b>
                </div>
              ))
            ) : (
              <div className="empty">{t("All stock levels are healthy")}</div>
            )}
          </div>
        </div>
        <div className="grid2 even">
          <div className="card">
            <div className="ch">
              <h3>{t("Recent transactions")}</h3>
              <button className="btn sm" onClick={() => go("cash")}>
                {t("Open")}
              </button>
            </div>
            <TxTable rows={entries.slice(0, 6)} />
          </div>
          <div className="card">
            <div className="ch">
              <h3>{t("Recent invoices")}</h3>
              <button className="btn sm" onClick={() => go("inv")}>
                {t("Open")}
              </button>
            </div>
            {invoices.length ? (
              invoices.slice(0, 6).map((v) => {
                const [c, s] = status(v);
                return (
                  <div
                    key={v.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "9px 0",
                      borderBottom: "1px solid var(--line)",
                    }}
                  >
                    <span>
                      <b>{v.number}</b>
                      <span className="sub2">
                        {v.customer_name || "Walk-in"}
                      </span>
                    </span>
                    <span style={{ textAlign: "right" }}>
                      <b>{fmt(v.total)}</b>
                      <span className="sub2">
                        <Pill c={c}>{t(s)}</Pill>
                      </span>
                    </span>
                  </div>
                );
              })
            ) : (
              <div className="empty">{t("Nothing to show yet")}</div>
            )}
          </div>
        </div>
      </>
    ),
    cash: (
      <>
        {quick}
        <div className="card">
          {filters}
          <TxTable rows={fe} actions />
        </div>
      </>
    ),
    inv: (
      <Invoices
        invoices={invoices}
        items={items}
        parties={parties}
        bookId={cur}
        t={t}
        reload={reload}
        onPrint={(v) => doPrint({ inv: v })}
        openNew={invNew}
      />
    ),
    par: (
      <div className="card">
        <div className="ch">
          <h3>{t("Parties")}</h3>
          <button className="btn pri sm" onClick={() => setPd("new")}>
            <Plus size={16} />
            {t("Add party")}
          </button>
        </div>
        {parties.length ? (
          <div className="tw">
            <table className="tbl">
              <thead>
                <tr>
                  <th>{t("Name")}</th>
                  <th className="hm">{t("Phone")}</th>
                  <th className="num">{t("Balance")}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {parties.map((p) => {
                  const v = balOf(p),
                    c = p.kind === "customer";
                  return (
                    <tr key={p.id}>
                      <td>
                        <b>{p.name}</b>
                        <span className="sub2">
                          {t(c ? "Customer" : "Supplier")}
                        </span>
                      </td>
                      <td className="hm">{p.phone}</td>
                      <td className="num">
                        {v === 0 ? (
                          <Pill c="g">{t("Settled")}</Pill>
                        ) : (
                          <>
                            <b className={c === v > 0 ? "pos" : "neg"}>
                              {fmt(Math.abs(v))}
                            </b>
                            <span className="sub2">
                              {v < 0
                                ? t("Advance")
                                : t(c ? "You’ll get" : "You’ll give")}
                            </span>
                          </>
                        )}
                      </td>
                      <td className="num">
                        <button className="btn sm" onClick={() => setPd(p.id)}>
                          {t("Open")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">
            {t("No parties yet. Add a customer or supplier to track dues.")}
          </div>
        )}
      </div>
    ),
    itm: <Items items={items} bookId={cur} t={t} reload={reload} />,
    rep: (
      <>
        {
          <div className="card" style={{ marginBottom: 14 }}>
            {filters}
            <div className="kpis" style={{ marginBottom: 0 }}>
              <Kpi l={t("Income")} v={fmt(sum(fe, "in"))} c="var(--in)" />
              <Kpi l={t("Expenses")} v={fmt(sum(fe, "out"))} c="var(--out)" />
              <Kpi l={t("Profit")} v={fmt(sum(fe, "in") - sum(fe, "out"))} />
              <div className="qa" style={{ alignItems: "center", margin: 0 }}>
                <button className="btn" onClick={csv}>
                  <Download size={16} />
                  CSV
                </button>
                <button className="btn" onClick={() => doPrint(null)}>
                  <Download size={16} />
                  PDF
                </button>
              </div>
            </div>
          </div>
        }
        <div className="card" style={{ marginBottom: 14 }}>
          <div className="ch">
            <h3>{t("Cash flow")}</h3>
          </div>
          <MonthChart entries={entries} />
        </div>
        <div className="grid2 even">
          <div className="card">
            <div className="ch">
              <h3>{t("Where money came from")}</h3>
            </div>
            {grp("in", "var(--in)")}
          </div>
          <div className="card">
            <div className="ch">
              <h3>{t("Where money went")}</h3>
            </div>
            {grp("out", "var(--out)")}
          </div>
        </div>
      </>
    ),
    set: bz && (
      <div className="grid2 even">
        <div className="card">
          <div className="ch">
            <h3>{t("Business details")}</h3>
          </div>
          <div className="set">
            {[
              ["name", "Business name"],
              ["gstin", "GSTIN"],
              ["phone", "Phone"],
              ["address", "Address"],
            ].map(([k, l]) => (
              <Field key={k} label={t(l)}>
                <input
                  value={bz[k] || ""}
                  onChange={(e) =>
                    setBz({
                      ...bz,
                      [k]:
                        k === "gstin"
                          ? e.target.value.toUpperCase()
                          : e.target.value,
                    })
                  }
                />
              </Field>
            ))}
          </div>
          <button
            className="btn pri"
            style={{ marginTop: 16 }}
            onClick={saveBiz}
          >
            {t("Save")}
          </button>
        </div>
        <div className="card">
          <div className="ch">
            <h3>{t("Data")}</h3>
          </div>
          <div className="qa">
            <button className="btn" onClick={csv}>
              <Download size={16} />
              {t("Export CSV")}
            </button>
            <button className="btn" onClick={backup}>
              <Download size={16} />
              {t("Backup")}
            </button>
          </div>
          <div className="ch" style={{ marginTop: 18 }}>
            <h3>{t("Language")}</h3>
          </div>
          <button className="btn" onClick={toggleLang}>
            <Languages size={16} />
            {lang === "hi" ? "English" : "हिन्दी"}
          </button>
          <div className="note" style={{ marginTop: 18 }}>
            {email}
          </div>
          <button className="btn" style={{ marginTop: 8 }} onClick={signOut}>
            <LogOut size={16} />
            {t("Sign out")}
          </button>
        </div>
      </div>
    ),
    adm: <Admin t={t} />,
  };
  const NAV = [
    ["dash", "Dashboard", LayoutDashboard],
    ["cash", "Cashbook", Wallet],
    ["inv", "Invoices", FileText],
    ["par", "Parties", Users],
    ["itm", "Items", Package],
    ["rep", "Reports", BarChart3],
    ["set", "Settings", Cog],
    ...(profile && profile.is_admin ? [["adm", "Admin", Shield]] : []),
  ];
  const NavBtn = ({ k, l, I }) => (
    <button className={"nav" + (sec === k ? " on" : "")} onClick={() => go(k)}>
      <I size={18} />
      {t(l)}
    </button>
  );

  return (
    <>
      <div className="shell noprint">
        <aside className="side">
          <div className="brand">
            <span className="logo">K</span>
            {t("Khata")}
          </div>
          {NAV.map(([k, l, I]) => (
            <NavBtn key={k} k={k} l={l} I={I} />
          ))}
          <div className="me">
            {email}
            <br />
            <button
              className="btn sm"
              style={{ marginTop: 8 }}
              onClick={signOut}
            >
              <LogOut size={14} />
              {t("Sign out")}
            </button>
          </div>
        </aside>
        <div className="main">
          <header className="topbar">
            <h1>{t(NAV.find((n) => n[0] === sec)[1])}</h1>
            <div className="tr">
              <select
                aria-label="Book"
                value={cur || ""}
                onChange={(e) => setCur(e.target.value)}
              >
                {books.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
              <button
                className="ibtn"
                aria-label={t("New book")}
                title={t("New book")}
                onClick={newBook}
              >
                <Plus size={18} />
              </button>
              <button
                className="ibtn"
                aria-label={t("Language")}
                onClick={toggleLang}
              >
                <Languages size={18} />
              </button>
            </div>
          </header>
          <main className="content">{views[sec]}</main>
        </div>
        <nav className="bnav">
          {NAV.slice(0, 4).map(([k, l, I]) => (
            <button
              key={k}
              className={sec === k ? "on" : ""}
              onClick={() => go(k)}
            >
              <I size={20} />
              {t(l)}
            </button>
          ))}
          <button className={more ? "on" : ""} onClick={() => setMore(true)}>
            <MoreHorizontal size={20} />
            {t("More")}
          </button>
        </nav>
      </div>
      {more && (
        <Modal title={t("More")} onClose={() => setMore(false)}>
          {NAV.slice(4).map(([k, l, I]) => (
            <button key={k} className="nav" onClick={() => go(k)}>
              <I size={18} />
              {t(l)}
            </button>
          ))}
        </Modal>
      )}

      <div className="print-only">
        {pdoc && pdoc.inv ? (
          <InvoicePrint inv={pdoc.inv} biz={biz} />
        ) : (
          <>
            <h1>{(biz && biz.name) || "Cashbook"} statement</h1>
            <p>
              Printed {today()} · Cash in {fmt(sum(fe, "in"))} · Cash out{" "}
              {fmt(sum(fe, "out"))} · Balance{" "}
              {fmt(sum(fe, "in") - sum(fe, "out"))}
            </p>
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Mode</th>
                  <th>Note</th>
                  <th>In</th>
                  <th>Out</th>
                </tr>
              </thead>
              <tbody>
                {[...fe].reverse().map((e) => (
                  <tr key={e.id}>
                    <td>{e.entry_date}</td>
                    <td>{e.category}</td>
                    <td>{e.mode}</td>
                    <td>{e.note}</td>
                    <td>{e.type === "in" ? fmt(e.amount) : ""}</td>
                    <td>{e.type === "out" ? fmt(e.amount) : ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {form && (
        <EntryForm
          type={form.type}
          init={form.init}
          t={t}
          onSave={saveEntry}
          onClose={() => setForm(null)}
        />
      )}
      {pd === "new" && (
        <Modal title={t("Add party")} onClose={() => setPd(null)}>
          <Field label={t("Name")}>
            <input
              maxLength={40}
              value={pname}
              onChange={(e) => setPname(e.target.value)}
            />
          </Field>
          <Field label={t("Phone")}>
            <input
              type="tel"
              value={pphone}
              onChange={(e) => setPphone(e.target.value)}
            />
          </Field>
          <Field label={t("Type")}>
            <select value={ptype} onChange={(e) => setPtype(e.target.value)}>
              <option value="customer">{t("Customer")}</option>
              <option value="supplier">{t("Supplier")}</option>
            </select>
          </Field>
          <button
            className="btn pri block"
            style={{ marginTop: 18 }}
            onClick={addParty}
          >
            {t("Save party")}
          </button>
        </Modal>
      )}
      {sel && (
        <Modal title={sel.name} onClose={() => setPd(null)}>
          <div className="note">
            {t(sel.kind === "customer" ? "Customer" : "Supplier")} ·{" "}
            {fmt(Math.abs(balOf(sel)))}
          </div>
          {ptx
            .filter((x) => x.party_id === sel.id)
            .reverse()
            .map((x) => (
              <div
                key={x.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--line)",
                }}
              >
                <span>
                  {t(x.kind === "due" ? "Dues added" : "Payment")}
                  <span className="sub2">{x.tx_date}</span>
                </span>
                <b>{fmt(x.amount)}</b>
              </div>
            ))}
          <Field label={t("Amount (₹)")}>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={pamt}
              onChange={(e) => setPamt(e.target.value)}
            />
          </Field>
          <div className="set" style={{ marginTop: 14 }}>
            <button className="btn out" onClick={() => addTx(sel, "due")}>
              {t("Add dues")}
            </button>
            <button className="btn in" onClick={() => addTx(sel, "pay")}>
              {t("Record payment")}
            </button>
          </div>
          {balOf(sel) > 0 && (
            <button
              className="btn block"
              style={{ marginTop: 10 }}
              onClick={() => remind(sel, balOf(sel))}
            >
              <MessageCircle size={16} />
              {t("Remind on WhatsApp")}
            </button>
          )}
        </Modal>
      )}
    </>
  );
}
