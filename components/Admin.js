"use client";
import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
export default function Admin({ t }) {
  const [rows, setRows] = useState([]);
  const load = () => sb.from("profiles").select("*").order("created_at", { ascending: false }).then(({ data }) => setRows(data || []));
  useEffect(() => { load(); }, []);
  const set = async (u, on) => {
    const d = new Date(); d.setFullYear(d.getFullYear() + 1);
    await sb.from("profiles").update({ is_active: on, active_until: on ? d.toISOString().slice(0, 10) : null }).eq("id", u.id);
    load();
  };
  return (<div>{rows.map(u => (
    <div className="row" key={u.id}>
      <div><b>{u.email}</b><span>{u.is_active ? `${t("Active until")} ${u.active_until || "—"}` : t("Waiting for access")}</span></div>
      <div className="amt"><button className="lk" style={{ fontSize: ".9rem", color: "var(--ink)", fontWeight: 600 }} onClick={() => set(u, !u.is_active)}>{u.is_active ? t("Switch off") : t("Activate for 1 year")}</button></div>
    </div>))}</div>);
}
