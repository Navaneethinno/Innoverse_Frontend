import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, Pencil, Power, Trash2, XCircle } from "lucide-react";
import { AuditHistory, AuditModal } from "@/Components/Common/AuditModal";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Pager } from "@/Components/Common/Pager";
import { Spinner } from "@/Components/Common/Spinner";
import { useAuth } from "@/Hooks/useAuth";
import { usePagePermission } from "@/Hooks/usePermission";
import { listPage } from "@/Hooks/useServerList";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { formatDateTime } from "@/Utils/Lib/dateFormat";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog, Section, inputClass, labelClass } from "../Finance/Deposits/depositShared";
import { MiniTable } from "../Finance/Loans/loanShared";

// Pieces every InnoRecon screen shares.

export const reconDate = formatDateTime;
// A code as words: "NETWORK_CLEARING" -> "Network clearing".
export const humanize = (code) => (code == null || code === "" ? "—" : String(code).replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()));
export const label = (t, prefix, code) => (code == null || code === "" ? "—" : t(`recon:${prefix}_${code}`, { defaultValue: humanize(code) }));
// Amounts per currency ({ INR: "480.00" }), never added across currencies.
export const perCurrency = (amounts) =>
  Object.entries(amounts ?? {})
    .map(([code, amount]) => `${amount} ${code}`)
    .join(" · ") || "—";

const TONES = {
  green: "bg-emerald-50 text-emerald-700",
  amber: "bg-amber-50 text-amber-700",
  red: "bg-red-50 text-red-700",
  blue: "bg-sky-50 text-sky-700",
  grey: "bg-slate-100 text-slate-600",
};
const TONE_OF = {
  ACTIVE: "green", APPROVED: "green", READ: "green", DONE: "green", MATCHED: "green", MANUAL: "green", SELF_REVERSED: "green", RECEIVED: "green",
  PENDING: "amber", PROPOSED: "amber", RUNNING: "blue", NOT_READ: "grey", TIMING: "amber", FORCE_MATCHED: "amber",
  REJECTED: "red", REFUSED: "red", FAILED: "red", BREAK: "red", UNMATCHED: "red",
  INACTIVE: "grey", CANCELLED: "grey", WRITTEN_OFF: "grey", EXCLUDED: "grey", DISCARDED: "grey",
};

// A status word as a coloured pill.
export function ReconStatus({ value }) {
  const { t } = useTranslation("recon");
  if (!value) return null;
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold", TONES[TONE_OF[value] ?? "grey"])}>{label(t, "status", value)}</span>;
}

// One record by id, fetched again after each change (`reload`).
export function useRecord(get, id, fallback = null) {
  const [record, setRecord] = useState(fallback);
  const [version, setVersion] = useState(0);
  useEffect(() => {
    if (id == null) return undefined;
    let cancelled = false;
    get({ id })
      .then((r) => !cancelled && setRecord(rowsOf(r)[0] ?? null))
      .catch((error) => notifications.error(error.message));
    return () => {
      cancelled = true;
    };
  }, [get, id, version]);
  return [record, useCallback(() => setVersion((n) => n + 1), [])];
}

