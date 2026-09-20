import { Hammer } from "lucide-react";

// The "Customer Individual" sidebar menu is live, but the customer-facing
// onboarding APIs it needs (profile, onboarding session, wizard config) were
// removed from the backend and are being rebuilt against the new onboarding
// configuration — every /customer/indv_* call currently returns 404. Show a
// clear holding page instead of the app's "page not found" until they exist.
export function CustomerIndividualPending() {
  return (
    <div className="pt-1 pb-6">
      <h1 className="text-xl font-black text-slate-800">Customer Individual</h1>
      <div
        className="mt-4 flex flex-col items-center gap-3 rounded-2xl px-6 py-16 text-center"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-light text-primary">
          <Hammer size={22} />
        </span>
        <p className="text-base font-bold text-slate-800">Customer onboarding is being rebuilt</p>
        <p className="max-w-md text-sm text-slate-500">
          This screen will open once the new customer onboarding service, built on the approved onboarding configuration, is available.
        </p>
      </div>
    </div>
  );
}
