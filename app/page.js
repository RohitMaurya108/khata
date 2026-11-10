"use client";
import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { T } from "../lib/i18n";
import Cashbook from "../components/Cashbook";
import Admin from "../components/Admin";

export default function Home() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [lang, setLang] = useState("en");
  const [view, setView] = useState("app");
  const [em, setEm] = useState(""); const [pw, setPw] = useState(""); const [msg, setMsg] = useState("");
  const testOn = process.env.NEXT_PUBLIC_TEST_LOGIN === "true";
  const testAuth = async mode => {
    setMsg("");
    const { error } = mode === "up" ? await sb.auth.signUp({ email: em, password: pw }) : await sb.auth.signInWithPassword({ email: em, password: pw });
    if (error) setMsg(error.message); else if (mode === "up") setMsg("Account created. If you are not signed in automatically, turn off email confirmation in Supabase.");
  };
  const t = T(lang);

  useEffect(() => {
    try { setLang(localStorage.getItem("lang") || "en"); } catch (e) {}
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) { setProfile(undefined); return; }
    sb.from("profiles").select("*").eq("id", session.user.id).single().then(({ data }) => setProfile(data));
  }, [session]);

  const toggleLang = () => { const n = lang === "hi" ? "en" : "hi"; setLang(n); try { localStorage.setItem("lang", n); } catch (e) {} };
  const login = () => sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo: window.location.origin } });
  const today = new Date().toISOString().slice(0, 10);
  const ok = profile && (profile.is_admin || (profile.is_active && (!profile.active_until || profile.active_until >= today)));

  if (session === undefined || (session && profile === undefined)) return <div className="wrap empty">{t("Loading")}…</div>;
  if (!session) return (
    <div className="wrap"><div className="login">
      <h1>{t("Khata")}</h1>
      <p>{t("Your business cashbook. Record cash in and cash out in two taps, then see where your money went.")}</p>
      <button className="btn g" onClick={login}>{t("Continue with Google")}</button>
      {testOn && <div style={{ display: "grid", gap: 8 }}>
        <div className="note">Test login (turn off by removing NEXT_PUBLIC_TEST_LOGIN)</div>
        <input type="email" placeholder="Email" value={em} onChange={e => setEm(e.target.value)} />
        <input type="password" placeholder="Password (6+ characters)" value={pw} onChange={e => setPw(e.target.value)} />
        <div style={{ display: "flex", gap: 8 }}><button className="btn" style={{ flex: 1 }} onClick={() => testAuth("in")}>Sign in</button><button className="btn" style={{ flex: 1 }} onClick={() => testAuth("up")}>Sign up</button></div>
        {msg && <div className="note">{msg}</div>}</div>}
      <button className="btn" onClick={toggleLang}>{lang === "hi" ? "English" : "हिन्दी"}</button>
    </div></div>);
  const out = () => sb.auth.signOut();
  const wa = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;
  return (
    <div className="wrap">
      <div className="hdr noprint"><b>{t("Khata")}</b><div>
        <button className="btn" onClick={toggleLang}>{lang === "hi" ? "English" : "हिन्दी"}</button>
        {profile?.is_admin && <button className="btn" onClick={() => setView(view === "admin" ? "app" : "admin")}>{view === "admin" ? t("Back to book") : t("Admin")}</button>}
        <button className="btn" onClick={out}>{t("Sign out")}</button></div></div>
      {!ok ? (
        <div className="login">
          <h1 style={{ fontSize: "1.8rem" }}>{t("Your account is waiting for access")}</h1>
          <p>{t("Message us on WhatsApp after you pay, and we will switch your account on.")}</p>
          {wa && <a className="btn" style={{ textAlign: "center", textDecoration: "none" }} href={`https://wa.me/${wa}?text=${encodeURIComponent("Please activate Khata for " + session.user.email)}`}>{t("Message on WhatsApp")}</a>}
        </div>
      ) : view === "admin" ? <Admin t={t} /> : <Cashbook t={t} />}
    </div>);
}
