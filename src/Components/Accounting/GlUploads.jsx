import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FileSpreadsheet, Send, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { glUploadsApi } from "@/Services/Accounting/accounting.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Problems, inputClass, labelClass } from "../TermDeposits/depositShared";
import { ProductStatus } from "../TermDeposits/DepositProducts/productShared";
import { GlType, useRecordActions } from "./accountingShared";

const ACTIONS = ["NEW", "CHANGED", "UNCHANGED", "ERROR"];
const ACTION_TONE = { NEW: "bg-emerald-50 text-emerald-800", CHANGED: "bg-sky-50 text-sky-800", UNCHANGED: "bg-muted text-muted-foreground", ERROR: "bg-red-50 text-red-700" };

// What each row of a file does (or would do), filterable by action, errors first.
function UploadRows({ rows }) {
  const { t } = useTranslation("accounting");
  const [action, setAction] = useState("");
  const shownRows = useMemo(() => (rows ?? []).filter((r) => !action || r.action === action), [rows, action]);
  const count = (a) => (rows ?? []).filter((r) => r.action === a).length;
  return (
    <ListPanel
      tabs={[["", "statusAll", FileSpreadsheet], ...ACTIONS.map((a) => [a, `accounting:row_${a}`, a === "ERROR" ? ShieldCheck : FileSpreadsheet])]}
      value={action}
      onChange={setAction}
      counts={{ "": rows?.length ?? 0, ...Object.fromEntries(ACTIONS.map((a) => [a, count(a)])) }}
    >
      <DataTable
        bare
        compact
        pageSize={50}
        columns={[
          { key: "line", label: t("line"), render: (r) => <span className="text-xs tabular-nums">{r.line}</span> },
          { key: "action", label: t("rowAction"), render: (r) => <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", ACTION_TONE[r.action])}>{t(`row_${r.action}`)}</span> },
          { key: "name", label: t("gl"), align: "left", render: (r) => <span className="text-xs"><b>{r.name}</b> <span className="text-muted-foreground">{r.path}</span></span> },
          { key: "kind", label: t("kind"), render: (r) => <span className="text-xs">{t(`kind_${r.kind}`, { defaultValue: r.kind })}</span> },
          { key: "gl_code", label: t("glCode"), render: (r) => <span className="font-mono text-xs">{r.gl_code || "—"}</span> },
          { key: "gl_type", label: t("glType"), render: (r) => <GlType value={r.gl_type} /> },
          { key: "problems", label: t("problems"), align: "left", render: (r) => (r.problems?.length ? <span className="text-xs text-red-700">{r.problems.join("; ")}</span> : <span className="text-xs text-muted-foreground">{r.account_number || "—"}</span>) },
        ]}
        rows={shownRows}
        rowKey={(r) => r.line}
        title={t("rows")}
        emptyTitle={t("noRows")}
      />
    </ListPanel>
  );
}

const Summary = ({ summary }) => {
  const { t } = useTranslation("accounting");
  return (
    <div className="flex flex-wrap gap-2">
      {["rows", "new", "changed", "unchanged", "errors"].map((k) => (
        <span key={k} className={cn("rounded-xl border border-border px-3 py-1.5 text-xs", k === "errors" && summary?.errors ? "border-red-200 bg-red-50 text-red-700" : "")}>
          <b className="tabular-nums">{summary?.[k] ?? 0}</b> {t(`sum_${k}`)}
        </span>
      ))}
    </div>
  );
};

// Upload a chart of accounts: pick the file and the options, Validate to see
// what each row would do (nothing saved), then Submit the whole file for a
// checker. Submit is open only when no row has an error.
export function UploadDialog({ options, onClose, onSubmitted }) {
  const { t } = useTranslation("accounting");
  const [file, setFile] = useState(null);
  const [opts, setOpts] = useState({ currency_id: "", multi_currency: false, under_id: "" });
  const [result, setResult] = useState(null);
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const fields = () => ({ file, ...(opts.currency_id ? { currency_id: opts.currency_id } : {}), ...(opts.multi_currency ? { multi_currency: "true" } : {}), ...(opts.under_id ? { under_id: opts.under_id } : {}) });
  const setOpt = (key) => (value) => {
    setOpts((o) => ({ ...o, [key]: value }));
    setResult(null);
  };

  const validate = async () => {
    setBusy("validate");
    setError("");
    try {
      setResult(rowsOf(await glUploadsApi.validate(fields()))[0] ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };
  const submit = async () => {
    setBusy("submit");
    setError("");
    try {
      const r = await glUploadsApi.add({ ...fields(), ...(narration.trim() ? { narration: narration.trim() } : {}) });
      notifications.success(r?.message ?? t("uploadSubmitted"));
      onSubmitted();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t("uploadTitle")}
      icon={<Upload size={15} />}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant="secondary" size="sm" icon={ShieldCheck} loading={busy === "validate"} disabled={!file} onClick={validate}>
            {t("validate")}
          </Button>
          <Button size="sm" icon={Send} loading={busy === "submit"} disabled={!result || result.summary?.errors > 0} onClick={submit}>
            {t("submitForApproval")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={cn(labelClass, "sm:col-span-2")}>
          {t("file")}
          <input
            type="file"
            accept=".xlsx,.csv"
            className={cn(inputClass, "mt-1.5 file:mr-3 file:rounded-lg file:border-0 file:bg-[var(--primary-light)] file:px-3 file:py-1 file:text-xs file:font-bold file:text-primary")}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              setResult(null);
            }}
          />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("fileHint")}</span>
        </label>
        <label className={labelClass}>
          {t("uploadCurrency")}
          <FilterSelect className="mt-1.5" disabled={opts.multi_currency} value={opts.currency_id} onChange={setOpt("currency_id")} options={[{ value: "", label: t("baseCurrency") }, ...(options.currencies ?? []).map((c) => ({ value: String(c.id), label: `${c.alpha_code} · ${c.name}` }))]} />
        </label>
        <div className="flex items-end">
          <Toggle showLabel label={t("multiCurrencyAccounts")} checked={opts.multi_currency} onChange={setOpt("multi_currency")} />
        </div>
        <label className={cn(labelClass, "sm:col-span-2")}>
          {t("underParent")}
          <FilterSelect className="mt-1.5" value={opts.under_id} onChange={setOpt("under_id")} options={[{ value: "", label: t("topLevel") }, ...(options.parents ?? []).map((p) => ({ value: String(p.id), label: p.path }))]} />
        </label>
        {result && (
          <label className={cn(labelClass, "sm:col-span-2")}>
            {t("narration")}
            <input className={cn(inputClass, "mt-1.5")} value={narration} onChange={(e) => setNarration(e.target.value)} />
          </label>
        )}
      </div>
      {error && (
        <div className="mt-3">
          <Problems message={error} />
        </div>
      )}
      {result && (
        <div className="mt-4 grid gap-3">
          <p className="text-xs text-muted-foreground">{t("validatedX", { file: result.file_name, layout: t(`layout_${result.layout}`, { defaultValue: result.layout }) })}</p>
          <Summary summary={result.summary} />
          <UploadRows rows={result.rows} />
        </div>
      )}
    </Modal>
  );
}

// The uploads, newest first; a checker opens one to review its rows and
// authorise or reject the whole file.
export function GlUploads({ version, onChanged }) {
  const { t } = useTranslation("accounting");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [status, setStatus] = useState("");
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(null);
  const [mine, setMine] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    glUploadsApi
      .list({ page, page_size: limit, ...(status ? { status: Number(status) } : {}) })
      .then((r) => {
        const row = rowsOf(r)[0];
        if (!cancelled) setData({ items: row?.items ?? [], total: row?.total ?? 0 });
      })
      .catch((e) => !cancelled && notifications.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [page, limit, status, version, mine]);

  return (
    <>
      <ListPanel
        tabs={[]}
        filters={
          <FilterSelect
            value={status}
            onChange={(v) => {
              setStatus(v);
              setPage(1);
            }}
            options={[{ value: "", label: t("anyStatus") }, ...[2, 1, 5].map((v) => ({ value: String(v), label: t(`upload_${v}`) }))]}
          />
        }
      >
        <DataTable
          bare
          columns={[
            {
              key: "file_name",
              label: t("file"),
              align: "left",
              render: (u) => (
                <button type="button" onClick={() => setOpen(u.id)} className="text-left">
                  <p className="text-xs font-bold text-primary hover:underline">{u.file_name}</p>
                  <p className="text-[10px] text-muted-foreground">{u.narration}</p>
                </button>
              ),
            },
            { key: "summary", label: t("rows"), render: (u) => <span className="text-xs tabular-nums">{t("summaryLine", u.summary ?? {})}</span> },
            { key: "status", label: t("status"), render: (u) => <ProductStatus product={u} /> },
            { key: "created_by", label: t("uploadedBy"), render: (u) => <span className="text-xs">{u.created_by} · {accountDate(u.created_time)}</span> },
            { key: "decided_by", label: t("decidedBy"), render: (u) => <span className="text-xs">{u.decided_by ? `${u.decided_by} · ${accountDate(u.decided_time)}` : "—"}</span> },
            { key: "actions", label: t("open"), sortable: false, render: (u) => <RowActions buttons={{ view: true }} onView={() => setOpen(u.id)} /> },
          ]}
          rows={data.items}
          rowKey={(u) => u.id}
          isLoading={loading}
          title={t("coaTab_uploads")}
          emptyTitle={t("noUploads")}
          serverSorted
          serverPagination={{
            page,
            totalPages: Math.max(1, Math.ceil(data.total / limit)),
            totalRecords: data.total,
            onPageChange: setPage,
            limit,
            onLimitChange: (n) => {
              setLimit(n);
              setPage(1);
            },
          }}
        />
      </ListPanel>
      {open && (
        <UploadDetail
          id={open}
          onClose={() => setOpen(null)}
          onChanged={() => {
            setMine((v) => v + 1);
            onChanged();
          }}
        />
      )}
    </>
  );
}

function UploadDetail({ id, onClose, onChanged }) {
  const { t } = useTranslation("accounting");
  const [upload, setUpload] = useState(null);
  const load = () => glUploadsApi.get({ id }).then((r) => setUpload(rowsOf(r)[0] ?? null));
  useEffect(() => {
    glUploadsApi
      .get({ id })
      .then((r) => setUpload(rowsOf(r)[0] ?? null))
      .catch((e) => notifications.error(e.message));
  }, [id]);
  const { buttons, busy, dialog } = useRecordActions({
    actions: upload?.actions,
    run: async (verb, narration) => {
      const r = await glUploadsApi[verb]({ id, ...(narration ? { narration } : {}) });
      notifications.success(r?.message ?? t("done"));
      onChanged();
      await load();
    },
  });
  return (
    <Modal open onClose={onClose} size="xl" title={upload?.file_name ?? t("upload")} icon={<FileSpreadsheet size={15} />}>
      {!upload ? (
        <div className="flex justify-center p-6">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              <ProductStatus product={upload} />
              <p className="mt-1">
                {t("uploadedBy")}: {upload.created_by} · {accountDate(upload.created_time)}
                {upload.narration ? ` · “${upload.narration}”` : ""}
              </p>
              {upload.decided_by && (
                <p>
                  {t("decidedBy")}: {upload.decided_by} · {accountDate(upload.decided_time)}
                  {upload.decision_narration ? ` · “${upload.decision_narration}”` : ""}
                </p>
              )}
            </div>
            <ActionButtons buttons={buttons} busy={busy} />
          </div>
          <Summary summary={upload.summary} />
          <p className="text-xs text-muted-foreground">{t(Number(upload.status) === 2 ? "rowsWouldDo" : "rowsDid")}</p>
          <UploadRows rows={upload.rows} />
        </div>
      )}
      {dialog}
    </Modal>
  );
}
