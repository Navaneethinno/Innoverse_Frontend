import { useTranslation } from "react-i18next";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, PieChart as PieIcon, TrendingUp } from "lucide-react";
import { useWidgetData } from "../layout/dashboardData";
import { WidgetBody, WidgetCard } from "./WidgetCard";

// Chart colours come from the theme's --chart-* tokens (SVG accepts CSS
// variables), so light/dark mode and tenant branding apply automatically.
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
};
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

// "2026-09" -> "Sep" (in the UI language).
const monthLabel = (month, lang) => {
  const [y, m] = String(month).split("-").map(Number);
  if (!y || !m) return month;
  return new Date(y, m - 1, 1).toLocaleString(lang, { month: "short" });
};

export function OnboardingTrendWidget() {
  const { t, i18n } = useTranslation("dashboard");
  const { data, loading, failed } = useWidgetData("onboardingTrend");
  const rows = (data?.months ?? []).map((m) => ({ ...m, label: monthLabel(m.month, i18n.language) }));
  return (
    <WidgetCard title={t("onboardingTrend")} icon={TrendingUp} action={data ? <span className="text-xs font-bold text-muted-foreground">{t("totalN", { count: data.total ?? 0 })}</span> : null}>
      <WidgetBody loading={loading} failed={failed} empty={!rows.length}>
        <div className="h-56 min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="dashIndividual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="dashCorporate" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="individual" name={t("individual")} stroke="var(--chart-1)" strokeWidth={2} fill="url(#dashIndividual)" />
              <Area type="monotone" dataKey="corporate" name={t("corporate")} stroke="var(--chart-2)" strokeWidth={2} fill="url(#dashCorporate)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-3 flex gap-4 text-[11px] font-semibold text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-1)]" />{t("individual")}</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[var(--chart-2)]" />{t("corporate")}</span>
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}

// One colour per source, kept stable whatever order the server sends.
const SOURCE_COLORS = { ADMIN: "var(--chart-1)", PORTAL_WEB: "var(--chart-2)", PORTAL_APP: "var(--chart-3)", PORTAL: "var(--chart-4, var(--muted-foreground))" };
const SOURCE_KEYS = { ADMIN: "adminPanel", PORTAL_WEB: "portalWeb", PORTAL_APP: "portalApp", PORTAL: "portalUnrecorded" };
export const sourceLabel = (t, source, fallback) => (SOURCE_KEYS[source] ? t(SOURCE_KEYS[source]) : (fallback ?? source));

export function CustomerSourcesWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading, failed } = useWidgetData("customerSources");
  // PORTAL (channel not recorded) is only listed when there are some.
  const items = (data?.items ?? []).filter((s) => s.source !== "PORTAL" || s.count > 0).map((s) => ({ ...s, label: sourceLabel(t, s.source, s.name) }));
  const total = data?.total ?? items.reduce((sum, s) => sum + (s.count ?? 0), 0);
  const drawn = items.filter((s) => s.count > 0);
  return (
    <WidgetCard title={t("customerSources")} icon={PieIcon}>
      <WidgetBody loading={loading} failed={failed} empty={!items.length}>
        <div className="relative h-44">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={drawn.length ? drawn : [{ source: "none", count: 1 }]} dataKey="count" nameKey="label" innerRadius="62%" outerRadius="90%" paddingAngle={drawn.length > 1 ? 3 : 0} stroke="none">
                {(drawn.length ? drawn : [{ source: "none" }]).map((s) => (
                  <Cell key={s.source} fill={SOURCE_COLORS[s.source] ?? "var(--muted)"} />
                ))}
              </Pie>
              {drawn.length > 0 && <Tooltip contentStyle={tooltipStyle} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-slate-800">{Number(total).toLocaleString()}</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("customers")}</span>
          </div>
        </div>
        <ul className="mt-3 grid gap-1.5">
          {items.map((s) => (
            <li key={s.source} className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
                <span className="h-2 w-2 rounded-full" style={{ background: SOURCE_COLORS[s.source] ?? "var(--muted-foreground)" }} />
                {s.label}
              </span>
              <span className="font-bold text-slate-700">{Number(s.count ?? 0).toLocaleString()}</span>
            </li>
          ))}
        </ul>
      </WidgetBody>
    </WidgetCard>
  );
}

export function KycLevelsWidget() {
  const { t } = useTranslation("dashboard");
  const { data, loading, failed } = useWidgetData("kycLevels");
  const rows = (data?.items ?? []).map((l) => ({ level: `L${l.level_no}`, customers: l.count ?? 0 }));
  return (
    <WidgetCard title={t("kycLevels")} icon={BarChart3} action={data ? <span className="text-xs font-bold text-muted-foreground">{t("totalN", { count: data.total ?? 0 })}</span> : null}>
      <WidgetBody loading={loading} failed={failed} empty={!rows.length} emptyText={t("noKycLevels")}>
        <div className="h-56 min-h-0 flex-1">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={rows} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="level" tick={axisTick} axisLine={false} tickLine={false} />
              <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--primary-light)" }} />
              <Bar dataKey="customers" name={t("customers")} fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </WidgetBody>
    </WidgetCard>
  );
}
