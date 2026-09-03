import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  Shield,
  Sun,
} from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { notifications } from "../../Utils/Lib/notifications";
import { useColorMode } from "@/Hooks/Providers/ColorModeProvider";
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
      setError("Please enter your username and password");
      return;
    }
    setError("");
    setLoading(true);
    const ok = await login({ username, password });
    setLoading(false);
    if (ok) {
      notifications.success("Signed in successfully");
      navigate("/dashboard");
    } else {
      const msg = "Invalid credentials. Please try again.";
      setError(msg);
      notifications.error(msg);
    }
  };
  return (
    <div
      className="login-theme-transition min-h-screen flex relative"
      style={{ background: "var(--background)" }}
    >
      <button
        type="button"
        onClick={toggleMode}
        title={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        className="absolute top-4 right-4 z-20 p-2.5 rounded-xl text-muted-foreground hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
      <div
        className="hidden lg:block lg:w-[70%] relative overflow-hidden"
        style={{ background: mode === "dark" ? "#0b1220" : "#eef2fb" }}
      >
        {/* Both illustrations share identical sizing/position — only opacity
            crossfades, so the image geometry never changes between themes. */}
        <img
          src={loginIllustrationLight}
          alt="Innoverse — Innovate. Secure. Empower."
          aria-hidden={mode === "dark"}
          className="login-illustration absolute inset-0 w-full h-full object-cover object-left-bottom"
          style={{ opacity: mode === "dark" ? 0 : 1 }}
        />
        <img
          src={loginIllustrationDark}
          alt="Innoverse — Innovate. Secure. Empower."
          aria-hidden={mode !== "dark"}
          className="login-illustration absolute inset-0 w-full h-full object-cover object-left-bottom"
          style={{ opacity: mode === "dark" ? 1 : 0 }}
        />
      </div>
      <div className="relative w-full lg:w-[30%] flex items-center justify-center overflow-hidden">
        <GradientMesh />
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative w-full max-w-sm mx-4 z-10"
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-[18px] bg-gradient-to-br from-blue-400 via-blue-500 to-blue-600 shadow-xl shadow-blue-300/40 mb-4">
              <Shield size={26} className="text-white" />
            </div>
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Innoverse</h1>
            <p className="text-sm text-slate-500 mt-1">Fintech Administration Platform</p>
          </div>
          <div
            className="rounded-3xl border p-8"
            style={{
              background: "var(--glass-bg)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              borderColor: "var(--glass-border)",
              boxShadow: "0 20px 60px rgba(124,140,255,0.12), 0 4px 16px rgba(0,0,0,0.04)",
            }}
          >
            <h2 className="text-base font-semibold text-slate-800 mb-6">Welcome back</h2>
            <form onSubmit={submit} noValidate className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                <div className="relative">
                  <Mail
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    autoComplete="username"
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
                  />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl text-sm text-slate-800 bg-slate-50 border border-slate-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div className="text-right -mt-1">
                <button
                  type="button"
                  onClick={() => navigate("/forgot-password")}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  Forgot Password?
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
                className="w-full flex items-center justify-center gap-2 py-3 mt-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-blue-500 to-blue-600"
              >
                {loading ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Authenticating…
                  </>
                ) : (
                  <>
                    <Fingerprint size={14} /> Sign in securely
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
