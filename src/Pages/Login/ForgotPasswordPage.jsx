import { useEffect, useState } from "react";
import { ArrowLeft, Building2, Eye, EyeOff, KeyRound, LockKeyhole, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { forgotPasswordRequest, resetPasswordRequest } from "@/Services/Auth/auth.service";
import { notifications } from "@/Utils/Lib/notifications";

const fieldClass =
  "w-full rounded-xl border border-border bg-background/70 py-3 pl-9 pr-4 text-sm text-foreground caret-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10";

// Codes after which the reset token is gone: the user asks for a new code.
const RESTART = new Set(["login.reset_expired", "login.reset_too_many"]);

function Field({ icon: Icon, label, children }) {
  return (
    <label className="block text-left text-xs font-semibold text-slate-700">
      {label}
      <div className="relative mt-1.5">
        <Icon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        {children}
      </div>
    </label>
  );
}

// Reset a forgotten password before sign-in: ask for a code (emailed to the
// user), then enter it with the new password. The first reply never says
// whether the user exists.
export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const { t } = useTranslation("forgotPassword");
  const [institutionCode, setInstitutionCode] = useState(state?.institutionCode ?? "");
  const [username, setUsername] = useState(state?.username ?? "");
  // { reset_token, expires_in, code_length, until } once a code was asked.
  const [reset, setReset] = useState(null);
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!reset) return undefined;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [reset]);
  const secondsLeft = reset ? Math.max(0, Math.ceil((reset.until - now) / 1000)) : 0;
  const codeLength = Number(reset?.code_length) || 6;

  const askCode = async (event) => {
    event?.preventDefault();
    if (!institutionCode.trim() || !username.trim()) {
      setError(t("enterUser"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await forgotPasswordRequest(institutionCode.trim(), username);
      setReset({ ...r, until: Date.now() + (Number(r.expires_in) || 300) * 1000 });
      setNow(Date.now());
      setCode("");
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const submit = async (event) => {
    event.preventDefault();
    if (code.length !== codeLength || !password) {
      setError(t("enterCodeAndPassword", { count: codeLength }));
      return;
    }
    if (password !== confirm) {
      setError(t("passwordsDontMatch"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const r = await resetPasswordRequest(institutionCode.trim(), username, reset.reset_token, code, password);
      notifications.success(r?.message || t("resetDone"));
      navigate("/login", { replace: true });
    } catch (e) {
      if (RESTART.has(e.code)) {
        setReset(null);
        setCode("");
        setError(`${e.message} ${t("askAgain")}`);
      } else {
        if (e.code === "login.reset_code_wrong") setCode("");
        setError(e.message);
      }
    } finally {
      setBusy(false);
    }
  };

  const toggle = (
    <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? t("hidePassword") : t("showPassword")} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-primary">
      {show ? <EyeOff size={14} /> : <Eye size={14} />}
    </button>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/90 bg-white/85 p-8 text-center shadow-xl" style={{ boxShadow: "0 20px 25px -5px var(--primary-light)" }}>
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
          <LockKeyhole size={22} />
        </div>
        <h1 className="text-lg font-semibold text-slate-800">{t("title")}</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">{reset ? t("codeSent") : t("intro")}</p>

        {!reset ? (
          <form onSubmit={askCode} className="mt-6 space-y-4">
            <Field icon={Building2} label={t("institutionCode")}>
              <input value={institutionCode} onChange={(e) => setInstitutionCode(e.target.value.toUpperCase())} autoComplete="organization" className={`${fieldClass} uppercase`} />
            </Field>
            <Field icon={User} label={t("username")}>
              <input value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))} autoComplete="username" className={fieldClass} />
            </Field>
            {error ? <p className="text-left text-xs text-red-600">{error}</p> : null}
            <button type="submit" disabled={busy} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
              {busy ? t("sending") : t("sendCode")}
            </button>
          </form>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field icon={KeyRound} label={t("code")}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, codeLength))}
                inputMode="numeric"
                autoComplete="one-time-code"
                className={`${fieldClass} text-center font-mono text-lg tracking-[0.5em]`}
              />
            </Field>
            <p className="-mt-2 text-left text-[11px] text-muted-foreground">{secondsLeft > 0 ? t("expiresIn", { time: `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}` }) : t("codeExpired")}</p>
            <Field icon={LockKeyhole} label={t("newPassword")}>
              <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" className={`${fieldClass} pr-10`} />
              {toggle}
            </Field>
            <Field icon={LockKeyhole} label={t("confirmPassword")}>
              <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={`${fieldClass} pr-10`} />
            </Field>
            {error ? <p className="text-left text-xs text-red-600">{error}</p> : null}
            <button type="submit" disabled={busy || secondsLeft === 0} className="w-full rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60">
              {busy ? t("saving") : t("setPassword")}
            </button>
            <button type="button" disabled={busy} onClick={() => void askCode()} className="text-xs font-semibold text-primary transition hover:text-primary/80 disabled:opacity-60">
              {t("resendCode")}
            </button>
          </form>
        )}

        <button type="button" onClick={() => navigate("/login")} className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--primary)] hover:text-[var(--primary-hover)]">
          <ArrowLeft size={15} /> {t("backToSignIn")}
        </button>
      </div>
    </div>
  );
}