// A paged sub-list in the list standard (a file's records,
// a set's groups). `body` without page / limit; null waits.
export function usePage(call, body) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [state, setState] = useState({ items: [], total: 0, summary: {}, loading: true });
  const [version, setVersion] = useState(0);
  const key = JSON.stringify(body);
  // A new body starts again from page 1.
  const [lastKey, setLastKey] = useState(key);
  if (lastKey !== key) {
    setLastKey(key);
    setPage(1);
  }
  useEffect(() => {
    if (body == null) return undefined;
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    call({ ...JSON.parse(key), page, limit })
      .then((r) => {
        if (cancelled) return;
        const items = rowsOf(r);
        setState({ items, total: r?.pagination?.totalRecords ?? items.length, summary: r?.summary ?? {}, loading: false });
      })
      .catch((error) => {
        if (cancelled) return;
        notifications.error(error.message);
        setState((s) => ({ ...s, loading: false }));
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [call, key, page, limit, version]);
  return { ...state, page, limit, setPage, setLimit: (n) => (setLimit(n), setPage(1)), reload: () => setVersion((n) => n + 1) };
}

// A usePage list as a table with its pager.
export function PagedTable({ list, columns, empty, rowKey, rowClass }) {
  return (
    <div className="grid gap-2">
      {list.loading && !list.items.length ? (
        <div className="flex justify-center py-6">
          <Spinner size={16} />
        </div>
      ) : (
        <MiniTable rows={list.items} columns={columns} empty={empty} rowKey={rowKey} rowClass={rowClass} />
      )}
      {list.total > list.limit && <Pager page={list.page} pageSize={list.limit} total={list.total} onPageChange={list.setPage} onPageSizeChange={list.setLimit} className="rounded-xl" />}
    </div>
  );
}

// Label / value tiles for a record: the shared Facts, keys translated.
export function FactGrid({ rows }) {
  const { t } = useTranslation("recon");
  return <Facts className="lg:grid-cols-3" rows={rows.filter(Boolean).map(([key, value]) => [t(key), value === "" ? null : value])} />;
}

// A record's lifecycle status (the shared StatusBadge), and "change
// pending" while an edit of an active one waits beside it.
export function RecordStatus({ record }) {
  const { t } = useTranslation("recon");
  return (
    <span className="inline-flex flex-wrap justify-center gap-1">
      <StatusBadge status={record.status} />
      {record.has_pending && record.status !== "PENDING" && <StatusBadge status={t("changePending")} variant="subtle" />}
    </span>
  );
}

// Which lifecycle actions a record offers, in the shape RowActions takes:
// approve / reject a pending record or a pending change of an active one
// (never the maker's own: recon.maker_checker), edit, deactivate /
// reactivate, delete (the server refuses one in use), and its history.
export function reconButtons(record, can, me) {
  const pending = record.status === "PENDING" || Boolean(record.has_pending);
  const maker = record.has_pending ? record.pending_by : (record.pending_by ?? record.updated_by ?? record.created_by);
  const mine = Boolean(me) && maker === me;
  return {
    view: true,
    audit: true,
    edit: record.status !== "INACTIVE" && can("Edit"),
    authorize: pending && !mine && can("Authorise"),
    deauthorize: pending && !mine && can("Authorise"),
    deactivate: record.status === "ACTIVE" && !record.has_pending && can("Change Status"),
    activate: record.status === "INACTIVE" && can("Change Status"),
    delete: can("Delete"),
  };
}

export const useMe = () => useAuth((state) => state.user?.username ?? state.user?.user_name);

// The narration dialog behind every lifecycle action (auth, deauth,
// deactivate, reactivate, delete): `ask(verb, record)` opens it, `node`
// renders it. A reason is needed for all but approve and delete. `hintOf`:
// the dialog's text for a record (what is being decided).
export function useDecision({ api, idKey = "id", onDone, hintOf }) {
  const { t } = useTranslation("recon");
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState(false);
  const run = async (narration) => {
    const { verb, record } = open;
    setBusy(true);
    try {
      const response = await api[verb]({ [idKey]: record[idKey], ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setOpen(null);
      onDone(verb, record);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const verb = open?.verb;
  const node = open && (
    <NarrationDialog
      title={t(`${verb}Title`, { name: open.record.name ?? open.record.code ?? open.record.alpha_code ?? "" })}
      hint={hintOf?.(verb, open.record) ?? t(`${verb}Hint`, { defaultValue: "" })}
      confirmLabel={t(verb === "auth" ? "approve" : verb === "deauth" ? "reject" : verb)}
      variant={verb === "auth" || verb === "reactivate" ? "primary" : "danger"}
      required={!["auth", "delete"].includes(verb)}
      busy={busy}
      onClose={() => setOpen(null)}
      onSave={(narration) => void run(narration)}
    />
  );
  return { ask: (v, record) => setOpen({ verb: v, record }), busy, node };
}

// A list row's actions, as on every maker-checker list: RowActions with the
// record's buttons, the narration dialog, and its history (events).
export function ReconRowActions({ api, row, onView, onEdit, onChanged }) {
  const can = usePagePermission();
  const me = useMe();
  const [history, setHistory] = useState(false);
  const decision = useDecision({ api, onDone: onChanged });
  const buttons = reconButtons(row, can, me);
  const pick = (verb) => (api[verb] ? () => decision.ask(verb, row) : undefined);
  return (
    <>
      <RowActions
        buttons={buttons}
        onView={onView}
        onEdit={onEdit}
        onAudit={api.events ? () => setHistory(true) : undefined}
        onAuthorize={pick("auth")}
        onDeauthorize={pick("deauth")}
        onDeactivate={pick("deactivate")}
        onReactivate={pick("reactivate")}
        onDelete={pick("delete")}
      />
      {decision.node}
      {history && (
        <AuditModal
          title={row.name ?? row.code}
          onClose={() => setHistory(false)}
          fetchAudit={() => api.events({ id: row.id }).then((r) => ({ entries: rowsOf(r), totalPages: 1 }))}
          renderExtra={(entry) => entry.detail && <p className="text-xs text-muted-foreground">{entry.detail}</p>}
        />
      )}
    </>
  );
}

// The same lifecycle actions as buttons in a record's view, plus the view's
// own (`extra`). `onDeleted` closes the view after a delete.
export function MakerChecker({ api, record, onEdit, onChanged, onDeleted, extra = [], idKey = "id" }) {
  const { t } = useTranslation("recon");
  const can = usePagePermission();
  const me = useMe();
  const decision = useDecision({ api, idKey, onDone: (verb) => (verb === "delete" ? onDeleted?.() : onChanged()) });
  const b = reconButtons(record, can, me);
  const ask = (verb) => () => decision.ask(verb, record);
  const buttons = [
    onEdit && b.edit && { key: "edit", label: t("edit"), icon: Pencil, run: onEdit },
    api.auth && b.authorize && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
    api.deauth && b.deauthorize && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    api.deactivate && b.deactivate && { key: "deactivate", label: t("deactivate"), icon: Ban, variant: "danger", run: ask("deactivate") },
    api.reactivate && b.activate && { key: "reactivate", label: t("reactivate"), icon: Power, run: ask("reactivate") },
    ...extra,
    onDeleted && api.delete && b.delete && { key: "delete", label: t("delete"), icon: Trash2, variant: "danger", run: ask("delete") },
  ];
  return (
    <>
      <ActionButtons busy={decision.busy} buttons={buttons} />
      {decision.node}
    </>
  );
}

// Who changed what and when: the record's events.
export function EventsSection({ api, id }) {
  const { t } = useTranslation("recon");
  const [events, setEvents] = useState(null);
  useEffect(() => {
    let cancelled = false;
    api
      .events({ id })
      .then((r) => !cancelled && setEvents(rowsOf(r)))
      .catch((error) => {
        if (cancelled) return;
        notifications.error(error.message);
        setEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [api, id]);
  return (
    <Section title={t("history")}>
      {events ? <AuditHistory entries={events} renderExtra={(entry) => entry.detail && <p className="text-xs text-muted-foreground">{entry.detail}</p>} /> : <Spinner size={14} />}
    </Section>
  );
}

// JSON, read only.
export function JsonView({ value, className }) {
  return <pre className={cn("max-h-96 overflow-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed", className)}>{JSON.stringify(value ?? null, null, 2)}</pre>;
}

// A file read with a layout (a read or a preview): the counts, the controls
// (green or red), header and trailer values, then (when given) the records
// and rejects.
export function ReadResult({ result, records, rejects }) {
  const { t } = useTranslation("recon");
  const r = result?.result ?? result ?? {};
  const headers = Object.entries(r.headers ?? {});
  return (
    <div className="grid gap-3">
      {(result?.problem || r.problem) && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{result?.problem || r.problem}</p>}
      {r.refused && <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-800">{t("readRefused")}</p>}
      <FactGrid rows={[["units", r.units], ["records", r.records], ["accepted", r.accepted], ["rejected", r.rejected], r.missing?.length ? ["missing", r.missing.join(", ")] : null]} />
      {r.controls?.length > 0 && (
        <Section title={t("controls")}>
          <MiniTable
            rows={r.controls}
            rowKey={(c, i) => `${c.name}-${i}`}
            rowClass={(c) => (c.ok ? "bg-emerald-50/60" : "bg-red-50")}
            columns={[
              { key: "name", label: t("control") },
              { key: "scope", label: t("scope") },
              { key: "expected", label: t("expected") },
              { key: "actual", label: t("actual") },
              { key: "ok", label: t("result"), render: (c) => <b className={c.ok ? "text-emerald-700" : "text-red-700"}>{c.ok ? t("ok") : t("failed")}</b> },
              { key: "on_fail", label: t("onFail") },
              { key: "detail", label: t("detail"), wrap: true },
            ]}
          />
        </Section>
      )}
      {headers.length > 0 && (
        <Section title={t("headers")}>
          <div className="grid gap-2 sm:grid-cols-2">
            {headers.map(([name, values]) => (
              <div key={name} className="rounded-xl border border-border p-3">
                <p className="mb-1 font-mono text-xs font-bold">{name}</p>
                <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                  {Object.entries(values ?? {}).map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="break-all font-mono">{String(v ?? "")}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Section>
      )}
      {records && (
        <Section title={t("recordsCount", { count: records.length })}>
          <RecordRows rows={records} />
        </Section>
      )}
      {rejects && (
        <Section title={t("rejectsCount", { count: rejects.length })}>
          <RejectRows rows={rejects} />
        </Section>
      )}
    </div>
  );
}

// A preview's records: their fields as columns, the raw line on a click.
export function RecordRows({ rows }) {
  const { t } = useTranslation("recon");
  const [open, setOpen] = useState(null);
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r.fields ?? {})))].slice(0, 12);
  return (
    <MiniTable
      rows={rows}
      empty={t("noRecords")}
      rowKey={(r, i) => `${r.line_no}-${i}`}
      columns={[
        { key: "line_no", label: t("line") },
        { key: "record_type", label: t("recordType") },
        ...keys.map((k) => ({ key: k, label: k, render: (r) => r.fields?.[k] ?? "" })),
        {
          key: "raw",
          label: t("raw"),
          render: (r) =>
            open === r ? (
              <pre className="max-w-md whitespace-pre-wrap break-all font-mono text-[10px]">{r.raw}</pre>
            ) : (
              <button type="button" onClick={() => setOpen(r)} className="text-[11px] font-bold text-primary hover:underline">
                {t("showRaw")}
              </button>
            ),
        },
      ]}
    />
  );
}

// Lines that could not be read, with their problems.
export function RejectRows({ rows }) {
  const { t } = useTranslation("recon");
  return (
    <MiniTable
      rows={rows}
      empty={t("noRejects")}
      rowKey={(r, i) => `${r.line_no}-${i}`}
      columns={[
        { key: "line_no", label: t("line") },
        { key: "record_type", label: t("recordType") },
        { key: "problems", label: t("problems"), wrap: true, render: (r) => (r.problems ?? []).map((p, i) => <p key={i}>{[p.level, p.code, p.field, p.detail].filter(Boolean).join(" · ")}</p>) },
        { key: "raw", label: t("raw"), wrap: true, render: (r) => <span className="break-all font-mono text-[10px]">{r.raw}</span> },
      ]}
    />
  );
}


// A field with its label (and an optional hint under it).
export function Field({ label: text, required, hint, children, className }) {
  return (
    <label className={`${labelClass} ${className ?? ""}`}>
      {text} {required && <span className="text-red-500">*</span>}
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

// An active (or pending) list as dropdown choices, e.g. layouts or SFTP profiles.
export function useChoices(call, body = {}) {
  const [rows, setRows] = useState([]);
  const key = JSON.stringify(body);
  useEffect(() => {
    let cancelled = false;
    call({ page: 1, limit: 200, ...JSON.parse(key) })
      .then((r) => !cancelled && setRows(listPage(r).items))
      .catch((error) => notifications.error(error.message));
    return () => {
      cancelled = true;
    };
  }, [call, key]);
  return rows;
}

// A typed value, 400 ms after typing stops (a search box).
export function useDebounced(value, delay = 400) {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);
  return settled;
}

export function JsonEditor({ value, onChange, error, className, rows = 18 }) {
  const { t } = useTranslation("recon");
  return (
    <div className={className}>
      <textarea spellCheck={false} rows={rows} className={cn(inputClass, "font-mono text-[11px] leading-relaxed", error && "border-red-400")} value={value} onChange={(e) => onChange(e.target.value)} />
      {error && <p className="mt-1 text-[11px] font-semibold text-red-600">{t("notJson", { error })}</p>}
    </div>
  );
}

// The version in force beside the waiting one, changed lines marked.
export function DefinitionCompare({ current, pending }) {
  const { t } = useTranslation("recon");
  const a = JSON.stringify(current ?? null, null, 2).split("\n");
  const b = JSON.stringify(pending ?? null, null, 2).split("\n");
  const inA = new Set(a);
  const inB = new Set(b);
  const side = (lines, other, tone) => (
    <pre className="max-h-[28rem] overflow-auto rounded-xl border border-border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed">
      {lines.map((line, i) => (
        <div key={i} className={cn(!other.has(line) && tone)}>
          {line || " "}
        </div>
      ))}
    </pre>
  );
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <div className="min-w-0">
        <p className="mb-1 text-xs font-bold">{t("inForce")}</p>
        {side(a, inB, "bg-red-100 text-red-800")}
      </div>
      <div className="min-w-0">
        <p className="mb-1 text-xs font-bold text-amber-700">{t("waitingApproval")}</p>
        {side(b, inA, "bg-emerald-100 text-emerald-800")}
      </div>
    </div>
  );
}

// The canonical columns every record has (amount with its currency).
export const recordColumns = (t) => [
  { key: "business_date", label: t("businessDate") },
  { key: "txn_date", label: t("txnDate"), render: (r) => [r.txn_date, r.txn_time].filter(Boolean).join(" ") || "—" },
  { key: "amount", label: t("amount"), align: "right", render: (r) => <b className="tabular-nums">{r.amount != null ? `${r.amount} ${r.currency ?? ""}` : "—"}</b> },
  { key: "rrn", label: "RRN", render: (r) => <span className="font-mono">{r.rrn ?? "—"}</span> },
  { key: "stan", label: "STAN", render: (r) => <span className="font-mono">{r.stan ?? "—"}</span> },
  { key: "card_number", label: t("card"), render: (r) => <span className="font-mono">{r.card_number ?? "—"}</span> },
  { key: "terminal_id", label: t("terminal") },
  { key: "txn_type", label: t("txnType") },
  { key: "status", label: t("txnStatus"), render: (r) => [r.status, r.is_reversal && t("reversal")].filter(Boolean).join(" · ") || "—" },
];
