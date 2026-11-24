import { Link, useRouteError } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

export function RouteError() {
  const tr = useConfigLabel();
  const { t } = useTranslation("common");
  const error = useRouteError();
  const isDev = import.meta.env.DEV;
  // Previously only logged in DEV, so a genuine production error (as
  // opposed to an actual unmatched route) was invisible — this screen looks
  // identical either way, and there was no way to tell them apart from a
  // bug report alone. Always log so the real cause is at least in the
  // console if this is ever seen again.
  if (error) {
    console.error("RouteError boundary caught:", error);
  }
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 text-center">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-24 h-[28rem] w-[28rem] rounded-full bg-teal-200/30 blur-3xl dark:bg-teal-900/20" />
      <div className="relative flex w-full max-w-xl flex-col items-center gap-3 rounded-[2rem] border border-white/70 bg-card/60 px-8 py-10 shadow-xl backdrop-blur-xl dark:border-white/10">
      {/* A lost compass over "404": plain SVG and CSS (no animation player). */}
      <svg viewBox="0 0 200 150" className="mh-float h-48 w-64" role="img" aria-label={tr("Page not found")}>
        <text x="100" y="112" textAnchor="middle" fontSize="92" fontWeight="900" fill="var(--primary)" opacity="0.16">404</text>
        <circle cx="100" cy="66" r="34" fill="var(--card)" stroke="var(--primary)" strokeWidth="4" />
        <g className="la-needle" style={{ transformOrigin: "100px 66px" }}>
          <path d="M100 40 L108 66 L100 92 L92 66 Z" fill="var(--primary)" />
          <path d="M100 66 L108 66 L100 92 L92 66 Z" fill="var(--border)" />
        </g>
        <circle cx="100" cy="66" r="4" fill="var(--card)" stroke="var(--primary)" strokeWidth="2" />
      </svg>
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("lostTitle")}</h1>
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        {t("pageNotFound")}
      </p>
      {isDev && error && (
        <pre className="mb-2 max-h-32 w-full overflow-auto rounded-xl border border-red-200 bg-red-50 p-3 text-left text-[11px] font-semibold text-red-700">
          {error?.stack ?? error?.message ?? (typeof error === "string" ? error : JSON.stringify(error))}
        </pre>
      )}
      <Link
        to="/dashboard"
        className="rounded-xl bg-brand-gradient px-5 py-2.5 font-semibold text-white shadow-lg transition-transform hover:-translate-y-0.5 hover:shadow-xl"
      >
        {t("backToHome")}
      </Link>
      </div>
    </div>
  );
}
