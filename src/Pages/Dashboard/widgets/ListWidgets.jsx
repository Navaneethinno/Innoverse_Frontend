import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Activity, ArrowRight, Globe, Radio, Shield, Smartphone, UserCog, Zap } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useOpenMenu } from "@/Pages/Sidebar/menuContext";
import { useWidgetData } from "../layout/dashboardData";
import { sourceLabel } from "./ChartWidgets";
import { WidgetBody, WidgetCard } from "./WidgetCard";

export function RequestBreakdownWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading, failed } = useWidgetData("requestBreakdown");
  const items = data?.items ?? [];
  const max = Math.max(...items.map((r) => r.count ?? 0), 1);
  return (
    <WidgetCard title={t("requestBreakdown")} icon={Shield} action={data ? <span className="text-xs font-bold text-muted-foreground">{t("totalN", { count: data.total ?? 0 })}</span> : null}>
      <WidgetBody loading={loading} failed={failed} empty={!items.length} emptyText={t("nothingWaiting")}>
        <div className="grid gap-3">
          {items.map((r) => (
            <div key={r.group}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">{r.name ?? r.group}</span>
                <span className="font-bold text-slate-700">{r.count}</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-[var(--primary-light)]">
                <div className="h-full rounded-full bg-[var(--primary)]" style={{ width: `${((r.count ?? 0) / max) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}

const SOURCE_ICON = { ADMIN: UserCog, PORTAL_WEB: Globe, PORTAL_APP: Smartphone, PORTAL: Globe };

export function RecentOnboardingWidget() {
  const { t } = useTranslation("dashboard");
  const openMenu = useOpenMenu();
  const { data, loading, failed } = useWidgetData("recentOnboarding");
  const items = data?.items ?? [];
  return (
    <WidgetCard
      title={t("recentOnboarding")}
      icon={Activity}
      action={
        <button type="button" onClick={() => openMenu("onboardingwizard")} className="flex shrink-0 items-center gap-1 text-xs font-bold text-primary hover:underline">
          {t("viewAll")} <ArrowRight size={12} />
        </button>
      }
    >
      <WidgetBody loading={loading} failed={failed} empty={!items.length}>
        <div>
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
              {items.map((row) => {
                const Icon = SOURCE_ICON[row.source] ?? Globe;
                const staff = row.source === "ADMIN";
                return (
                  <tr key={row.reference_id} className="border-t border-border">
                    <td className="px-1 py-2.5">
                      <div className="font-semibold text-slate-700">{row.name || t("noNameYet")}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {t(row.party === "MERCHANT" ? "merchant" : "customerParty")} · {t(row.ownership === "CORPORATE" ? "corporate" : "individual")}
                      </div>
                    </td>
                    <td className="px-1 py-2.5 text-muted-foreground">{row.customer_type || "-"}</td>
                    <td className="px-1 py-2.5">
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={staff ? { background: "var(--muted)", color: "var(--muted-foreground)" } : { background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                      >
                        <Icon size={10} />
                        {sourceLabel(t, row.source)}
                      </span>
                    </td>
                    <td className="px-1 py-2.5">
                      <StatusBadge status={row.status_name ?? String(row.status ?? "-")} variant="subtle" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </WidgetBody>
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
  const { data, loading, failed } = useWidgetData("portalChannels");
  const items = data?.items ?? [];
  return (
    <WidgetCard title={t("portalChannels")} icon={Radio}>
      <p className="-mt-2 mb-3 text-[11px] text-muted-foreground">{t("portalChannelsHint")}</p>
      <WidgetBody loading={loading} failed={failed} empty={!items.length}>
        <ul className="grid gap-2">
          {items.map((c) => {
            const channels = new Set((c.channels ?? []).map((x) => String(x).toUpperCase()));
            return (
              <li key={c.institution_id ?? c.code} className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2">
                <span className="truncate text-xs font-semibold text-slate-700">{c.name ?? c.code}</span>
                <span className="flex shrink-0 gap-1">
                  <ChannelPill on={channels.has("WEB")} icon={Globe} label="WEB" />
                  <ChannelPill on={channels.has("APP")} icon={Smartphone} label="APP" />
                </span>
              </li>
            );
          })}
        </ul>
      </WidgetBody>
    </WidgetCard>
  );
}

// Shortcuts to the screens admins open most, opened through their menus
// (the sidebar's routing), so they follow the user's modules.
const QUICK_ACTIONS = [
  { key: "newInstitution", path: "/institutions/create" },
  { key: "startOnboarding", slug: "onboardingwizard" },
  { key: "configureCustomerTypes", slug: "onboardingconfiguration" },
  { key: "manageKycSchemes", slug: "kycschemes" },
];

export function QuickActionsWidget() {
  const { t } = useTranslation("dashboard");
  const openMenu = useOpenMenu();
  const navigate = useNavigate();
  return (
    <WidgetCard title={t("quickActions")} icon={Zap}>
      <div className="grid gap-2">
        {QUICK_ACTIONS.map((a) => (
          <button
            key={a.key}
            type="button"
            onClick={() => (a.path ? navigate(a.path) : openMenu(a.slug))}
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
