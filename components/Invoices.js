"use client";
import { useEffect, useState } from "react";
import { Plus, Printer, Trash2, Wallet, X } from "lucide-react";
import { sb } from "../lib/supabase";
import { Modal, Field, Pill, fmt, today } from "./ui";

export const calc = (lines, same) => {
  let sub = 0,
    tax = 0;
  const L = lines.map((l) => {
    const tv = (+l.qty || 0) * (+l.rate || 0),
      tx = (tv * (+l.gst || 0)) / 100;
    sub += tv;
    tax += tx;
    return { ...l, taxable: tv, tax: tx };
  });
  return {
    lines: L,
    sub,
    tax,
    total: sub + tax,
    cgst: same ? tax / 2 : 0,
    sgst: same ? tax / 2 : 0,
    igst: same ? 0 : tax,
  };
};
export const status = (v) => {
  const due = Number(v.total) - Number(v.paid);
  return due <= 0
    ? ["g", "Paid"]
    : Number(v.paid) > 0
      ? ["y", "Partial"]
      : ["r", "Unpaid"];
};

export function InvoicePrint({ inv, biz }) {
  const c = calc(inv.items, inv.same_state),
    due = Number(inv.total) - Number(inv.paid);
  return (
    <div className="ip">
      <div className="hd">
        <div>
          <h1>{(biz && biz.name) || "Your Business"}</h1>
          <div>{biz && biz.address}</div>
          <div>
            {biz && biz.phone}
            {biz && biz.gstin ? " · GSTIN " + biz.gstin : ""}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <h1 style={{ color: "#4F46E5" }}>TAX INVOICE</h1>
          <div>
            <b>{inv.number}</b>
          </div>
          <div>Date: {inv.inv_date}</div>
        </div>
      </div>
      <p>
        <b>Bill to</b>
        <br />
        {inv.customer_name || "Walk-in customer"}
        {inv.customer_gstin ? (
          <>
            <br />
            GSTIN {inv.customer_gstin}
          </>
        ) : null}
      </p>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Item</th>
            <th className="rt">Qty</th>
            <th className="rt">Rate</th>
            <th className="rt">GST %</th>
            <th className="rt">Taxable</th>
            <th className="rt">Tax</th>
            <th className="rt">Amount</th>
          </tr>
        </thead>
        <tbody>
          {c.lines.map((l, i) => (
            <tr key={i}>
              <td>{i + 1}</td>
              <td>{l.name}</td>
              <td className="rt">{l.qty}</td>
              <td className="rt">{fmt(l.rate)}</td>
              <td className="rt">{l.gst}</td>
              <td className="rt">{fmt(l.taxable)}</td>
              <td className="rt">{fmt(l.tax)}</td>
              <td className="rt">{fmt(l.taxable + l.tax)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table style={{ width: "50%", marginLeft: "50%", marginTop: 12 }}>
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td className="rt">{fmt(c.sub)}</td>
          </tr>
          {inv.same_state ? (
            <>
              <tr>
                <td>CGST</td>
                <td className="rt">{fmt(c.cgst)}</td>
              </tr>
              <tr>
                <td>SGST</td>
                <td className="rt">{fmt(c.sgst)}</td>
              </tr>
            </>
          ) : (
            <tr>
              <td>IGST</td>
              <td className="rt">{fmt(c.igst)}</td>
            </tr>
          )}
          <tr>
            <td>
              <b>Total</b>
            </td>
            <td className="rt">
              <b>{fmt(c.total)}</b>
            </td>
          </tr>
          <tr>
            <td>Paid</td>
            <td className="rt">{fmt(inv.paid)}</td>
          </tr>
          <tr>
            <td>
              <b>Balance due</b>
            </td>
            <td className="rt">
              <b>{fmt(due)}</b>
            </td>
          </tr>
        </tbody>
      </table>
      <p
        style={{
          marginTop: 40,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>Thank you for your business.</span>
        <span>Authorised signatory</span>
      </p>
    </div>
  );
}

export default function Invoices({
  invoices,
  items,
  parties,
  bookId,
  t,
  reload,
  onPrint,
  openNew,
}) {
  const [f, setF] = useState(null);
  const [r, setR] = useState(null);
  const ln = () => ({ item_id: "", name: "", qty: 1, rate: "", gst: 0 });
  const blank = () => ({
    cust: "",
    name: "",
    gstin: "",
    same: true,
    date: today(),
    lines: [ln()],
    paid: "",
    mode: "Cash",
  });
  useEffect(() => {
    if (openNew) setF(blank());
  }, [openNew]);
  const setLine = (i, p) =>
    setF((x) => ({
      ...x,
      lines: x.lines.map((l, j) => (j === i ? { ...l, ...p } : l)),
    }));
  const typeItem = (i, v) => {
    const it = items.find((z) => z.name === v);
    setLine(
      i,
      it
        ? { item_id: it.id, name: v, rate: it.price, gst: it.gst }
        : { name: v, item_id: "" },
    );
  };
  const pickParty = (id) => {
    const p = parties.find((z) => z.id === id);
    setF((x) => ({ ...x, cust: id, name: p ? p.name : x.name }));
  };
  const live = f
    ? calc(
        f.lines.filter((l) => l.name && +l.qty > 0),
        f.same,
      )
    : null;

  const save = async () => {
    const c = calc(
      f.lines.filter((l) => l.name && +l.qty > 0),
      f.same,
    );
    if (!c.lines.length) return;
    const nums = invoices.map((i) => +String(i.number).replace(/\D/g, "") || 0);
    const number = "INV-" + String(Math.max(0, ...nums) + 1).padStart(4, "0");
    const paid = Math.min(+f.paid || 0, c.total);
    const { error } = await sb
      .from("invoices")
      .insert({
        book_id: bookId,
        number,
        inv_date: f.date,
        party_id: f.cust || null,
        customer_name: f.name,
        customer_gstin: f.gstin,
        same_state: f.same,
        items: c.lines.map((l) => ({
          item_id: l.item_id,
          name: l.name,
          qty: +l.qty,
          rate: +l.rate,
          gst: +l.gst,
        })),
        subtotal: c.sub,
        tax: c.tax,
        total: c.total,
        paid,
      });
    if (error) {
      alert(error.message);
      return;
    }
    const use = {};
    c.lines.forEach((l) => {
      if (l.item_id) use[l.item_id] = (use[l.item_id] || 0) + +l.qty;
    });
    for (const id of Object.keys(use)) {
      const it = items.find((z) => z.id === id);
      if (it)
        await sb
          .from("items")
          .update({ stock: Number(it.stock) - use[id] })
          .eq("id", id);
    }
    if (paid > 0)
      await sb
        .from("entries")
        .insert({
          book_id: bookId,
          type: "in",
          amount: paid,
          category: "Sales",
          mode: f.mode,
          entry_date: f.date,
          note: number,
        });
    if (f.cust && c.total - paid > 0)
      await sb
        .from("party_tx")
        .insert({ party_id: f.cust, kind: "due", amount: c.total - paid });
    setF(null);
    reload();
  };
  const receive = async () => {
    const inv = r.inv,
      a = Math.min(+r.amt || 0, Number(inv.total) - Number(inv.paid));
    if (!(a > 0)) return;
    await sb
      .from("invoices")
      .update({ paid: Number(inv.paid) + a })
      .eq("id", inv.id);
    await sb
      .from("entries")
      .insert({
        book_id: bookId,
        type: "in",
        amount: a,
        category: "Payment received",
        mode: r.mode,
        entry_date: today(),
        note: inv.number,
      });
    if (inv.party_id)
      await sb
        .from("party_tx")
        .insert({ party_id: inv.party_id, kind: "pay", amount: a });
    setR(null);
    reload();
  };
  const del = async (inv) => {
    if (
      !confirm(
        "Delete " +
          inv.number +
          "? Stock will be restored. Cashbook entries stay.",
      )
    )
      return;
    for (const l of inv.items) {
      if (l.item_id) {
        const it = items.find((z) => z.id === l.item_id);
        if (it)
          await sb
            .from("items")
            .update({ stock: Number(it.stock) + Number(l.qty) })
            .eq("id", l.item_id);
      }
    }
    await sb.from("invoices").delete().eq("id", inv.id);
    reload();
  };
  const modes = (m) =>
    ["Cash", "UPI", "Bank"].map((x) => (
      <option key={x} value={x}>
        {t(x)}
      </option>
    ));

  return (
    <div className="card">
      <div className="ch">
        <h3>{t("Invoices")}</h3>
        <button className="btn pri sm" onClick={() => setF(blank())}>
          <Plus size={16} />
          {t("New invoice")}
        </button>
      </div>
      {invoices.length ? (
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>No.</th>
                <th>{t("Customer")}</th>
                <th className="hm">{t("Date")}</th>
                <th className="num">{t("Total")}</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {invoices.map((v) => {
                const [c, s] = status(v),
                  due = Number(v.total) - Number(v.paid);
                return (
                  <tr key={v.id}>
                    <td>
                      <b>{v.number}</b>
                    </td>
                    <td>{v.customer_name || "Walk-in"}</td>
                    <td className="hm">{v.inv_date}</td>
                    <td className="num">
                      {fmt(v.total)}
                      {due > 0 && (
                        <span className="sub2">
                          {t("Due")} {fmt(due)}
                        </span>
                      )}
                    </td>
                    <td>
                      <Pill c={c}>{t(s)}</Pill>
                    </td>
                    <td className="num">
                      <button
                        className="ibtn"
                        aria-label="Print"
                        onClick={() => onPrint(v)}
                      >
                        <Printer size={16} />
                      </button>
                      {due > 0 && (
                        <button
                          className="ibtn"
                          aria-label={t("Receive payment")}
                          title={t("Receive payment")}
                          onClick={() =>
                            setR({ inv: v, amt: due, mode: "Cash" })
                          }
                        >
                          <Wallet size={16} />
                        </button>
                      )}
                      <button
                        className="ibtn red"
                        aria-label="Delete"
                        onClick={() => del(v)}
                      >
                        <Trash2 size={16} />
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
          No invoices yet. Create your first GST invoice.
        </div>
      )}

      {f && (
        <Modal wide title={t("New invoice")} onClose={() => setF(null)}>
          <div className="ifm">
            <div>
              <div className="set">
                <Field label={t("Customer")}>
                  <select
                    value={f.cust}
                    onChange={(e) => pickParty(e.target.value)}
                  >
                    <option value="">—</option>
                    {parties
                      .filter((p) => p.kind === "customer")
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </select>
                </Field>
                <Field label={t("Customer name")}>
                  <input
                    value={f.name}
                    onChange={(e) => setF({ ...f, name: e.target.value })}
                  />
                </Field>
                <Field label={t("Customer GSTIN")}>
                  <input
                    value={f.gstin}
                    onChange={(e) =>
                      setF({ ...f, gstin: e.target.value.toUpperCase() })
                    }
                  />
                </Field>
                <Field label={t("Date")}>
                  <input
                    type="date"
                    value={f.date}
                    onChange={(e) => setF({ ...f, date: e.target.value })}
                  />
                </Field>
              </div>
              <div className="lh">
                <span>{t("Item")}</span>
                <span>{t("Quantity")}</span>
                <span>{t("Rate")}</span>
                <span>GST %</span>
                <span style={{ textAlign: "right" }}>{t("Amount")}</span>
                <span />
              </div>
              <datalist id="dl-items">
                {items.map((z) => (
                  <option key={z.id} value={z.name} />
                ))}
              </datalist>
              {f.lines.map((l, i) => (
                <div className="ln" key={i}>
                  <input
                    list="dl-items"
                    placeholder={t("Item")}
                    value={l.name}
                    onChange={(e) => typeItem(i, e.target.value)}
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    aria-label={t("Quantity")}
                    placeholder={t("Quantity")}
                    value={l.qty}
                    onChange={(e) => setLine(i, { qty: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    aria-label={t("Rate")}
                    placeholder={t("Rate")}
                    value={l.rate}
                    onChange={(e) => setLine(i, { rate: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="any"
                    aria-label="GST %"
                    placeholder="GST %"
                    value={l.gst}
                    onChange={(e) => setLine(i, { gst: e.target.value })}
                  />
                  <b className="num">
                    {fmt(
                      (+l.qty || 0) *
                        (+l.rate || 0) *
                        (1 + (+l.gst || 0) / 100),
                    )}
                  </b>
                  <button
                    className="ibtn red"
                    aria-label="Remove line"
                    disabled={f.lines.length < 2}
                    onClick={() =>
                      setF({ ...f, lines: f.lines.filter((_, j) => j !== i) })
                    }
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
              <button
                className="btn sm"
                style={{ marginTop: 10 }}
                onClick={() => setF({ ...f, lines: [...f.lines, ln()] })}
              >
                <Plus size={14} />
                {t("Add line")}
              </button>
            </div>
            <div className="sumbox">
              <label
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  marginBottom: 8,
                }}
              >
                <input
                  type="checkbox"
                  checked={f.same}
                  onChange={(e) => setF({ ...f, same: e.target.checked })}
                />
                {t("Same state (CGST + SGST)")}
              </label>
              <div className="sr">
                <span>Subtotal</span>
                <span>{fmt(live.sub)}</span>
              </div>
              {f.same ? (
                <>
                  <div className="sr">
                    <span>CGST</span>
                    <span>{fmt(live.cgst)}</span>
                  </div>
                  <div className="sr">
                    <span>SGST</span>
                    <span>{fmt(live.sgst)}</span>
                  </div>
                </>
              ) : (
                <div className="sr">
                  <span>IGST</span>
                  <span>{fmt(live.igst)}</span>
                </div>
              )}
              <div className="sr t">
                <span>{t("Total")}</span>
                <span>{fmt(live.total)}</span>
              </div>
              <Field label={t("Received now (₹)")}>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={f.paid}
                  onChange={(e) => setF({ ...f, paid: e.target.value })}
                />
              </Field>
              <Field label={t("Paid by")}>
                <select
                  value={f.mode}
                  onChange={(e) => setF({ ...f, mode: e.target.value })}
                >
                  {modes()}
                </select>
              </Field>
              <div className="sr">
                <span>{t("Due")}</span>
                <b>{fmt(Math.max(0, live.total - (+f.paid || 0)))}</b>
              </div>
              <button
                className="btn pri block"
                style={{ marginTop: 10 }}
                onClick={save}
              >
                {t("Save invoice")}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {r && (
        <Modal
          title={t("Receive payment") + " · " + r.inv.number}
          onClose={() => setR(null)}
        >
          <Field label={t("Amount (₹)")}>
            <input
              type="number"
              step="any"
              value={r.amt}
              onChange={(e) => setR({ ...r, amt: e.target.value })}
            />
          </Field>
          <Field label={t("Paid by")}>
            <select
              value={r.mode}
              onChange={(e) => setR({ ...r, mode: e.target.value })}
            >
              {modes()}
            </select>
          </Field>
          <button
            className="btn pri block"
            style={{ marginTop: 18 }}
            onClick={receive}
          >
            {t("Save")}
          </button>
        </Modal>
      )}
    </div>
  );
}
