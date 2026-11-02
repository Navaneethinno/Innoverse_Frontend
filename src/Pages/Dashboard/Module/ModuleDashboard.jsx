import { createElement, useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import { Activity, ArrowDownRight, ArrowUpRight, PieChart as PieIcon, RefreshCw, TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AnimatedNumber } from "@/Components/Common/AnimatedNumber";
import { Button } from "@/Components/Common/Button";
import { dashboardApi } from "@/Services/Dashboard/dashboard.api";
import { getModuleIcon } from "@/Pages/Sidebar/moduleIcons";
import { cn } from "@/Utils/Lib/utils";
import { WidgetBody, WidgetCard, glass } from "../widgets/WidgetCard";

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4, var(--muted-foreground))", "var(--chart-5, var(--primary))"];
const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 };
const axisTick = { fontSize: 11, fill: "var(--muted-foreground)" };

// "2 hours ago", from the reply's "2026-10-31 12:35:28".
function relative(at, lang) {
  const then = new Date(String(at).replace(" ", "T")).getTime();
  if (!Number.isFinite(then)) return at ?? "";
  const format = new Intl.RelativeTimeFormat(lang, { numeric: "auto" });
  const minutes = Math.round((then - Date.now()) / 60000);
  if (Math.abs(minutes) < 60) return format.format(minutes, "minute");
  if (Math.abs(minutes) < 1440) return format.format(Math.round(minutes / 60), "hour");
  return format.format(Math.round(minutes / 1440), "day");
}

