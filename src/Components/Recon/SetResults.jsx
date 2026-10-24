import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, Download, Link2, MessageSquare, Play, RotateCcw, Stamp, Unlink, UserPlus, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Pager } from "@/Components/Common/Pager";
import { SearchBox } from "@/Components/Common/SearchBox";
import { Spinner } from "@/Components/Common/Spinner";
import { usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { usersApi } from "@/Services/UserManagement/users.api";
import { reconActionsApi, reconBreaksApi, reconResultsApi, reconRunsApi } from "@/Services/Recon/recon.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { inputClass, Section } from "../Finance/Deposits/depositShared";
import { MiniTable } from "../Finance/Loans/loanShared";
import { ListTable } from "@/Components/Common/ListView";
import { RowActions } from "@/Components/Common/RowActions";
import { FactGrid, Field, PagedTable, ReconStatus, label, perCurrency, reconDate, recordColumns, useDebounced, usePage } from "./reconShared";

// A set's results: its runs, the groups they made, what is still open
// (timing differences inside the window, breaks past it) and their aging.
// Every change to a result is a request another user approves.

// ---- Runs ----

export function SetRuns({ set, onChanged }) {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [date, setDate] = useState("");
  const [running, setRunning] = useState(null);
  const [shown, setShown] = useState(null);
  const [signingOff, setSigningOff] = useState(false);
  const list = useServerList({ api: reconRunsApi.listPath, call: reconRunsApi.list, prefix: "run_", extra: { filters: { set_id: set.id } } });
  const { reload } = list;

  // A started run is polled every 1.5 s until it is DONE or FAILED.
  useEffect(() => {
    if (!running || running.status !== "RUNNING") return undefined;
    const timer = window.setTimeout(() => {
      reconRunsApi
        .get({ id: running.id })
        .then((r) => {
          const run = rowsOf(r)[0] ?? running;
          setRunning(run);
          if (run.status !== "RUNNING") {
            setShown(run);
            reload();
            onChanged();
          }
        })
        .catch((error) => notifications.error(error.message));
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [running, reload, onChanged]);

  const start = async () => {
    try {
      setRunning(rowsOf(await reconRunsApi.start({ set_id: set.id, business_date: date }))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    }
  };
  const busy = running?.status === "RUNNING";
  const columns = [
    { key: "business_date", label: t("businessDate"), render: (r) => <span className="text-xs font-semibold">{r.business_date}</span> },
    { key: "window_from", label: t("windowFrom"), render: (r) => <span className="text-xs">{r.window_from}</span> },
    { key: "set_version", label: t("version"), render: (r) => <span className="text-xs tabular-nums">{r.set_version}</span> },
    { key: "status", label: t("status"), render: (r) => <ReconStatus value={r.status} /> },
    { key: "started_at", label: t("started"), render: (r) => <span className="whitespace-nowrap text-xs">{`${r.requested_by ?? ""} · ${reconDate(r.started_at)}`}</span> },
    { key: "actions", label: t("actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => setShown(r)} /> },
  ];
  return (
    <div className="grid gap-4">
      {can("Add") && set.status === "ACTIVE" && (
        <Section title={t("runForDate")}>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={t("businessDate")} required>
              <DateInput className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Button icon={Play} loading={busy} disabled={!date || busy} onClick={() => void start()}>
              {busy ? t("running") : t("run")}
            </Button>
            <Button variant="secondary" icon={Stamp} disabled={!date} onClick={() => setSigningOff(true)}>
              {t("signOff")}
            </Button>
          </div>
          {running?.status === "FAILED" && <p className="mt-2 text-xs font-semibold text-red-700">{running.error}</p>}
          <p className="mt-2 text-[11px] text-muted-foreground">{t("signOffHint")}</p>
        </Section>
      )}
      <ListTable list={list} columns={columns} rowKey={(r) => r.id} title={t("runs")} emptyTitle={t("noRuns")} />
      {shown && (
        <Modal open onClose={() => setShown(null)} size="xl" title={t("runOf", { date: shown.business_date })}>
          <RunSummary run={shown} />
        </Modal>
      )}
      {signingOff && <RequestDialog set={set} kind="SIGN_OFF" target={{ business_date: date }} onClose={() => setSigningOff(false)} />}
    </div>
  );
}

// What a run found, per source and per pass. Amounts stay per currency.
export function RunSummary({ run }) {
  const { t } = useTranslation("recon");
  const s = run.summary ?? {};
  return (
    <div className="grid gap-3">
      <div className="flex items-center gap-2">
        <ReconStatus value={run.status} />
        {run.error && <span className="text-xs font-semibold text-red-700">{run.error}</span>}
      </div>
      <FactGrid rows={[["window", `${run.window_from} → ${run.business_date}`], ["groups", s.groups], ["reversed", s.reversed], ["merged", s.merged], ["seconds", s.seconds], ["finished", reconDate(run.finished_at)]]} />
      <Section title={t("perSource")}>
        <MiniTable
          rows={s.sources}
          rowKey={(x) => x.source_id}
          columns={[
            { key: "label", label: t("source") },
            { key: "records", label: t("records"), align: "right" },
            { key: "matched", label: t("matched"), align: "right" },
            { key: "proposed", label: t("proposed"), align: "right" },
            { key: "self_reversed", label: t("selfReversed"), align: "right" },
            { key: "open", label: t("open"), align: "right", render: (x) => `${x.open} · ${perCurrency(x.open_amount)}` },
            { key: "breaks", label: t("breaks"), align: "right", render: (x) => <span className={x.breaks ? "font-bold text-red-700" : ""}>{`${x.breaks} · ${perCurrency(x.break_amount)}`}</span> },
          ]}
        />
        <p className="mt-2 text-[11px] text-muted-foreground">{t("openVsBreaks")}</p>
      </Section>
      <Section title={t("perPass")}>
        <MiniTable
          rows={s.passes}
          rowKey={(x) => x.name}
          columns={[
            { key: "name", label: t("passName"), render: (x) => <span className="font-mono">{x.name}</span> },
            { key: "matched", label: t("matched"), align: "right" },
            { key: "proposed", label: t("proposed"), align: "right" },
            { key: "ambiguous", label: t("ambiguous"), align: "right" },
          ]}
        />
      </Section>
    </div>
  );
}

// ---- Groups ----

const GROUP_STATUSES = ["", "MATCHED", "PROPOSED", "MANUAL", "FORCE_MATCHED", "SELF_REVERSED", "WRITTEN_OFF", "EXCLUDED"];
const isMatch = (g) => ["MATCHED", "MANUAL", "FORCE_MATCHED"].includes(g.status);
const isClosed = (g) => ["WRITTEN_OFF", "EXCLUDED"].includes(g.status);

export function SetGroups({ set }) {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [status, setStatus] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [typed, setTyped] = useState("");
  const search = useDebounced(typed);
  const [request, setRequest] = useState(null);
  const list = usePage(reconResultsApi.groups, { set_id: set.id, ...(status ? { filters: { status } } : {}), ...(from ? { date_from: from } : {}), ...(to ? { date_to: to } : {}), ...(search.trim() ? { search: search.trim() } : {}) });
  const sources = set.definition?.sources ?? [];
  const labelOf = (id) => sources.find((s) => s.source_id === id)?.label ?? `#${id}`;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <SearchBox className="min-w-56 flex-1" search={typed} onSearch={setTyped} placeholder={t("recordSearchHint")} />
        <FilterSelect className="w-44" value={status} onChange={setStatus} options={GROUP_STATUSES.map((s) => ({ value: s, label: s ? label(t, "status", s) : t("allStatuses") }))} />
        <DateInput className={`${inputClass} w-40`} value={from} onChange={(e) => setFrom(e.target.value)} placeholder={t("from")} />
        <DateInput className={`${inputClass} w-40`} value={to} onChange={(e) => setTo(e.target.value)} placeholder={t("to")} />
      </div>
      {list.loading && !list.items.length ? (
        <div className="flex justify-center py-6">
          <Spinner size={16} />
        </div>
      ) : list.items.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{t("noGroups")}</p>
      ) : (
        list.items.map((g) => (
          <GroupCard
            key={g.id}
            group={g}
            labelOf={labelOf}
            columns={g.source_ids?.length ? g.source_ids : [...new Set(g.records.map((r) => r.source_id))]}
            onRequest={can("Add") ? (kind) => setRequest({ kind, group: g }) : null}
          />
        ))
      )}
      {list.total > list.limit && <Pager page={list.page} pageSize={list.limit} total={list.total} onPageChange={list.setPage} onPageSizeChange={list.setLimit} className="rounded-xl" />}
      {request && <RequestDialog set={set} kind={request.kind} target={{ group_id: request.group.id }} group={request.group} onClose={() => setRequest(null)} onDone={list.reload} />}
    </div>
  );
}

// One group: a column per source, the difference highlighted when not zero.
export function GroupCard({ group: g, columns, labelOf, onRequest }) {
  const { t } = useTranslation("recon");
  const diff = Number(g.amount_diff ?? 0) !== 0;
  const buttons = onRequest
    ? [
        g.status === "PROPOSED" && ["ACCEPT", CheckCircle2],
        g.status === "PROPOSED" && ["REJECT", XCircle],
        isMatch(g) && ["UNMATCH", Unlink],
        isClosed(g) && ["REOPEN", RotateCcw],
      ].filter(Boolean)
    : [];
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="flex flex-wrap items-center gap-2 text-xs">
          <ReconStatus value={g.status} />
          {g.reason && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{label(t, "reason", g.reason)}</span>}
          {!g.complete && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">{t("incomplete")}</span>}
          <span className="text-muted-foreground">{`#${g.id} · ${g.business_date}`}</span>
          {g.amount_diff != null && <span className={cn("rounded px-1.5 font-bold tabular-nums", diff ? "bg-red-100 text-red-700" : "text-muted-foreground")}>{t("difference", { amount: g.amount_diff })}</span>}
        </span>
        <span className="flex flex-wrap gap-1">
          {buttons.map(([kind, Icon]) => (
            <Button key={kind} size="sm" variant={kind === "ACCEPT" ? "primary" : "secondary"} icon={Icon} onClick={() => onRequest(kind)}>
              {t(`kind_${kind}`)}
            </Button>
          ))}
        </span>
      </div>
      {g.note && <p className="mb-2 text-xs text-muted-foreground">{g.note}</p>}
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, columns.length)}, minmax(0, 1fr))` }}>
        {columns.map((sourceId) => (
          <div key={sourceId} className="min-w-0 rounded-xl bg-muted/40 p-2">
            <p className="mb-1 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{labelOf(sourceId)}</p>
            {g.records
              .filter((r) => r.source_id === sourceId)
              .map((r) => (
                <div key={r.record_id} className="border-t border-border py-1 text-[11px] first:border-0">
                  <p className="flex justify-between gap-2">
                    <b className="tabular-nums">{`${r.amount} ${r.currency ?? ""}`}</b>
                    <span className="text-muted-foreground">{[r.txn_date, r.txn_time].filter(Boolean).join(" ")}</span>
                  </p>
                  <p className="truncate font-mono text-muted-foreground">{[r.rrn, r.stan, r.card_number, r.terminal_id].filter(Boolean).join(" · ") || "—"}</p>
                  <p className="truncate text-muted-foreground">{[r.txn_type, r.status, r.is_reversal && t("reversal"), r.pass && `${t("pass")} ${r.pass}`].filter(Boolean).join(" · ")}</p>
                </div>
              ))}
            {!g.records.some((r) => r.source_id === sourceId) && <p className="text-[11px] text-muted-foreground">{t("missing")}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- Unmatched ----

export function SetUnmatched({ set }) {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const [asOf, setAsOf] = useState("");
  const [sourceId, setSourceId] = useState("");
  const [state, setState] = useState("");
  const [typed, setTyped] = useState("");
  const search = useDebounced(typed);
  const [picked, setPicked] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [exporting, setExporting] = useState(false);
  const body = { set_id: set.id, ...(asOf ? { as_of: asOf } : {}), ...(sourceId ? { filters: { source_id: Number(sourceId) } } : {}), ...(state ? { tab: state } : {}), ...(search.trim() ? { search: search.trim() } : {}) };
  const list = usePage(reconResultsApi.unmatched, body);
  const sources = set.definition?.sources ?? [];
  const toggle = (id) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  const done = () => {
    setDialog(null);
    setPicked([]);
    list.reload();
  };
  const exportCsv = async () => {
    setExporting(true);
    try {
      const { blob, fileName } = await reconResultsApi.export(body);
      saveBlob(blob, fileName);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setExporting(false);
    }
  };
  const bulk = [
    ["MANUAL_MATCH", Link2, picked.length >= 2],
    ["WRITE_OFF", Ban, picked.length >= 1],
    ["EXCLUDE", XCircle, picked.length >= 1],
  ];
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <SearchBox className="min-w-56 flex-1" search={typed} onSearch={setTyped} placeholder={t("recordSearchHint")} />
        <FilterSelect className="w-44" value={sourceId} onChange={setSourceId} options={[{ value: "", label: t("allSources") }, ...sources.map((s) => ({ value: String(s.source_id), label: s.label }))]} />
        <FilterSelect className="w-40" value={state} onChange={setState} options={["", "TIMING", "BREAK"].map((s) => ({ value: s, label: s ? label(t, "status", s) : t("timingAndBreaks") }))} />
        <DateInput className={`${inputClass} w-40`} value={asOf} onChange={(e) => setAsOf(e.target.value)} placeholder={t("asOf")} />
        <Button size="sm" variant="secondary" icon={Download} loading={exporting} onClick={() => void exportCsv()}>
          {t("exportCsv")}
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">{t("unmatchedHint", { days: list.summary.window_days ?? set.definition?.window_days ?? "—", date: list.summary.as_of ?? "—" })}</p>
      {(can("Add") || can("Edit")) && (
        <div className={cn("flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2", picked.length ? "border-primary bg-[var(--primary-light)]" : "border-border")}>
          <span className="text-xs font-bold">{t("pickedCount", { count: picked.length })}</span>
          {can("Add") && bulk.map(([kind, Icon, ok]) => (
            <Button key={kind} size="sm" variant="secondary" icon={Icon} disabled={!ok} onClick={() => setDialog({ kind })}>
              {t(`kind_${kind}`)}
            </Button>
          ))}
          {can("Edit") && (
            <Button size="sm" variant="secondary" icon={UserPlus} disabled={!picked.length} onClick={() => setDialog({ kind: "assign" })}>
              {t("assign")}
            </Button>
          )}
          {picked.length > 0 && (
            <button type="button" className="text-xs font-bold text-primary hover:underline" onClick={() => setPicked([])}>
              {t("clear")}
            </button>
          )}
        </div>
      )}
      <PagedTable
        list={list}
        empty={t("nothingOpen")}
        rowKey={(r) => r.record_id}
        rowClass={(r) => picked.includes(r.record_id) && "bg-[var(--primary-light)]"}
        columns={[
          {
            key: "pick",
            label: "",
            render: (r) => <input type="checkbox" aria-label={t("pick")} disabled={Boolean(r.pending_action_id)} checked={picked.includes(r.record_id)} onChange={() => toggle(r.record_id)} />,
          },
          { key: "source_code", label: t("source"), render: (r) => sources.find((s) => s.source_id === r.source_id)?.label ?? r.source_code },
          ...recordColumns(t),
          { key: "state", label: t("state"), render: (r) => <ReconStatus value={r.state} /> },
          { key: "aging", label: t("age"), render: (r) => t("ageDays", { days: r.age_days, bucket: r.aging }) },
          { key: "owner", label: t("owner"), render: (r) => r.owner ?? "—" },
          {
            key: "notes",
            label: t("notes"),
            render: (r) => (
              <button type="button" onClick={() => setDialog({ kind: "notes", record: r })} className="flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">
                <MessageSquare size={12} /> {r.notes ?? 0}
              </button>
            ),
          },
          { key: "pending", label: "", render: (r) => r.pending_action_id && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">{t("actionPending")}</span> },
        ]}
      />
      {dialog && ["MANUAL_MATCH", "WRITE_OFF", "EXCLUDE"].includes(dialog.kind) && <RequestDialog set={set} kind={dialog.kind} target={{ record_ids: picked }} records={list.items.filter((r) => picked.includes(r.record_id))} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "assign" && <AssignDialog set={set} recordIds={picked} onClose={() => setDialog(null)} onDone={done} />}
      {dialog?.kind === "notes" && <NotesDialog set={set} record={dialog.record} onClose={() => setDialog(null)} onChanged={list.reload} />}
    </div>
  );
}

// ---- Aging ----

const BUCKETS = ["0-1", "2-3", "4-7", "8-15", "16-30", "30+"];

export function SetAging({ set }) {
  const { t } = useTranslation("recon");
  const [asOf, setAsOf] = useState("");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    let cancelled = false;
    reconResultsApi
      .aging({ set_id: set.id, ...(asOf ? { as_of: asOf } : {}) })
      .then((r) => !cancelled && setRows(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
    return () => {
      cancelled = true;
    };
  }, [set.id, asOf]);
  // One row per source and state; a cell per bucket, each currency apart.
  const table = useMemo(() => {
    const byRow = new Map();
    (rows ?? []).forEach((x) => {
      const key = `${x.source_code}|${x.state}`;
      if (!byRow.has(key)) byRow.set(key, { key, source: x.source_code, state: x.state, cells: {} });
      (byRow.get(key).cells[x.aging] ??= []).push(x);
    });
    return [...byRow.values()];
  }, [rows]);
  return (
    <div className="grid gap-3">
      <Field label={t("asOf")} className="w-48">
        <DateInput className={inputClass} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
      </Field>
      {!rows ? (
        <Spinner size={16} />
      ) : (
        <MiniTable
          rows={table}
          rowKey={(r) => r.key}
          empty={t("nothingOpen")}
          columns={[
            { key: "source", label: t("source") },
            { key: "state", label: t("state"), render: (r) => <ReconStatus value={r.state} /> },
            ...BUCKETS.map((b) => ({
              key: b,
              label: t("daysBucket", { bucket: b }),
              align: "right",
              render: (r) =>
                (r.cells[b] ?? []).map((c) => (
                  <p key={c.currency} className={cn("tabular-nums", r.state === "BREAK" && "font-bold text-red-700")}>
                    {`${c.count} · ${c.amount} ${c.currency}`}
                  </p>
                )),
            })),
          ]}
        />
      )}
    </div>
  );
}

// ---- Requests, notes and owners ----

// Ask for a change to the results; another user approves it.
export function RequestDialog({ set, kind, target, group, records, onClose, onDone }) {
  const { t } = useTranslation("recon");
  const [options, setOptions] = useState(null);
  const [reason, setReason] = useState("");
  const [narration, setNarration] = useState("");
  const [direction, setDirection] = useState("LOSS");
  const [keep, setKeep] = useState(() => group?.records?.map((r) => r.record_id) ?? []);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    reconActionsApi
      .options()
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((error) => notifications.error(error.message));
  }, []);
  const reasons = options?.reasons?.[kind] ?? [];
  const needsReason = ["MANUAL_MATCH", "UNMATCH", "WRITE_OFF", "EXCLUDE"].includes(kind);
  const withGl = kind === "WRITE_OFF" && Boolean(set.definition?.gl);
  const ambiguous = kind === "ACCEPT" && group?.reason === "AMBIGUOUS";
  const valid = (!needsReason || reason) && (reason !== "OTHER" || narration.trim()) && (!ambiguous || keep.length >= 2);
  const send = async () => {
    setBusy(true);
    try {
      const response = await reconActionsApi.request({
        set_id: set.id,
        kind,
        ...target,
        ...(ambiguous ? { record_ids: keep } : {}),
        ...(reason ? { reason } : {}),
        ...(narration.trim() ? { narration: narration.trim() } : {}),
        ...(withGl ? { gl_direction: direction } : {}),
      });
      notifications.success(response?.message ?? t("requestSent"));
      onClose();
      onDone?.();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const total = records?.reduce((sum, r) => ({ ...sum, [r.currency]: (Number(sum[r.currency] ?? 0) + Number(r.amount ?? 0)).toFixed(2) }), {});
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t(`requestTitle_${kind}`)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!valid} onClick={() => void send()}>
            {t("sendForApproval")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">{t(`requestHint_${kind}`)}</p>
        {records?.length > 0 && <p className="text-xs font-semibold">{t("recordsChosen", { count: records.length, total: perCurrency(total) })}</p>}
        {target.business_date && <p className="text-xs font-semibold">{t("businessDateIs", { date: target.business_date })}</p>}
        {ambiguous && (
          <div className="grid gap-1">
            <p className="text-xs font-semibold">{t("keepRecords")}</p>
            {group.records.map((r) => (
              <label key={r.record_id} className="flex items-center gap-2 text-xs">
                <input type="checkbox" checked={keep.includes(r.record_id)} onChange={() => setKeep((k) => (k.includes(r.record_id) ? k.filter((x) => x !== r.record_id) : [...k, r.record_id]))} />
                {`${r.source_code} · ${r.amount} ${r.currency ?? ""} · ${r.rrn ?? r.stan ?? r.record_id}`}
              </label>
            ))}
          </div>
        )}
        {reasons.length > 0 && (
          <Field label={t("reason")} required={needsReason}>
            <FilterSelect value={reason} onChange={setReason} options={[{ value: "", label: t("chooseReason") }, ...reasons.map((r) => ({ value: r, label: label(t, "reason", r) }))]} />
          </Field>
        )}
        {withGl && (
          <Field label={t("glDirection")} required hint={t("glDirectionHint")}>
            <FilterSelect value={direction} onChange={setDirection} options={["LOSS", "GAIN"].map((d) => ({ value: d, label: t(`gl_${d.toLowerCase()}`) }))} />
          </Field>
        )}
        <Field label={reason === "OTHER" ? t("narrationRequired") : t("narration")} required={reason === "OTHER"}>
          <textarea className={`${inputClass} min-h-20`} maxLength={500} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function AssignDialog({ set, recordIds, onClose, onDone }) {
  const { t } = useTranslation("recon");
  const [users, setUsers] = useState([]);
  const [assignee, setAssignee] = useState("");
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    usersApi
      .getActive()
      .then((r) => setUsers([...new Set(rowsOf(r).map((u) => u.user_name ?? u.username ?? u.name).filter(Boolean))]))
      .catch(() => setUsers([]));
  }, []);
  const save = async (to) => {
    setBusy(true);
    try {
      const response = await reconBreaksApi.assign({ set_id: set.id, record_ids: recordIds, assignee: to, ...(narration.trim() ? { narration: narration.trim() } : {}) });
      if (response?.message) notifications.success(response.message);
      onDone();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("assignTitle", { count: recordIds.length })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="secondary" loading={busy} onClick={() => void save("")}>
            {t("takeBack")}
          </Button>
          <Button loading={busy} disabled={!assignee} onClick={() => void save(assignee)}>
            {t("assign")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <Field label={t("assignTo")} required>
          <FilterSelect value={assignee} onChange={setAssignee} options={[{ value: "", label: t("chooseUser") }, ...users.map((u) => ({ value: u, label: u }))]} />
        </Field>
        <Field label={t("narration")}>
          <textarea className={`${inputClass} min-h-16`} maxLength={500} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

function NotesDialog({ set, record, onClose, onChanged }) {
  const { t } = useTranslation("recon");
  const [notes, setNotes] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    reconBreaksApi
      .notes({ set_id: set.id, record_id: record.record_id })
      .then((r) => setNotes(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
  }, [set.id, record.record_id]);
  const add = async () => {
    setBusy(true);
    try {
      setNotes(rowsOf(await reconBreaksApi.note({ set_id: set.id, record_id: record.record_id, narration: text.trim() })));
      setText("");
      onChanged();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal open onClose={onClose} size="md" title={t("notesFor", { amount: `${record.amount} ${record.currency ?? ""}`, ref: record.rrn ?? record.stan ?? record.record_id })}>
      <div className="grid gap-3">
        {!notes ? (
          <Spinner size={14} />
        ) : notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noNotes")}</p>
        ) : (
          <ul className="grid gap-2">
            {notes.map((n) => (
              <li key={n.id} className="rounded-xl border border-border p-2.5 text-xs">
                <p className="text-[10px] text-muted-foreground">{`${n.by} · ${reconDate(n.at)}${n.kind === "ASSIGN" ? ` · ${n.assignee ? t("assignedTo", { user: n.assignee }) : t("takenBack")}` : ""}`}</p>
                {n.text && <p className="mt-0.5">{n.text}</p>}
              </li>
            ))}
          </ul>
        )}
        <Field label={t("addNote")}>
          <textarea className={`${inputClass} min-h-16`} maxLength={500} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
        <Button className="justify-self-end" loading={busy} disabled={!text.trim()} onClick={() => void add()}>
          {t("addNote")}
        </Button>
      </div>
    </Modal>
  );
}
