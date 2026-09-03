import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { useAuth } from "@/Hooks/useAuth";
import { notifications } from "@/Utils/Lib/notifications";

export function ChangePasswordPage() {
  const navigate = useNavigate();
  const changePassword = useAuth((state) => state.changePassword);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [visible, setVisible] = useState({ old: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);

  const toggleVisibility = (field) =>
    setVisible((current) => ({ ...current, [field]: !current[field] }));

  const submit = async (event) => {
    event.preventDefault();
    if (!oldPassword || !newPassword || !confirmPassword) {
      notifications.error("All password fields are required");
      return;
    }
    if (newPassword !== confirmPassword) {
      notifications.error("New passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await changePassword(oldPassword, newPassword);
      notifications.success("Password changed successfully");
      navigate("/dashboard");
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Unable to change password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pt-24 px-4 pb-12 bg-[#F9FAFB]">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/90 bg-white/85 p-8 shadow-xl shadow-blue-100/40">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={16} /> Back
        </button>
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
            <Lock size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Change password</h1>
            <p className="text-sm text-slate-500">Update your application password.</p>
          </div>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Old Password
            <div className="relative mt-1.5">
              <input
                type={visible.old ? "text" : "password"}
                value={oldPassword}
                onChange={(event) => setOldPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("old")}
                aria-label={visible.old ? "Hide old password" : "Show old password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {visible.old ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            New Password
            <div className="relative mt-1.5">
              <input
                type={visible.next ? "text" : "password"}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("next")}
                aria-label={visible.next ? "Hide new password" : "Show new password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {visible.next ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Confirm New Password
            <div className="relative mt-1.5">
              <input
                type={visible.confirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 pr-10"
              />
              <button
                type="button"
                onClick={() => toggleVisibility("confirm")}
                aria-label={visible.confirm ? "Hide confirmed password" : "Show confirmed password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {visible.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
        </form>
      </div>
    </div>
  );
}
