import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock3, History, Play, RefreshCw, Save } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { Toggle } from "@/Components/Common/Toggle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useIsTenant } from "@/Hooks/useInstitutionScope";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { scheduledJobsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { dayDate, inputClass } from "../depositShared";
import { useLiveChannel } from "@/Hooks/useLiveChannel";

// GLOBAL SETTINGS > Scheduled Jobs (menu 183): the platform's daily jobs
// (deposit interest at 00:30, maturity at 00:45 by default), for every
// institution. Switch one on or off, move its time, run it now, and see its
// runs. A run never repeats what an earlier run did.
export function ScheduledJobs() {
  const { t } = useTranslation(["deposits", "common"]);
  const can = usePagePermission();
  // Jobs run for every institution: a tenant only reads them.
  const tenant = useIsTenant();
  const edit = can("Edit") && !tenant;
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [times, setTimes] = useState({});
  const [busy, setBusy] = useState(null);
  const [runsOf, setRunsOf] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const list = rowsOf(await scheduledJobsApi.list({}));
      setJobs(list);
      setTimes(Object.fromEntries(list.map((j) => [j.code, j.run_time])));
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel("/config/scheduler/job/list", () => void load({ silent: true }));

  const call = async (verb, body) => {
    setBusy(body.code);
    try {
      const response = await scheduledJobsApi[verb](body);
      if (response?.message) notifications.success(response.message);
      await load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Clock3 size={22} className="text-primary" /> {t("jobsTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("jobsSubtitle")}</p>
        </div>
        <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
          {t("refresh")}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {jobs.map((job) => {
          const timeChanged = times[job.code] && times[job.code] !== job.run_time;
          return (
            <div key={job.code} className={cn("rounded-2xl border bg-card p-4 transition-shadow hover:shadow-md", job.enabled ? "border-border" : "border-dashed border-slate-300")}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-base font-black text-foreground">
                    {job.name}
                    <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[10px] font-bold text-muted-foreground">{job.code}</span>
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">{job.description}</p>
                </div>
                <Toggle checked={job.enabled} disabled={!edit || busy === job.code} label={t("jobEnabled")} onChange={(enabled) => void call("edit", { code: job.code, enabled })} />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <JobFact label={t("lastStatus")} value={job.running ? <StatusBadge status="RUNNING" variant="subtle" /> : job.last_status ? <StatusBadge status={job.last_status} variant="subtle" /> : "—"} />
                <JobFact label={t("lastRun")} value={accountDate(job.last_started_at)} />
                <JobFact label={t("nextRun")} value={job.enabled ? accountDate(job.next_run_at) : t("switchedOff")} />
                <JobFact label={t("runRequested")} value={job.run_requested_at ? `${accountDate(job.run_requested_at)}${job.run_requested_by ? ` · ${job.run_requested_by}` : ""}` : "—"} />
              </div>
              {job.last_error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{job.last_error}</p>}

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  {t("runTime")}
                  <input type="time" className={cn(inputClass, "w-28 py-1.5")} disabled={!edit} value={times[job.code] ?? ""} onChange={(e) => setTimes((x) => ({ ...x, [job.code]: e.target.value }))} />
                </label>
                {timeChanged && (
                  <Button size="sm" icon={Save} loading={busy === job.code} onClick={() => void call("edit", { code: job.code, run_time: times[job.code] })}>
                    {t("save")}
                  </Button>
                )}
                <div className="ml-auto flex gap-2">
                  <Button variant="secondary" size="sm" icon={History} onClick={() => setRunsOf(job)}>
                    {t("runs")}
                  </Button>
                  {edit && (
                    <Button variant="outline" size="sm" icon={Play} disabled={!job.enabled || job.running || Boolean(job.run_requested_at)} loading={busy === job.code} title={job.enabled ? undefined : t("switchOnFirst")} onClick={() => void call("run", { code: job.code })}>
                      {t("runNow")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {!loading && !jobs.length && <p className="py-10 text-center text-sm text-muted-foreground">{t("noJobs")}</p>}

      {runsOf && <JobRuns job={runsOf} onClose={() => setRunsOf(null)} />}
    </div>
  );
}

function JobFact({ label, value }) {
  return (
    <div className="rounded-xl bg-muted/40 px-3 py-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-0.5 text-xs font-semibold text-foreground">{value}</div>
    </div>
  );
}

// A job's runs, newest first, with the counts each one reports.
function JobRuns({ job, onClose }) {
  const { t } = useTranslation("deposits");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ runs: [], total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    scheduledJobsApi
      .runs({ code: job.code, page, limit })
      .then((r) => {
        const row = rowsOf(r)[0];
        if (!cancelled) setData({ runs: row?.runs ?? [], total: row?.total ?? 0 });
      })
      .catch((error) => notifications.error(error.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [job.code, page, limit]);

  const columns = [
    { key: "started_at", label: t("started"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.started_at)}</span> },
    { key: "business_date", label: t("businessDate"), render: (r) => <span className="whitespace-nowrap text-xs">{dayDate(r.business_date)}</span> },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} variant="subtle" /> },
    { key: "processed", label: t("processed"), render: (r) => <span className="text-xs tabular-nums">{r.processed ?? 0}</span> },
    { key: "failed", label: t("failed"), render: (r) => <span className={cn("text-xs tabular-nums", r.failed ? "font-bold text-red-700" : "")}>{r.failed ?? 0}</span> },
    { key: "summary", label: t("summary"), sortable: false, align: "left", render: (r) => <RunSummary run={r} /> },
    { key: "triggered_by", label: t("triggeredBy"), render: (r) => <span className="text-xs">{r.triggered_by || t("schedule")}</span> },
  ];

  return (
    <Modal open onClose={onClose} size="xl" title={t("runsOf", { name: job.name })}>
      <DataTable
        columns={columns}
        rows={data.runs}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t("runs")}
        emptyTitle={t("noRuns")}
        serverSorted
        serverPagination={{
          page,
          totalPages: Math.max(1, Math.ceil(data.total / limit)),
          totalRecords: data.total,
          onPageChange: setPage,
          limit,
          onLimitChange: (n) => {
            setLimit(Math.min(n, 100));
            setPage(1);
          },
        }}
      />
    </Modal>
  );
}

// The counts in a run's summary (deposits, days_accrued, payouts; settled
// by instruction), its failures and error.
function RunSummary({ run }) {
  const { t } = useTranslation("deposits");
  const { failures, settled, ...counts } = run.summary ?? {};
  const chip = (key, label, value) => (
    <span key={key} className="whitespace-nowrap rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">
      {label}: <span className="tabular-nums">{value}</span>
    </span>
  );
  return (
    <div className="flex max-w-md flex-wrap gap-1">
      {Object.entries(counts).map(([k, v]) => chip(k, t(`count_${k}`, { defaultValue: k }), typeof v === "object" ? JSON.stringify(v) : v))}
      {settled && typeof settled === "object" ? Object.entries(settled).map(([k, v]) => chip(`s${k}`, t(`instruction_${k}`, { defaultValue: k }), v)) : settled != null && chip("settled", t("count_settled"), settled)}
      {Array.isArray(failures) && failures.length > 0 && (
        <span className="w-full text-[10px] font-semibold text-red-700" title={JSON.stringify(failures)}>
          {t("failuresN", { count: failures.length })}
        </span>
      )}
      {run.error && <span className="w-full text-[10px] font-semibold text-red-700">{run.error}</span>}
    </div>
  );
}
