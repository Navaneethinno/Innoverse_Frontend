import { useTranslation } from "react-i18next";
import { Building2, CheckCircle, Clock, FileText, UserCheck, UserPlus } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { useWidgetData } from "../layout/dashboardData";
import { glass } from "./WidgetCard";

function StatCard({ label, value, sub, gradient, icon: Icon, loading }) {
  return (
    <div className="relative flex h-full flex-col justify-between gap-2 overflow-hidden rounded-2xl border p-5" style={glass}>
      <div className="flex items-center justify-between pr-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <span className={cn("absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md", gradient)}>
        <Icon size={15} strokeWidth={2} />
      </span>
      <div>
        {loading ? (
          <span className="block h-9 w-20 animate-pulse rounded-lg bg-muted" />
        ) : (
          <p className="text-4xl font-black leading-none tracking-tight text-slate-800">{value == null ? "—" : Number(value).toLocaleString()}</p>
        )}
        {sub && <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// One small factory per stat so the registry lists them as independent
// widgets. `detail(data, t)` may replace the sub-line with live figures.
const statWidget = (id, subKey, gradient, icon, detail) =>
  function StatWidget() {
    const { t } = useTranslation("dashboard");
    const { data, loading } = useWidgetData(id);
    return <StatCard label={t(id)} sub={(data && detail?.(data, t)) || t(subKey)} value={data?.value} loading={loading} gradient={gradient} icon={icon} />;
  };

export const TotalInstitutionsWidget = statWidget("totalInstitutions", "registeredOnPlatform", "bg-[var(--primary)]", Building2);
export const ActiveInstitutionsWidget = statWidget("activeInstitutions", "fullyOperational", "bg-[var(--success)]", CheckCircle);
export const PendingRequestsWidget = statWidget("pendingRequests", "awaitingAuthorization", "bg-[var(--pending)]", Clock);
export const MyRequestsWidget = statWidget("myRequests", "requestsYouSubmitted", "bg-[var(--warning)]", FileText);
export const ActiveCustomersWidget = statWidget("activeCustomers", "approvedAndActive", "bg-[var(--primary-hover)]", UserCheck, (d, t) =>
  d.by_party ? t("byParty", { customers: d.by_party.customer ?? 0, merchants: d.by_party.merchant ?? 0 }) : null,
);
export const OnboardingInProgressWidget = statWidget("onboardingInProgress", "draftsAndPendingApproval", "bg-[var(--chart-3)]", UserPlus, (d, t) =>
  t("openAndPending", { open: d.open_sessions ?? 0, pending: d.pending_approval ?? 0 }),
);
