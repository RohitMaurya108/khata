"use client";
import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { Pill } from "./ui";
export default function Admin({ t }) {
  const [rows, setRows] = useState([]);
  const load = () =>
    sb
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .then(({ data }) => setRows(data || []));
  useEffect(() => {
    load();
  }, []);
  const set = async (u, on) => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    await sb
      .from("profiles")
      .update({
        is_active: on,
        active_until: on ? d.toISOString().slice(0, 10) : null,
      })
      .eq("id", u.id);
    load();
  };
  return (
    <div className="card">
      <div className="ch">
        <h3>{t("Admin")}</h3>
      </div>
      <div className="tw">
        <table className="tbl">
          <thead>
            <tr>
              <th>Email</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id}>
                <td>{u.email}</td>
                <td>
                  {u.is_active ? (
                    <Pill c="g">
                      {t("Active until")} {u.active_until || "—"}
                    </Pill>
                  ) : (
                    <Pill c="y">{t("Waiting for access")}</Pill>
                  )}
                </td>
                <td className="num">
                  <button
                    className="btn sm"
                    onClick={() => set(u, !u.is_active)}
                  >
                    {u.is_active ? t("Switch off") : t("Activate for 1 year")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
