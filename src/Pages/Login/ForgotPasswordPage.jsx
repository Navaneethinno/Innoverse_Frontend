import { ArrowLeft, LockKeyhole } from "lucide-react";
import { useNavigate } from "react-router-dom";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] px-4">
      <div className="w-full max-w-sm rounded-3xl border border-white/90 bg-white/85 p-8 text-center shadow-xl shadow-blue-100/40">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-100 text-blue-600">
          <LockKeyhole size={22} />
        </div>
        <h1 className="text-lg font-semibold text-slate-800">Forgot Password?</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Password recovery is not connected yet. Please contact your administrator for assistance.
        </p>
        <button
          type="button"
          onClick={() => navigate("/login")}
          className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft size={15} /> Back to sign in
        </button>
      </div>
    </div>
  );
}
