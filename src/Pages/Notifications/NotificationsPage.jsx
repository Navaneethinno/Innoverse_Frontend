import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

// The TopBar's bell button has always linked here (navigate("/notifications")
// in TopBar.jsx), but no route or page ever existed for it — clicking it hit
// RouteError ("Oops! You're lost") regardless of screen size. There is no
// notifications API/endpoint anywhere in API_ENDPOINTS yet, so this is
// deliberately an honest empty state rather than inventing fake notification
// data or a fake backend call. Once a real notifications endpoint exists,
// this is the one place to wire it in.
export function NotificationsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 pb-12 pt-24">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-white/90 bg-white/85 p-6 shadow-xl sm:p-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="mb-6 flex items-center gap-3">
          <div
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
            style={{ background: "var(--primary-light)", color: "var(--primary)" }}
          >
            <Bell size={18} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-slate-800">{t("layout:notifications")}</h1>
            <p className="text-sm text-muted-foreground">{t("layout:alertsAndActivityForYourAccount")}</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-4 py-14 text-center sm:py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-muted-foreground">
            <Bell size={20} />
          </div>
          <p className="text-sm font-semibold text-slate-700">{t("layout:noNotificationsYet")}</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            {t("layout:youReAllCaughtUpNewNotifications")}
          </p>
        </div>
      </div>
    </div>
  );
}
