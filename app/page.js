"use client";
import { useEffect, useState } from "react";
import { sb } from "../lib/supabase";
import { T } from "../lib/i18n";
import Cashbook from "../components/Cashbook";

export default function Home() {
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [lang, setLang] = useState("en");
  const [em, setEm] = useState("");
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");
  const testOn = process.env.NEXT_PUBLIC_TEST_LOGIN === "true";
  const t = T(lang);

  useEffect(() => {
    try {
      setLang(localStorage.getItem("lang") || "en");
    } catch (e) {}
    sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!session) {
      setProfile(undefined);
      return;
    }
    sb.from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single()
      .then(({ data }) => setProfile(data));
  }, [session]);

  const toggleLang = () => {
    const n = lang === "hi" ? "en" : "hi";
    setLang(n);
    try {
      localStorage.setItem("lang", n);
    } catch (e) {}
  };
  const login = () =>
    sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
  const testAuth = async (mode) => {
    setMsg("");
    const { error } =
      mode === "up"
        ? await sb.auth.signUp({ email: em, password: pw })
        : await sb.auth.signInWithPassword({ email: em, password: pw });
    if (error) setMsg(error.message);
    else if (mode === "up")
      setMsg(
        "Account created. If you are not signed in automatically, turn off email confirmation in Supabase.",
      );
  };
  const out = () => sb.auth.signOut();
  const today = new Date().toISOString().slice(0, 10);
  const ok =
    profile &&
    (profile.is_admin ||
      (profile.is_active &&
        (!profile.active_until || profile.active_until >= today)));
  const wa = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP;

  if (session === undefined || (session && profile === undefined))
    return (
      <div className="empty" style={{ paddingTop: "30vh" }}>
        {t("Loading")}…
      </div>
    );
  if (!session)
    return (
      <div className="auth">
        <div className="hero">
          <div className="brand" style={{ padding: 0 }}>
            <span
              className="logo"
              style={{ background: "#fff", color: "#4F46E5" }}
            >
              K
            </span>
            Khata
          </div>
          <h1>Billing and accounts, made simple.</h1>
          <p>
            Everything a small business needs in one place, on your phone or
            computer.
          </p>
          <ul>
            <li>GST invoices with CGST, SGST and IGST</li>
            <li>Cash in and cash out in two taps</li>
            <li>Stock, customers and supplier ledgers</li>
            <li>Reports, PDF and WhatsApp reminders</li>
          </ul>
        </div>
        <div className="fcard">
          <h2>{t("Khata")}</h2>
          <p className="note" style={{ margin: 0 }}>
            {t(
              "Your business cashbook. Record cash in and cash out in two taps, then see where your money went.",
            )}
          </p>
          <button
            className="btn pri block"
            style={{ padding: 12 }}
            onClick={login}
          >
            {t("Continue with Google")}
          </button>
          {testOn && (
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              <div className="note">
                Test login (remove NEXT_PUBLIC_TEST_LOGIN to hide)
              </div>
              <input
                type="email"
                placeholder="Email"
                value={em}
                onChange={(e) => setEm(e.target.value)}
              />
              <input
                type="password"
                placeholder="Password (6+ characters)"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
              />
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => testAuth("in")}
                >
                  Sign in
                </button>
                <button
                  className="btn"
                  style={{ flex: 1 }}
                  onClick={() => testAuth("up")}
                >
                  Sign up
                </button>
              </div>
              {msg && <div className="note">{msg}</div>}
            </div>
          )}
          <button className="btn" onClick={toggleLang}>
            {lang === "hi" ? "English" : "हिन्दी"}
          </button>
        </div>
      </div>
    );
  if (!ok)
    return (
      <div className="auth" style={{ gridTemplateColumns: "1fr" }}>
        <div className="fcard">
          <h2>{t("Your account is waiting for access")}</h2>
          <p className="note" style={{ margin: 0 }}>
            {t(
              "Message us on WhatsApp after you pay, and we will switch your account on.",
            )}
          </p>
          {wa && (
            <a
              className="btn pri"
              style={{ textDecoration: "none" }}
              href={`https://wa.me/${wa}?text=${encodeURIComponent("Please activate Khata for " + session.user.email)}`}
            >
              {t("Message on WhatsApp")}
            </a>
          )}
          <button className="btn" onClick={out}>
            {t("Sign out")}
          </button>
        </div>
      </div>
    );
  return (
    <Cashbook
      t={t}
      lang={lang}
      toggleLang={toggleLang}
      signOut={out}
      profile={profile}
      email={session.user.email}
    />
  );
}
