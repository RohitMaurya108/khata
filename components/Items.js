"use client";
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { sb } from "../lib/supabase";
import { Modal, Field, Pill, fmt } from "./ui";

const blank = {
  name: "",
  hsn: "",
  unit: "pcs",
  price: "",
  gst: "0",
  stock: "0",
  min_stock: "0",
};
export default function Items({ items, bookId, t, reload }) {
  const [f, setF] = useState(null);
  const save = async () => {
    if (!f.name.trim()) return;
    const v = {
      name: f.name.trim(),
      hsn: f.hsn,
      unit: f.unit || "pcs",
      price: +f.price || 0,
      gst: +f.gst || 0,
      stock: +f.stock || 0,
      min_stock: +f.min_stock || 0,
    };
    if (f.id) await sb.from("items").update(v).eq("id", f.id);
    else await sb.from("items").insert({ ...v, book_id: bookId });
    setF(null);
    reload();
  };
  const del = async (id) => {
    if (confirm("Delete?")) {
      await sb.from("items").delete().eq("id", id);
      reload();
    }
  };
  const inp = (k, l, type = "text") => (
    <Field label={t(l)}>
      <input
        type={type}
        step="any"
        value={f[k]}
        onChange={(e) => setF({ ...f, [k]: e.target.value })}
      />
    </Field>
  );
  return (
    <div className="card">
      <div className="ch">
        <h3>{t("Items")}</h3>
        <button className="btn pri sm" onClick={() => setF(blank)}>
          <Plus size={16} />
          {t("Add item")}
        </button>
      </div>
      {items.length ? (
        <div className="tw">
          <table className="tbl">
            <thead>
              <tr>
                <th>{t("Name")}</th>
                <th className="num">{t("Price")}</th>
                <th className="num hm">GST</th>
                <th className="num">{t("Stock")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((i) => {
                const low = Number(i.stock) <= Number(i.min_stock);
                return (
                  <tr key={i.id}>
                    <td>
                      <b>{i.name}</b>
                      {i.hsn && <span className="sub2">HSN {i.hsn}</span>}
                    </td>
                    <td className="num">{fmt(i.price)}</td>
                    <td className="num hm">{i.gst}%</td>
                    <td className="num">
                      {Number(i.stock)} {i.unit}{" "}
                      {low && <Pill c="r">{t("Low stock")}</Pill>}
                    </td>
                    <td className="num">
                      <button
                        className="ibtn"
                        aria-label="Edit"
                        onClick={() => setF({ ...i })}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        className="ibtn red"
                        aria-label="Delete"
                        onClick={() => del(i.id)}
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
          No items yet. Add what you sell to track stock and bill faster.
        </div>
      )}
      {f && (
        <Modal title={t(f.id ? "Edit" : "Add item")} onClose={() => setF(null)}>
          {inp("name", "Name")}
          <div className="set">
            {inp("hsn", "HSN code")}
            {inp("unit", "Unit")}
            {inp("price", "Price", "number")}
            {inp("gst", "GST %", "number")}
            {inp("stock", "Stock", "number")}
            {inp("min_stock", "Min stock", "number")}
          </div>
          <button
            className="btn pri block"
            style={{ marginTop: 18 }}
            onClick={save}
          >
            {t("Save")}
          </button>
        </Modal>
      )}
    </div>
  );
}
