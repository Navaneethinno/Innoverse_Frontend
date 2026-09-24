import { useTranslation } from "react-i18next";
import { Building2, CheckCircle, Clock, FileText, UserCheck, UserPlus } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
import { STATS } from "./dummyData";
import { glass } from "./WidgetCard";

function StatCard({ label, value, sub, gradient, icon: Icon }) {
  return (
    <div className="relative flex h-full flex-col gap-4 overflow-hidden rounded-2xl border p-5" style={glass}>
      <div className="flex items-center justify-between pr-10">
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      </div>
      <span className={cn("absolute right-5 top-5 flex h-8 w-8 items-center justify-center rounded-xl text-white shadow-md", gradient)}>
        <Icon size={15} strokeWidth={2} />
      </span>
      <div>
        <p className="text-4xl font-black leading-none tracking-tight text-slate-800">{value.toLocaleString()}</p>
        {sub && <p className="mt-1.5 text-[11px] font-medium text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

// One small factory per stat so the registry can list them as independent
// widgets (each draggable on its own) without six near-identical files.
const statWidget = (labelKey, subKey, valueKey, gradient, icon) =>
  function StatWidget() {
    const { t } = useTranslation("dashboard");
    return <StatCard label={t(labelKey)} sub={t(subKey)} value={STATS[valueKey]} gradient={gradient} icon={icon} />;
  };

export const TotalInstitutionsWidget = statWidget("totalInstitutions", "registeredOnPlatform", "totalInstitutions", "bg-[var(--primary)]", Building2);
export const ActiveInstitutionsWidget = statWidget("activeInstitutions", "fullyOperational", "activeInstitutions", "bg-[var(--success)]", CheckCircle);
export const PendingRequestsWidget = statWidget("pendingRequests", "awaitingAuthorization", "pendingRequests", "bg-[var(--pending)]", Clock);
export const MyRequestsWidget = statWidget("myRequests", "requestsYouSubmitted", "myRequests", "bg-[var(--warning)]", FileText);
export const ActiveCustomersWidget = statWidget("activeCustomers", "approvedAndActive", "activeCustomers", "bg-[var(--primary-hover)]", UserCheck);
export const OnboardingInProgressWidget = statWidget("onboardingInProgress", "draftsAndPendingApproval", "onboardingInProgress", "bg-[var(--chart-3)]", UserPlus);
