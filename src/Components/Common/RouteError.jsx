import { Link, useRouteError } from "react-router-dom";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { useTranslation } from "react-i18next";

export function RouteError() {
  const { t } = useTranslation("common");
  const error = useRouteError();
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
      <DotLottieReact
        className="h-64 w-64 mix-blend-multiply dark:mix-blend-screen"
        src="/assets/animations/404-warning-green.lottie"
        loop
        autoplay
        aria-label="Page not found"
      />
      <h1 className="text-3xl font-bold tracking-tight text-foreground">{t("lostTitle")}</h1>
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        {t("pageNotFound")}
      </p>
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
export default RouteError;
