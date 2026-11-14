import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { Activity, ArrowRight, Blocks, Globe, Lock, Radio, Shield, Smartphone, UserCog, Zap } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useOpenMenu } from "@/Components/Layout/Menu/menuContext";
import { moduleDashboardPath } from "@/Components/Layout/Menu/menuRouteMap";
import { useWidgetData } from "../layout/dashboardData";
import { sourceLabel } from "./ChartWidgets";
import { WidgetBody, WidgetCard } from "./WidgetCard";
import { LinkButton } from "@/Components/Common/TextButtons";
import { useGoTo } from "@/Components/Layout/Menu/goTo";
import { useSetup } from "@/Hooks/useSetup";
import { SimpleTable } from "@/Components/Common/SimpleTable";

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
        <LinkButton onClick={() => openMenu("onboardingwizard")} className="flex shrink-0 items-center gap-1">
          {t("viewAll")} <ArrowRight size={12} />
        </LinkButton>
      }
    >
      <WidgetBody loading={loading} failed={failed} empty={!items.length}>
        <div>
          <SimpleTable className="min-w-[520px] text-left" columns={[{ label: t("customer"), className: "px-1 pb-2" }, { label: t("customerType"), className: "px-1 pb-2" }, { label: t("source"), className: "px-1 pb-2" }, { label: t("status"), className: "px-1 pb-2" }]}>
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
                        style={staff ? { background: "var(--muted)", color: "var(--muted-foreground)" } : { background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary-ink, var(--primary))" }}
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
          </SimpleTable>
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}

function ChannelPill({ on, icon: Icon, label }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold"
      style={on ? { background: "var(--success-soft)", color: "var(--success-ink, var(--success))" } : { background: "var(--muted)", color: "var(--muted-foreground)" }}
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

// What this user may add, as the server lists it; each opens its menu the
// way the sidebar does. Hidden when there is none (dashboardData.isHidden).
export function QuickActionsWidget() {
  const { t } = useTranslation("dashboard");
  const menus = useSelector((state) => state.menu.menuArray);
  const { data, loading, failed } = useWidgetData("quickActions");
  const active = (menus ?? []).filter((m) => m?.status === 1);
  // Opened through goTo; a locked one shows its lock (Admin_33 B8).
  const goTo = useGoTo();
  const setup = useSetup();
  const pathOf = (a) => active.some((m) => Number(m.menu_id) === Number(a.menu_id) && m.module_name === a.module_name);
  const items = (data?.items ?? []).filter(pathOf);
  return (
    <WidgetCard title={t("quickActions")} icon={Zap}>
      <WidgetBody loading={loading} failed={failed} empty={!items.length}>
        <div className="grid gap-2">
          {items.map((a) => (
            <button
              key={`${a.module_name}:${a.menu_id}`}
              type="button"
              onClick={() => goTo({ menu_id: a.menu_id, module_name: a.module_name })}
              className="flex items-center justify-between gap-2 rounded-xl border px-3 py-2.5 text-left text-xs font-bold transition-colors hover:bg-[var(--primary-light)]"
              style={{ color: "var(--primary-ink, var(--primary))", borderColor: "var(--primary-light)" }}
            >
              <span className="min-w-0">
                {a.menu_label ?? a.menu_name}
                {setup.stateOf(a.menu_id) === "LOCKED" && <Lock size={11} className="ml-1 inline text-muted-foreground" />}
                {a.module_label && <span className="block text-[10px] font-medium text-muted-foreground">{a.module_label}</span>}
              </span>
              <ArrowRight size={13} className="shrink-0" />
            </button>
          ))}
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}

// One row per module the user can open; a module with a dashboard opens it.
export function ModuleSummariesWidget() {
  const { t } = useTranslation("dashboard");
  const navigate = useNavigate();
  const { data, loading, failed } = useWidgetData("moduleSummaries");
  const items = data?.items ?? [];
  return (
    <WidgetCard title={t("byModule")} icon={Blocks}>
      <WidgetBody loading={loading} failed={failed} empty={!items.length}>
        <ul className="grid gap-1.5">
          {items.map((m) => {
            const body = (
              <>
                <span className="min-w-0 truncate font-semibold text-slate-700">{m.module_label ?? m.module_name}</span>
                <span className="flex shrink-0 items-center gap-2 text-[11px] text-muted-foreground">
                  <span className={m.pending_approvals ? "font-bold text-amber-700" : undefined}>{t("waitingN", { count: m.pending_approvals ?? 0 })}</span>
                  <span>
                    {t("changesN", { count: m.changes_this_month ?? 0 })}
                    {m.change_pct != null && ` (${m.change_pct > 0 ? "+" : ""}${m.change_pct}%)`}
                  </span>
                  {m.has_dashboard && <ArrowRight size={12} className="text-primary" />}
                </span>
              </>
            );
            const row = "flex w-full items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-left text-xs";
            return (
              <li key={m.module_name}>
                {m.has_dashboard ? (
                  <button type="button" className={`${row} transition-colors hover:bg-[var(--primary-light)]`} onClick={() => navigate(moduleDashboardPath(m.module_name))}>
                    {body}
                  </button>
                ) : (
                  <div className={row}>{body}</div>
                )}
              </li>
            );
          })}
        </ul>
      </WidgetBody>
    </WidgetCard>
  );
}
