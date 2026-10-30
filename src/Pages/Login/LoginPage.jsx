import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  ArrowLeft,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Mail,
  Moon,
  RefreshCw,
  Sun,
  Building2,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { apiMessage, notifications } from "../../Utils/Lib/notifications";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { useBrandTheme } from "@/Hooks/Providers/BrandThemeProvider";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import loginIllustrationLight from "@/assets/login-illustration.png";
import loginIllustrationDark from "@/assets/login-illustration-dark.png";
import { SIGNIN_NOTICE_KEY } from "@/Services/api/authFetch";
function GradientMesh() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      {/* A slow, independent breathing loop on each blob — the ambient
          "still alive" idle motion the entrance choreography hands off to
          once its own one-shot animations finish, without competing for
          attention with the login form itself. */}
      <motion.div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, #7C8CFF, transparent 70%)" }}
        animate={{ scale: [1, 1.08, 1], opacity: [0.12, 0.18, 0.12] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.10] blur-3xl"
        style={{ background: "radial-gradient(circle, #7FE0C2, transparent 70%)" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.16, 0.1] }}
        transition={{ duration: 11, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
      />
    </div>
  );
}

// Card content reveals top-to-bottom in one coordinated stagger (logo row,
// heading, subtext, then the form) rather than everything appearing at
// once — mirrors the "background, then branding, then form" phased
// choreography without needing separate illustration layers to animate.
const cardStagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } },
};
const cardItem = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};
// The institution code used to be remembered here; it no longer is, and
// what earlier versions kept is cleared at sign-in.
const INSTITUTION_CODE_KEY = "innoverse-admin:institution-code";

