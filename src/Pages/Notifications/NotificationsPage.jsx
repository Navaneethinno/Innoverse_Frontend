import { useNavigate } from "react-router-dom";
import { ArrowLeft, Bell } from "lucide-react";

// The TopBar's bell button has always linked here (navigate("/notifications")
// in TopBar.jsx), but no route or page ever existed for it — clicking it hit
// RouteError ("Oops! You're lost") regardless of screen size. There is no
// notifications API/endpoint anywhere in API_ENDPOINTS yet, so this is
// deliberately an honest empty state rather than inventing fake notification
// data or a fake backend call. Once a real notifications endpoint exists,
// this is the one place to wire it in.
export function NotificationsPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-[#F9FAFB] px-4 pb-12 pt-24">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-white/90 bg-white/85 p-6 shadow-xl sm:p-8">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
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
            <h1 className="text-lg font-semibold text-slate-800">Notifications</h1>
            <p className="text-sm text-slate-500">Alerts and activity for your account.</p>
          </div>
        </div>
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 px-4 py-14 text-center sm:py-16">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
            <Bell size={20} />
          </div>
          <p className="text-sm font-semibold text-slate-700">No notifications yet</p>
          <p className="max-w-xs text-xs text-slate-500">
            You're all caught up. New notifications will appear here.
          </p>
        </div>
      </div>
    </div>
  );
}
