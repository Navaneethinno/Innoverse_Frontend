import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./CompactPulseToast.css";
import { PROBLEM_BULLET } from "@/Services/api/apiErrors";
import { useTranslation } from "react-i18next";

// getApiErrorMessage packs a refusal as "headline\n• problem\n• problem"
// (message + data[0].problems) — split it back into a headline and a list.
function splitMessage(message) {
  const [headline, ...rest] = String(message ?? "").split("\n");
  const problems = rest.map((line) => (line.startsWith(PROBLEM_BULLET) ? line.slice(PROBLEM_BULLET.length) : line)).filter((line) => line.trim());
  return { headline, problems };
}

/**
 * Compact Pulse Badge toast system.
 *
 * Usage:
 *   1. Wrap your app once:
 *        <ToastProvider>
 *          <App />
 *        </ToastProvider>
 *
 *   2. Fire it from anywhere:
 *        const toast = useToast();
 *        toast.show("Login successful");
 *        toast.show("Save failed", { variant: "error" });
 *
 * It renders via a portal straight onto document.body with a very high
 * z-index, so it stays visible above modals/popups instead of being
 * trapped behind them or pushed down by page layout.
 */

const ToastContext = createContext(null);

let idCounter = 0;

// notifications.jsx (this app's existing app-wide toast helper) calls
// notifications.success(...)/error(...) as a plain function from
// anywhere — API service files, hooks, deep utility modules — not just
// from inside a React component where useToast() could be called. This
// module-level handle mirrors the one active ToastProvider's `show` so
// that plain-function call pattern keeps working unchanged after
// switching notifications.jsx over to this toast system.
let activeShow = null;

export function showPulseToast(message, options) {
  if (!activeShow) {
    // No <ToastProvider> mounted yet (e.g. called before the app tree is
    // up) — fail quietly rather than throwing, same as a toast call that
    // simply has nothing to render into.
    console.warn("showPulseToast called before ToastProvider mounted:", message);
    return;
  }
  activeShow(message, options);
}

export function ToastProvider({ children }) {
  const { t } = useTranslation("common");
  const [toast, setToast] = useState(null); // single active toast, matches the "compact" intent
  const timerRef = useRef(null);

  const show = useCallback((message, options = {}) => {
    const { variant = "success" } = options;
    // A problem list needs time to read: +2.5s per reason, capped at 20s.
    const problemCount = splitMessage(message).problems.length;
    const duration = options.duration ?? Math.min(4000 + problemCount * 2500, 20000);

    clearTimeout(timerRef.current);
    const id = ++idCounter;

    // Set to null first so re-triggering the same message still replays
    // the entrance animation (React key change forces remount).
    setToast(null);
    requestAnimationFrame(() => {
      setToast({ id, message, variant });
      timerRef.current = setTimeout(() => setToast(null), duration);
    });
  }, []);

  const dismiss = useCallback(() => {
    clearTimeout(timerRef.current);
    setToast(null);
  }, []);

  useEffect(() => {
    activeShow = show;
    return () => {
      if (activeShow === show) activeShow = null;
    };
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {createPortal(
        <div className="cpt-layer" aria-live="polite">
          {toast && (
            <div key={toast.id} className={`cpt-toast cpt-show cpt-${toast.variant}`}>
              <span className="cpt-ring">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  {toast.variant === "error" ? (
                    <path d="M18 6 6 18M6 6l12 12" />
                  ) : (
                    <polyline points="20 6 9 17 4 12" />
                  )}
                </svg>
              </span>
              <ToastBody message={toast.message} />
              <button type="button" className="cpt-close" onClick={dismiss} aria-label={t("dismiss")}>
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

function ToastBody({ message }) {
  const { headline, problems } = splitMessage(message);
  if (!problems.length) return <span className="cpt-text">{headline}</span>;
  return (
    <span className="cpt-text cpt-text-list">
      <span className="cpt-headline">{headline}</span>
      <ul className="cpt-problems">
        {problems.map((problem, index) => (
          <li key={index}>{problem}</li>
        ))}
      </ul>
    </span>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