export function LoginPage() {
  const { t } = useTranslation("login");
  const [institutionCode, setInstitutionCode] = useState("");
  // Always empty: nothing (the build's settings, the last sign-in or the
  // browser) fills in the institution code, username or password. The boxes
  // stay read-only, which browsers
  // don't fill, until the user puts the cursor in them.
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [typing, setTyping] = useState({});
  const unlock = (key) => () => !typing[key] && setTyping((t) => ({ ...t, [key]: true }));
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  // Why the session ended, when it was refused for its location: shown once.
  const [error, setError] = useState(() => {
    try {
      const notice = window.sessionStorage.getItem(SIGNIN_NOTICE_KEY) ?? "";
      window.sessionStorage.removeItem(SIGNIN_NOTICE_KEY);
      return notice;
    } catch {
      return "";
    }
  });
  const navigate = useNavigate();
  const login = useAuth((state) => state.login);
  const { mode, toggleMode } = useColorMode();
  // The institution's own login background, once it has signed in here
  // before with the code now typed.
  const brandBackground = useBrandTheme().loginAssetsFor(institutionCode)?.loginBackground;
  // A sign-in code asked after the password: { mfa_token, sent_to,
  // code_length, expiresAt (ms) }. Null on the sign-in form.
  const [challenge, setChallenge] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  // Over the rate limit (429): sign-in stays off until this time (ms).
  const [waitUntil, setWaitUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const ticking = Boolean(challenge) || waitUntil > now;
  useEffect(() => {
    if (!ticking) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [ticking]);
  const codeLength = challenge?.code_length || 6;
  const secondsLeft = challenge ? Math.max(0, Math.ceil((challenge.expiresAt - now) / 1000)) : 0;
  const waitSeconds = Math.max(0, Math.ceil((waitUntil - now) / 1000));
  const backToForm = () => {
    setChallenge(null);
    setMfaCode("");
  };
  // Step 1 (also "Send a new code": the same call without a code), or step 2
  // with { mfa_token, mfa_code }. The password is sealed afresh each time.
  const signIn = async (code) => {
    setError("");
    setLoading(true);
    const result = await login({
      institutionCode: institutionCode.trim(),
      username,
      password,
      code,
    });
    setLoading(false);
    if (result.mfa) {
      setChallenge({
        ...result.mfa,
        expiresAt: Date.now() + (result.mfa.expires_in || 300) * 1000,
      });
      setMfaCode("");
      setNow(Date.now());
      notifications.success(apiMessage(result, t("codeSent")));
      return;
    }
    if (result.success) {
      try {
        window.localStorage.removeItem(INSTITUTION_CODE_KEY);
      } catch {
        /* Storage may be unavailable. */
      }
      notifications.success(apiMessage(result, "Signed in successfully"));
      navigate("/dashboard");
      return;
    }
    // Branch on error_code, never on the message. The gateway's rate limit
    // keeps sign-in off for Retry-After seconds (no header: message only).
    if (result.errorCode === "generic.too_many_requests" && result.retryAfter) setWaitUntil(Date.now() + result.retryAfter * 1000);
    // A wrong code clears the box and stays; an expired or used code, too
    // many wrong codes, or no email on the account start over. Any other
    // refusal just shows its message.
    if (result.errorCode === "login.mfa_code_wrong") setMfaCode("");
    else if (["login.mfa_expired", "login.mfa_too_many", "login.mfa_no_email"].includes(result.errorCode)) backToForm();
    const msg = result.message || t("invalidCredentials");
    setError(msg);
    notifications.error(msg);
  };
  const submit = async (e) => {
    e.preventDefault();
    if (challenge) {
      if (mfaCode.length !== codeLength) {
        setError(t("enterCode", { length: codeLength }));
        return;
      }
      await signIn({ mfa_token: challenge.mfa_token, mfa_code: mfaCode });
      return;
    }
    if (!institutionCode.trim() || !username || !password) {
      setError(t("enterCredentials"));
      return;
    }
    await signIn();
  };
  return (
    <div className="login-theme-transition relative flex min-h-screen overflow-hidden bg-background">
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
        <LanguageDropdown />
        <UiTooltip label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}>
          <button
            type="button"
            onClick={toggleMode}
            aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="p-2.5 rounded-xl text-muted-foreground hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              border: "1px solid var(--glass-border)",
            }}
          >
            {mode === "dark" ? (
              <Sun size={16} strokeWidth={1.8} />
            ) : (
              <Moon size={16} strokeWidth={1.8} />
            )}
          </button>
        </UiTooltip>
      </div>
      <div
        className="absolute inset-0 z-0 overflow-hidden"
        style={{ background: mode === "dark" ? "#0b1220" : "#eef2fb" }}
      >
        {/* Entrance: the illustration settles in first (a beat before the
            branding/form card), then keeps a very slow ambient "breathing"
            scale loop going — the idle life the strategy's globe-rotation/
            floating-shield loops give a fully layered scene, adapted to a
            single flat illustration instead of separate animatable layers. */}
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0, scale: 1.04 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        >
          <motion.div
            className="absolute inset-0"
            animate={{ scale: [1, 1.015, 1] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 0.9 }}
          >
            {/* Both illustrations share identical sizing/position — only
                opacity crossfades, so the image geometry never changes
                between themes. */}
            <img
              src={loginIllustrationLight}
              alt="Innoverse — Innovate. Secure. Empower."
              aria-hidden={mode === "dark"}
              className="login-illustration absolute inset-0 h-full w-full object-cover object-right"
              style={{ opacity: mode === "dark" ? 0 : 1 }}
            />
            <img
              src={loginIllustrationDark}
              alt="Innoverse — Innovate. Secure. Empower."
              aria-hidden={mode !== "dark"}
              className="login-illustration absolute inset-0 h-full w-full object-cover object-right"
              style={{ opacity: mode === "dark" ? 1 : 0 }}
            />
            {brandBackground && (
              <img
                src={brandBackground}
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-cover"
              />
            )}
          </motion.div>
        </motion.div>
        <div
          className="absolute inset-0"
          style={{
            background:
              mode === "dark"
                ? "linear-gradient(90deg, rgba(11,18,32,0.96) 0%, rgba(11,18,32,0.7) 34%, rgba(11,18,32,0.08) 70%)"
                : "linear-gradient(90deg, rgba(238,242,251,0.98) 0%, rgba(238,242,251,0.76) 32%, rgba(238,242,251,0.04) 72%)",
          }}
        />
      </div>
      <div className="relative z-10 flex min-h-screen w-full items-center justify-start overflow-hidden px-5 py-24 sm:px-12 lg:w-[52%] lg:px-[6vw] lg:py-12">
        <GradientMesh />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative z-10 w-full max-w-xl"
        >
          <motion.div
            variants={cardStagger}
            initial="hidden"
            animate="visible"
            className="rounded-[2rem] border p-7 shadow-[0_32px_90px_rgba(30,64,125,0.24),0_14px_28px_rgba(15,23,42,0.1)] sm:p-10"
            style={{
              background: "color-mix(in srgb, var(--card) 90%, transparent)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              borderColor: "var(--glass-border)",
            }}
          >
            <motion.div variants={cardItem} className="mb-8 text-center">
              <p className="text-2xl font-black tracking-tight text-foreground">InnoVerse</p>
              <p className="mt-1 text-xs text-muted-foreground">{t("tagline")}</p>
            </motion.div>
            <motion.h1
              variants={cardItem}
              className="text-2xl font-bold tracking-tight text-foreground"
            >
              {t("welcomeBack")}
            </motion.h1>
            <motion.p variants={cardItem} className="mt-1 mb-7 text-sm text-muted-foreground">
              Sign in to manage your secure workspace.
            </motion.p>
            <motion.form variants={cardItem} onSubmit={submit} noValidate className="space-y-4">
              {challenge ? (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-foreground">
                    {t("codeLabel", { length: codeLength, sentTo: challenge.sent_to })}
                  </label>
                  <div className="relative">
                    <KeyRound
                      size={14}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                    />
                    <input
                      value={mfaCode}
                      onChange={(e) =>
                        setMfaCode(e.target.value.replace(/\D/g, "").slice(0, codeLength))
                      }
                      name="signin-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      autoFocus
                      className="w-full rounded-xl border border-border bg-background/70 py-3 pl-9 pr-4 text-center font-mono text-lg tracking-[0.5em] text-foreground caret-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-xs">
                    <span
                      className={
                        secondsLeft ? "text-muted-foreground" : "font-semibold text-red-600"
                      }
                    >
                      {secondsLeft
                        ? t("codeExpiresIn", {
                            time: `${Math.floor(secondsLeft / 60)}:${String(secondsLeft % 60).padStart(2, "0")}`,
                          })
                        : t("codeExpired")}
                    </span>
                    <button
                      type="button"
                      disabled={loading || waitSeconds > 0}
                      onClick={() => void signIn()}
                      className="font-semibold text-primary transition hover:text-primary/80 disabled:opacity-50"
                    >
                      {t("sendNewCode")}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={backToForm}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground transition hover:text-primary"
                  >
                    <ArrowLeft size={12} /> {t("backToSignIn")}
                  </button>
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("institutionCode")}
                    </label>
                    <div className="relative">
                      <Building2
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                      <input
                        value={institutionCode}
                        onChange={(e) => setInstitutionCode(e.target.value)}
                        readOnly={!typing.institution}
                        onFocus={unlock("institution")}
                        name="signin-org"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        autoCapitalize="characters"
                        spellCheck={false}
                        className="w-full rounded-xl border border-border bg-background/70 py-3 pl-9 pr-4 text-sm uppercase text-foreground caret-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("username")}
                    </label>
                    <div className="relative">
                      <Mail
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                      <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                        readOnly={!typing.username}
                        onFocus={unlock("username")}
                        name="signin-user"
                        autoComplete="off"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        className="w-full rounded-xl border border-border bg-background/70 py-3 pl-9 pr-4 text-sm text-foreground caret-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-foreground">
                      {t("password")}
                    </label>
                    <div className="relative">
                      <Lock
                        size={14}
                        className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
                      />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        readOnly={!typing.password}
                        onFocus={unlock("password")}
                        name="signin-secret"
                        autoComplete="new-password"
                        data-lpignore="true"
                        data-1p-ignore="true"
                        className="w-full rounded-xl border border-border bg-background/70 py-3 pl-9 pr-10 text-sm text-foreground caret-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((visible) => !visible)}
                        aria-label={showPassword ? t("hidePassword") : t("showPassword")}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground transition hover:text-primary"
                      >
                        {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                  <div className="text-right -mt-1">
                    <button
                      type="button"
                      onClick={() => navigate("/forgot-password", { state: { institutionCode: institutionCode.trim(), username } })}
                      className="text-xs font-semibold text-primary transition hover:text-primary/80"
                    >
                      {t("forgotPassword")}
                    </button>
                  </div>
                </>
              )}
              <AnimatePresence>
                {error ? (
                  <motion.p className="flex items-center gap-1.5 text-xs text-red-600">
                    <AlertCircle size={12} />
                    {error}
                  </motion.p>
                ) : null}
              </AnimatePresence>
              <button
                type="submit"
                disabled={loading || waitSeconds > 0}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> {t("authenticating")}
                  </>
                ) : waitSeconds > 0 ? (
                  t("tryAgainIn", { seconds: waitSeconds })
                ) : challenge ? (
                  <>
                    <KeyRound size={14} /> {t("verifyCode")}
                  </>
                ) : (
                  <>
                    <Fingerprint size={14} /> {t("signInSecurely")}
                  </>
                )}
              </button>
            </motion.form>
          </motion.div>
          <p className="mt-6 text-center text-xs text-muted-foreground">
            © 2026 Innovitegra Solutions Private Limited
          </p>
        </motion.div>
      </div>
    </div>
  );
}
