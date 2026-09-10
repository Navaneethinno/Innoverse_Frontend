import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Fingerprint,
  Lock,
  Mail,
  Moon,
  RefreshCw,
  Sun,
} from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { apiMessage, notifications } from "../../Utils/Lib/notifications";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
import { Logo } from "@/Components/Common/Logo";
import { LanguageDropdown } from "@/Components/Common/LanguageDropdown";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import loginIllustrationLight from "@/assets/login-illustration.png";
import loginIllustrationDark from "@/assets/login-illustration-dark.png";
function GradientMesh() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full opacity-[0.12] blur-3xl"
        style={{ background: "radial-gradient(circle, #7C8CFF, transparent 70%)" }}
      />
      <div
        className="absolute -bottom-32 -right-32 w-[500px] h-[500px] rounded-full opacity-[0.10] blur-3xl"
        style={{ background: "radial-gradient(circle, #7FE0C2, transparent 70%)" }}
      />
    </div>
  );
}
export function LoginPage() {
  const { t } = useTranslation("login");
  const [username, setUsername] = useState(
    import.meta.env.VITE_DEFAULT_LOGIN_USERNAME || "ServiceProvider1",
  );
  const [password, setPassword] = useState(import.meta.env.VITE_DEFAULT_LOGIN_PASSWORD || "");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const login = useAuth((state) => state.login);
  const { mode, toggleMode } = useColorMode();
  const submit = async (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError(t("enterCredentials"));
      return;
    }
    setError("");
    setLoading(true);
    const result = await login({ username, password });
    setLoading(false);
    if (result.success) {
      notifications.success(apiMessage(result, "Signed in successfully"));
      navigate("/dashboard");
    } else {
      const msg = result.message || t("invalidCredentials");
      setError(msg);
      notifications.error(msg);
    }
  };
  return (
    <div
      className="login-theme-transition relative flex min-h-screen overflow-hidden bg-background"
    >
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
        {/* Both illustrations share identical sizing/position — only opacity
            crossfades, so the image geometry never changes between themes. */}
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
          className="relative z-10 w-full max-w-xl"
        >
          <div
            className="rounded-[2rem] border p-7 shadow-[0_32px_90px_rgba(30,64,125,0.24),0_14px_28px_rgba(15,23,42,0.1)] sm:p-10"
            style={{
              background: "color-mix(in srgb, var(--card) 90%, transparent)",
              backdropFilter: "blur(28px)",
              WebkitBackdropFilter: "blur(28px)",
              borderColor: "var(--glass-border)",
            }}
          >
            <div className="mb-8 flex items-center gap-3">
              <Logo size="md" />
              <div>
                <p className="text-sm font-bold tracking-tight text-foreground">Innoverse</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{t("tagline")}</p>
              </div>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{t("welcomeBack")}</h1>
            <p className="mt-1 mb-7 text-sm text-muted-foreground">Sign in to manage your secure workspace.</p>
            <form onSubmit={submit} noValidate className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t("username")}</label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="w-full rounded-xl border border-border bg-background/70 py-3 pl-9 pr-4 text-sm text-foreground caret-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-foreground">{t("password")}</label>
                <div className="relative">
                  <Lock
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-semibold text-primary transition hover:text-primary/80"
                >
                  {t("forgotPassword")}
                </button>
              </div>
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
                disabled={loading}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient py-3.5 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> {t("authenticating")}
                  </>
                ) : (
                  <>
                    <Fingerprint size={14} /> {t("signInSecurely")}
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
