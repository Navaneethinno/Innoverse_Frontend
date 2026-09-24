import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ArrowRight, Globe, Radio, Shield, Smartphone, Zap } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { CHANNELS, RECENT_ONBOARDING, REQUEST_BREAKDOWN } from "./dummyData";
import { WidgetCard } from "./WidgetCard";

export function RequestBreakdownWidget() {
  const { t } = useTranslation("dashboard");
  const max = Math.max(...REQUEST_BREAKDOWN.map((r) => r.value), 1);
  return (
    <WidgetCard title={t("requestBreakdown")} icon={Shield}>
      <div className="grid gap-3">
        {REQUEST_BREAKDOWN.map((r) => (
          <div key={r.key}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">{t(r.key)}</span>
              <span className="font-bold text-slate-700">{r.value}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[var(--primary-light)]">
              <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${(r.value / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
    </WidgetCard>
  );
}

export function RecentOnboardingWidget() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  return (
    <WidgetCard
      title={t("recentOnboarding")}
      icon={Activity}
      action={
        <button type="button" onClick={() => navigate("/onboardingwizard")} className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline">
          {t("viewAll")} <ArrowRight size={12} />
        </button>
      }
    >
      <div className="-mx-1 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-1 pb-2">{t("customer")}</th>
              <th className="px-1 pb-2">{t("customerType")}</th>
              <th className="px-1 pb-2">{t("source")}</th>
              <th className="px-1 pb-2">{t("status")}</th>
            </tr>
          </thead>
          <tbody>
            {RECENT_ONBOARDING.map((row) => (
              <tr key={row.id} className="border-t border-border">
                <td className="px-1 py-2.5">
                  <div className="font-semibold text-slate-700">{row.name}</div>
                  <div className="font-mono text-[10px] text-muted-foreground">
                    {row.id} · {t(row.type)}
                  </div>
                </td>
                <td className="px-1 py-2.5 text-muted-foreground">{row.customerType}</td>
                <td className="px-1 py-2.5">
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                    style={
                      row.source === "portal"
                        ? { background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }
                        : { background: "var(--muted)", color: "var(--muted-foreground)" }
                    }
                  >
                    {row.source === "portal" && <Globe size={10} />}
                    {t(row.source === "portal" ? "customerPortal" : "adminPanel")}
                  </span>
                </td>
                <td className="px-1 py-2.5">
                  <StatusBadge status={row.status} variant="subtle" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </WidgetCard>
  );
}

function ChannelPill({ on, icon: Icon, label }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={on ? { background: "var(--success-soft)", color: "var(--success)" } : { background: "var(--muted)", color: "var(--muted-foreground)" }}
    >
      <Icon size={10} /> {label}
    </span>
  );
}

export function PortalChannelsWidget() {
  const { t } = useTranslation("dashboard");
  return (
    <WidgetCard title={t("portalChannels")} icon={Radio}>
      <p className="-mt-2 mb-3 text-[11px] text-muted-foreground">{t("portalChannelsHint")}</p>
      <ul className="grid gap-2">
        {CHANNELS.map((c) => (
          <li key={c.institution} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
            <span className="truncate text-xs font-semibold text-slate-700">{c.institution}</span>
            <span className="flex shrink-0 gap-1">
              <ChannelPill on={c.web} icon={Globe} label="WEB" />
              <ChannelPill on={c.app} icon={Smartphone} label="APP" />
            </span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

// Shortcuts to the screens admins open most. Paths are the confirmed menu
// slugs (see Router/*Routes.jsx).
const QUICK_ACTIONS = [
  { key: "newInstitution", path: "/institutions/create" },
  { key: "startOnboarding", path: "/onboardingwizard" },
  { key: "configureCustomerTypes", path: "/onboardingconfiguration" },
  { key: "manageKycSchemes", path: "/kycschemes" },
];

export function QuickActionsWidget() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  return (
    <WidgetCard title={t("quickActions")} icon={Zap}>
      <div className="grid gap-2">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => navigate(a.path)}
            className="flex items-center justify-between rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors hover:bg-[var(--primary-light)]"
            style={{ color: "var(--primary)", borderColor: "var(--primary-light)" }}
          >
            {t(a.key)}
            <ArrowRight size={13} />
          </button>
        ))}
      </div>
    </WidgetCard>
  );
}
