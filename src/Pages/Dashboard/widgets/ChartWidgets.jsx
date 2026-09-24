import { useTranslation } from "react-i18next";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, PieChart as PieIcon, TrendingUp } from "lucide-react";
import { CUSTOMER_SOURCES, KYC_LEVELS, ONBOARDING_TREND } from "./dummyData";
import { WidgetCard } from "./WidgetCard";

// Chart colours come from the theme's --chart-* tokens (SVG accepts CSS
// variables), so light/dark mode and tenant branding apply automatically.
const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 12,
  fontSize: 12,
};
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

export function OnboardingTrendWidget() {
  const { t } = useTranslation("dashboard");
  return (
    <WidgetCard title={t("onboardingTrend")} icon={TrendingUp}>
      <div className="h-56 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={ONBOARDING_TREND} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
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
            <XAxis dataKey="month" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
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
    </WidgetCard>
  );
}

const SOURCE_COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"];

export function CustomerSourcesWidget() {
  const { t } = useTranslation("dashboard");
  const data = CUSTOMER_SOURCES.map((s) => ({ ...s, name: t(s.key) }));
  const total = data.reduce((sum, s) => sum + s.value, 0);
  return (
    <WidgetCard title={t("customerSources")} icon={PieIcon}>
      <div className="relative h-44">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={3} stroke="none">
              {data.map((s, i) => (
                <Cell key={s.key} fill={SOURCE_COLORS[i % SOURCE_COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-black text-slate-800">{total.toLocaleString()}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t("customers")}</span>
        </div>
      </div>
      <ul className="mt-3 grid gap-1.5">
        {data.map((s, i) => (
          <li key={s.key} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className="h-2 w-2 rounded-full" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
              {s.name}
            </span>
            <span className="font-bold text-slate-700">{s.value.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </WidgetCard>
  );
}

export function KycLevelsWidget() {
  const { t } = useTranslation("dashboard");
  return (
    <WidgetCard title={t("kycLevels")} icon={BarChart3}>
      <div className="h-56 min-h-0 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={KYC_LEVELS} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="level" tick={axisTick} axisLine={false} tickLine={false} />
            <YAxis tick={axisTick} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--primary-light)" }} />
            <Bar dataKey="customers" name={t("customers")} fill="var(--chart-1)" radius={[6, 6, 0, 0]} maxBarSize={36} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </WidgetCard>
  );
}