// A module's own dashboard (/<module>/dashboard), about that module only.
// Everything on it comes from /config/dashboard/module: the number of tiles
// and series differs by module and by institution type. A module without a
// dashboard shows a note, not a page of made-up figures.
export function ModuleDashboard({ moduleName }) {
  const { t, i18n } = useTranslation("dashboard");
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const lang = i18n.language;

  const load = useCallback(async () => {
    setState((s) => ({ ...s, loading: true, error: null }));
    try {
      setState({ data: await dashboardApi.module(moduleName), loading: false, error: null });
    } catch (error) {
      setState((s) => ({ ...s, loading: false, error }));
    }
  }, [moduleName]);

  useEffect(() => {
    void load();
    // The reply's labels are translated, so a new language reads it again.
  }, [load, lang]);

  const { data, loading, error } = state;
  const plain = new Intl.NumberFormat(lang, { maximumFractionDigits: 1 });
  const compact = new Intl.NumberFormat(lang, { notation: "compact", maximumFractionDigits: 1 });
  const series = data?.trend?.series ?? [];
  const rows = (data?.trend?.months ?? []).map((month, i) => {
    const [year, number] = String(month).split("-").map(Number);
    const row = { label: new Date(year, number - 1, 1).toLocaleString(lang, { month: "short" }) };
    series.forEach((s) => {
      row[s.key] = s.values?.[i] ?? 0;
    });
    return row;
  });
  const items = data?.breakdown?.items ?? [];
  const total = data?.breakdown?.total ?? items.reduce((n, x) => n + (x.count ?? 0), 0);
  const recent = data?.recent ?? [];
  const noDashboard = error?.code === "config.dashboard_module_unknown";

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
            <h1 className="text-2xl font-black leading-none tracking-tight text-slate-800">{data?.module_label ?? moduleName}</h1>
          </div>
        </div>
        {!noDashboard && (
          <Button data-tour="dashboard-refresh" variant="secondary" size="sm" disabled={loading} onClick={() => void load()}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> {t("refresh")}
          </Button>
        )}
      </motion.div>

      {noDashboard ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{t("noModuleDashboard")}</p>
      ) : error && !data ? (
        <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{error.message}</p>
      ) : (
        <div data-tour="dashboard-cards">
          {!data && <div className="mb-4 h-28 animate-pulse rounded-2xl bg-muted/60" />}
          <div className="mb-4 grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(200px,1fr))]">
            {(data?.tiles ?? []).map((tile, i) => (
              <motion.div key={tile.key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.05 * i }} className="min-w-0 rounded-2xl border p-5" style={glass}>
                <p className="truncate text-[11px] font-bold uppercase tracking-widest text-muted-foreground">{tile.label}</p>
                <p className="amount-fit mt-2 text-3xl font-black leading-none tracking-tight text-slate-800">
                  <AnimatedNumber value={Number(tile.value) || 0} format={(n) => plain.format(n)} />
                </p>
                {tile.change_pct != null && (
                  <p className={cn("mt-2 flex items-center gap-1 text-[11px] font-bold", tile.change_pct > 0 ? "text-emerald-600" : tile.change_pct < 0 ? "text-red-600" : "text-muted-foreground")}>
                    {tile.change_pct > 0 ? <ArrowUpRight size={12} /> : tile.change_pct < 0 ? <ArrowDownRight size={12} /> : null}
                    {t("md.vsLastMonth", { change: `${tile.change_pct > 0 ? "+" : ""}${tile.change_pct}%` })}
                  </p>
                )}
              </motion.div>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <WidgetCard title={t("md.trend")} icon={TrendingUp} className="min-h-80 lg:col-span-2">
              <WidgetBody loading={!data} empty={!rows.length || !series.length}>
                <div className="min-h-56 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={rows} margin={{ top: 4, right: 8, left: -12, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="label" tick={axisTick} axisLine={false} tickLine={false} />
                      <YAxis tick={axisTick} axisLine={false} tickLine={false} allowDecimals={false} tickFormatter={(v) => compact.format(v)} />
                      <Tooltip contentStyle={tooltipStyle} />
                      {series.map((s, i) => (
                        <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={COLORS[i % COLORS.length]} strokeWidth={2} fill={COLORS[i % COLORS.length]} fillOpacity={0.12} />
                      ))}
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-[11px] font-semibold text-muted-foreground">
                  {series.map((s, i) => (
                    <span key={s.key} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                      {s.label}
                    </span>
                  ))}
                </div>
              </WidgetBody>
            </WidgetCard>

            <WidgetCard title={data?.breakdown?.label ?? t("md.breakdown")} icon={PieIcon} className="min-h-80">
              <WidgetBody loading={!data} empty={!items.length}>
                <div className="relative h-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={items} dataKey="count" nameKey="name" innerRadius="62%" outerRadius="90%" paddingAngle={items.length > 1 ? 2 : 0} stroke="none">
                        {items.map((x, i) => (
                          <Cell key={x.key} fill={COLORS[i % COLORS.length]} />
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
                  {items.map((x, i) => (
                    <li key={x.key} className="flex items-center justify-between gap-2 text-xs">
                      <span className="flex min-w-0 items-center gap-2 font-semibold text-slate-700">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                        <span className="truncate">{x.name}</span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {plain.format(x.count ?? 0)}
                        {total > 0 && ` · ${Math.round(((x.count ?? 0) / total) * 100)}%`}
                      </span>
                    </li>
                  ))}
                </ul>
              </WidgetBody>
            </WidgetCard>

            <WidgetCard title={t("md.recent")} icon={Activity} className="lg:col-span-3">
              <WidgetBody loading={!data} empty={!recent.length}>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {recent.map((r, i) => (
                    <li key={`${r.at}:${i}`} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2.5 text-sm">
                      <span className="min-w-0">
                        <span className="block truncate font-semibold text-slate-700">
                          {r.menu_label ?? r.menu_name} · {r.action}
                        </span>
                        <span className="block truncate text-[11px] text-muted-foreground">{r.user_name}</span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">{relative(r.at, lang)}</span>
                    </li>
                  ))}
                </ul>
              </WidgetBody>
            </WidgetCard>
          </div>
        </div>
      )}
    </div>
  );
}
