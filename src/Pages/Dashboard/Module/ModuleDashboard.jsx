import { createElement } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Activity, ArrowDownRight, ArrowUpRight, PieChart as PieIcon, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedNumber } from "@/Components/Common/AnimatedNumber";
import { getModuleIcon } from "@/Pages/Sidebar/moduleIcons";
import { kebab } from "@/Pages/Sidebar/menuRouteMap";
import { cn } from "@/Utils/Lib/utils";
import { WidgetCard, glass } from "../widgets/WidgetCard";
import { GENERIC, SAMPLE } from "./moduleDashboards";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4, var(--muted-foreground))", "var(--chart-5, var(--primary))"];
const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 };
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

// A module's own dashboard, opened by picking the module in the sidebar
// (/<module>/dashboard). SAMPLE numbers for now: the badge says so until the
// backend's per-module summary is wired in (see moduleDashboards.js).
export function ModuleDashboard({ moduleName }) {
  const { t, i18n } = useTranslation("dashboard");
  const data = SAMPLE[kebab(moduleName)] ?? GENERIC;
  const lang = i18n.language;
  const compact = new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 });
  const plain = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  const ago = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const monthName = (i) => new Date(new Date().getFullYear(), new Date().getMonth() - 11 + i, 1).toLocaleString(lang, { month: "short" });
  const rows = data.trend.rows.map((r) => ({ ...r, label: monthName(r.i) }));
  const total = data.breakdown.reduce((n, [, v]) => n + v, 0);
  const when = (mins) => (mins < 60 ? ago.format(-mins, "minute") : mins < 1440 ? ago.format(-Math.round(mins / 60), "hour") : ago.format(-Math.round(mins / 1440), "day"));

  return (
    <div className="pb-8 pt-4">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl text-white shadow-md" style={{ background: "var(--primary)" }}>
            {createElement(getModuleIcon(moduleName), { size: 20 })}
          </span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>
              {t("md.overview")}
            </p>
            <h1 className="text-2xl font-black leading-none tracking-tight text-slate-800">{moduleName}</h1>
          </div>
        </div>
        <span className="rounded-full border border-dashed border-amber-400 bg-amber-50 px-3 py-1 text-[11px] font-bold text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">{t("md.sample")}</span>
      </motion.div>

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map(([key, value, isMoney, change], i) => (
          <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 * i }} className="min-w-0 rounded-2xl border p-5" style={glass}>
            <p className="truncate text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{t(`md.${key}`)}</p>
            <p className="amount-fit mt-2 text-3xl font-black leading-none tracking-tight text-slate-800">
              <AnimatedNumber value={value} format={(n) => (isMoney ? compact.format(n) : plain.format(n))} />
            </p>
            {change != null && (
              <p className={cn("mt-2 flex items-center gap-1 text-[11px] font-bold", change > 0 ? "text-emerald-600" : change < 0 ? "text-red-600" : "text-muted-foreground")}>
                {change > 0 ? <ArrowUpRight size={12} /> : change < 0 ? <ArrowDownRight size={12} /> : null}
                {t("md.vsLastMonth", { change: `${change > 0 ? "+" : ""}${change}%` })}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <WidgetCard title={t("md.trend")} icon={TrendingUp} className="min-h-80 lg:col-span-2">
          <div className="min-h-56 flex-1">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                <defs>
                  {["a", "b"].map((k, i) => (
                    <linearGradient key={k} id={`md-${k}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={COLORS[i]} stopOpacity={0.35} />
                      <stop offset="100%" stopColor={COLORS[i]} stopOpacity={0} />
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={(v) => compact.format(v)} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area type="monotone" dataKey="a" name={t(`md.${data.trend.a}`)} stroke={COLORS[0]} strokeWidth={2} fill="url(#md-a)" />
                <Area type="monotone" dataKey="b" name={t(`md.${data.trend.b}`)} stroke={COLORS[1]} strokeWidth={2} fill="url(#md-b)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 flex gap-4 text-[11px] font-semibold text-muted-foreground">
            {[data.trend.a, data.trend.b].map((k, i) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i] }} />
                {t(`md.${k}`)}
              </span>
            ))}
          </div>
        </WidgetCard>

        <WidgetCard title={t("md.breakdown")} icon={PieIcon} className="min-h-80">
          <div className="relative h-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.breakdown.map(([k, v]) => ({ name: t(`md.${k}`), value: v }))} dataKey="value" innerRadius="62%" outerRadius="90%" paddingAngle={2} stroke="none">
                  {data.breakdown.map(([k], i) => (
                    <Cell key={k} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <span className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-black text-slate-800">{compact.format(total)}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("md.total")}</span>
            </span>
          </div>
          <ul className="mt-3 grid gap-1.5">
            {data.breakdown.map(([k, v], i) => (
              <li key={k} className="flex items-center justify-between gap-2 text-xs">
                <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                  <span className="truncate">{t(`md.${k}`)}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">
                  {plain.format(v)} · {Math.round((v / total) * 100)}%
                </span>
              </li>
            ))}
          </ul>
        </WidgetCard>

        <WidgetCard title={t("md.recent")} icon={Activity} className="lg:col-span-3">
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data.activity.map(([k, mins]) => (
              <li key={k} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
                <span className="min-w-0 truncate font-semibold text-slate-700">{t(`md.${k}`)}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{when(mins)}</span>
              </li>
            ))}
          </ul>
        </WidgetCard>
      </div>
    </div>
  );
}
