import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshCw } from "lucide-react";

const CHECK_MS = 5 * 60 * 1000;

// The build's entry script, as index.html names it (assets/index-<hash>.js).
const entryOf = (html) => html.match(/assets\/index-[\w-]+\.js/)?.[0] ?? null;

// A tab left open keeps running the build it loaded. Every 5 minutes (and
// when the tab comes back into view) index.html is read again, past every
// cache; when it names another build, a bar offers to reload.
export function NewVersionBar() {
  const { t } = useTranslation("common");
  const [stale, setStale] = useState(false);
  useEffect(() => {
    if (import.meta.env.DEV) return undefined;
    const current = entryOf(document.documentElement.innerHTML);
    if (!current) return undefined;
    const check = () =>
      fetch(`/index.html?v=${Date.now()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.text() : ""))
        .then((html) => {
          const live = entryOf(html);
          if (live && live !== current) setStale(true);
        })
        .catch(() => {});
    const timer = window.setInterval(check, CHECK_MS);
    const onVisible = () => document.visibilityState === "visible" && check();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);
  if (!stale) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-4 z-[11000] mx-auto flex w-fit max-w-[calc(100vw-2rem)] items-center gap-3 rounded-2xl border bg-[var(--card)] px-4 py-2.5 text-sm shadow-2xl">
      <RefreshCw size={16} className="shrink-0 text-primary" />
      <span className="font-semibold">{t("newVersion")}</span>
      <button type="button" onClick={() => window.location.reload()} className="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
        {t("reloadNow")}
      </button>
    </div>
  );
}
