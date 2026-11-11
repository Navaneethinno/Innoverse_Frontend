import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileCheck2, FileDown, RotateCcw, Send, Upload, Undo2, XCircle } from "lucide-react";
import { BackButton } from "@/Components/Common/TextButtons";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { TabButton } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Pager } from "@/Components/Common/Pager";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { RowActions } from "@/Components/Common/RowActions";
import { SearchBox } from "@/Components/Common/SearchBox";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/InnoCBS/Accounts/accountShared";
import { ActionButtons, Facts, NarrationDialog, Problems, Section, inputClass, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { useInstitutionScope } from "@/Components/InnoCBS/Loans/loanShared";
import { useClientPage } from "@/Hooks/useClientPage";
import { fileBase64, usePagedList, saveBase64 } from "@/Hooks/usePagedList";
import { usePagePermission } from "@/Hooks/usePermission";
import { useVisiblePoll } from "@/Hooks/useVisiblePoll";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { bulkPayoutsApi, merchantBulkPayoutsApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

const BATCH_STATUSES = ["PENDING", "PROCESSING", "DONE", "REJECTED", "CANCELLED"];
const POLL_MS = 3000;

// An error's own text in the user's language when its error_code is known.
export const errorText = (t, e) => (e?.code ? t(`txn:err_${String(e.code).replace(/\./g, "_")}`, { defaultValue: e.message }) : e?.message);

// FINANCE > Bulk Payouts (menu 222): upload a payout file, check it, file it
// for a checker, and follow it while it is paid.
export function BulkPayouts() {
  return <BulkPayoutScreen api={bulkPayoutsApi} />;
}

// MMS > Merchant Bulk Payouts (menu 223): the merchants' own batches, made
// and authorised in the merchant portal. Read only.
export function MerchantBulkPayouts() {
  return <BulkPayoutScreen api={merchantBulkPayoutsApi} readOnly />;
}

function BulkPayoutScreen({ api, readOnly = false }) {
  const { t } = useTranslation(["txn", "common"]);
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const location = useLocation();
  const [openId, setOpenId] = useState(location.state?.recordId ?? null);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setQ(search.trim()), 400);
    return () => window.clearTimeout(timer);
  }, [search]);
  const list = usePagedList(api.list, scope({ ...(status ? { batch_status: status } : {}), ...(q ? { search: q } : {}) }), { livePath: api.listPath, enabled: !openId });

  if (openId) {
    return (
      <BatchView
        id={openId}
        api={api}
        readOnly={readOnly}
        onBack={() => {
          setOpenId(null);
          list.reload();
        }}
      />
    );
  }

  const columns = [
    {
      key: "reference",
      label: t("bp_reference"),
      align: "left",
      render: (b) => (
        <button type="button" onClick={() => setOpenId(b.id)} className="text-left">
          <p className="font-mono text-xs font-bold text-primary hover:underline">{b.batch_ref}</p>
          <p className="text-[10px] text-muted-foreground">{b.file_name}</p>
        </button>
      ),
    },
    readOnly && { key: "merchant", label: t("bp_merchant"), render: (b) => <span className="text-xs">{b.from_name ?? "—"}</span> },
    { key: "from", label: t("bp_fromWallet"), render: (b) => <span className="font-mono text-xs">{b.from_acct_num ?? "—"}</span> },
    { key: "narration", label: t("bp_narration"), render: (b) => <span className="text-xs">{b.narration || "—"}</span> },
    { key: "rows", label: t("bp_rows"), render: (b) => <span className="text-xs tabular-nums">{b.valid_count ?? b.row_count ?? "—"}</span> },
    { key: "total", label: t("bp_totalDebit"), render: (b) => <span className="whitespace-nowrap text-xs font-semibold tabular-nums">{money(b.total_debit, b.currency_code)}</span> },
    { key: "batch_status", label: t("bp_status"), render: (b) => <BatchStatus batch={b} /> },
    { key: "created_time", label: t("bp_created"), render: (b) => <span className="whitespace-nowrap text-xs">{accountDate(b.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (b) => <RowActions buttons={{ view: true }} onView={() => setOpenId(b.id)} /> },
  ].filter(Boolean);

  return (
    <div className="pt-1 pb-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>{t(readOnly ? "bp_merchantTitle" : "bp_title")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t(readOnly ? "bp_merchantSubtitle" : "bp_subtitle")}</p>
        </div>
      </div>
      {/* The standard list card: batch tabs, then search, then the table. */}
      <div className="overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}>
        <div className="flex flex-col gap-2 border-b border-border p-3">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
            <div className="thin-scrollbar flex min-w-0 items-center gap-1.5 overflow-x-auto">
              <TabButton active={!status} onClick={() => setStatus("")}>
                {t("bp_all")}
              </TabButton>
              {BATCH_STATUSES.map((s) => (
                <TabButton key={s} active={status === s} onClick={() => setStatus(s)}>
                  {t(`bp_status_${s}`)}
                </TabButton>
              ))}
            </div>
          {!readOnly && can("Add") && (
            <div className="ml-auto flex shrink-0 items-center gap-2 [&>button]:h-8">
            <Button
              size="sm"
              variant="secondary"
              icon={Download}
              onClick={() =>
                api
                  .template({})
                  .then((r) => rowsOf(r)[0] ?? {})
                  .then((tpl) => saveBase64(tpl.csv_base64, tpl.file_name ?? "bulk_payout_template.csv"))
                  .catch((e) => notifications.error(e.message))
              }
            >
              {t("bp_template")}
            </Button>
            <Button size="sm" icon={Upload} disabled={chooser && !institution} disabledReason={t("common:blockedNeedsInstitution")} onClick={() => setUploading(true)}>
              {t("bp_upload")}
            </Button>
            </div>
          )}
          </div>
          <div className="flex w-full flex-wrap items-center gap-2">
            <SearchBox search={search} onSearch={setSearch} placeholder={t("bp_searchHint")} className="min-w-[16rem] flex-[1_1_16rem]" />
          </div>
        </div>
        <DataTable bare rows={list.rows} isLoading={list.loading} serverPagination={list.pagination} columns={columns} rowKey={(b) => b.id} title={t("bp_title")} emptyTitle={t("bp_none")} emptyDescription={t(readOnly ? "bp_noneMerchantHint" : "bp_noneHint")} />
      </div>
      {uploading && (
        <UploadDialog
          scope={scope}
          onClose={() => setUploading(false)}
          onFiled={(id) => {
            setUploading(false);
            setOpenId(id ?? null);
            list.reload();
          }}
        />
      )}
    </div>
  );
}

function BatchStatus({ batch }) {
  const { t } = useTranslation("txn");
  const s = batch.batch_status;
  return <StatusBadge status={s} label={s ? t(`bp_status_${s}`, { defaultValue: s }) : undefined} />;
}

function RowStatus({ status }) {
  const { t } = useTranslation("txn");
  return <StatusBadge status={status === "VALID" ? "OK" : status === "INVALID" ? "FAILED" : status} label={status ? t(`bp_row_${status}`, { defaultValue: status }) : undefined} variant="subtle" />;
}

const payeeOf = (r) => [r.payee_account || r.payee_phone, r.bank_provider].filter(Boolean).join(" · ") || "—";

// The rows of a check or a batch, paged in memory (a file holds up to 1000).
function PayoutRows({ rows, currency, showPosting = false }) {
  const { t } = useTranslation("txn");
  const { rows: shown, pager } = useClientPage(rows, 25);
  return (
    <div className="overflow-x-auto">
      <SimpleTable columns={[t("bp_rowNo"), t("bp_payeeType"), t("bp_payee"), t("bp_name"), t("bp_nameCheck"), { label: t("bp_amount"), align: "right" }, { label: t("bp_fee"), align: "right" }, t("bp_rowStatus"), showPosting && t("bp_rrn"), t("bp_reason")].filter((c) => c !== false)}>
        <tbody>
          {shown.map((r, i) => (
            <tr key={r.row_no ?? i} className="border-b border-border/60">
              <td className="px-3 py-2 tabular-nums">{r.row_no ?? i + 1}</td>
              <td className="px-3 py-2">{t(`bp_payee_${r.payee_type}`, { defaultValue: r.payee_type ?? "—" })}</td>
              <td className="px-3 py-2 font-mono">{payeeOf(r)}</td>
              <td className="px-3 py-2">
                {r.payee_name || r.expected_name || "—"}
                {r.expected_name && r.payee_name && r.expected_name !== r.payee_name && <span className="block text-[10px] text-muted-foreground">{r.expected_name}</span>}
              </td>
              <td className="px-3 py-2">{r.name_check ? <span className={cn("font-semibold", r.name_check === "MISMATCH" && "text-red-700", r.name_check === "MATCH" && "text-emerald-700")}>{t(`bp_nameCheck_${r.name_check}`)}</span> : "—"}</td>
              <td className="px-3 py-2 text-right tabular-nums">{money(r.amount, currency)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.fee != null ? money(r.fee, currency) : "—"}</td>
              <td className="px-3 py-2">
                <RowStatus status={r.row_status} />
              </td>
              {showPosting && <td className="px-3 py-2 font-mono">{r.rrn || "—"}</td>}
              <td className="px-3 py-2 text-red-700">{r.reason || ""}</td>
            </tr>
          ))}
        </tbody>
      </SimpleTable>
      {pager && <Pager {...pager} className="mt-2" />}
    </div>
  );
}

// The totals of a check or a batch, whatever the server counts.
function Totals({ totals, currency }) {
  const { t } = useTranslation("txn");
  if (!totals) return null;
  return (
    <Facts
      rows={[
        [t("bp_total_row_count"), totals.row_count],
        [t("bp_total_valid_count"), totals.valid_count],
        [t("bp_total_invalid_count"), totals.invalid_count],
        [t("bp_total_total_amount"), money(totals.total_amount, currency)],
        [t("bp_totalDebit"), money(totals.total_debit, currency)],
        [t("bp_total_free_balance"), money(totals.free_balance, currency)],
        [t("bp_total_funds_ok"), t(totals.funds_ok ? "bp_yes" : "bp_no")],
      ]}
    />
  );
}

// Upload: template, the file, the wallet; check (writes nothing), then file
// it as PENDING with a narration.
function UploadDialog({ scope, onClose, onFiled }) {
  const { t } = useTranslation(["txn", "common"]);
  const [template, setTemplate] = useState(null);
  const [acct, setAcct] = useState("");
  const [file, setFile] = useState(null);
  const [checked, setChecked] = useState(null);
  const [narration, setNarration] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    bulkPayoutsApi
      .template({})
      .then((r) => setTemplate(rowsOf(r)[0] ?? null))
      .catch((e) => notifications.error(e.message));
  }, []);

  const body = async () => scope({ from_acct_num: acct.trim(), file_name: file.name, file_base64: await fileBase64(file) });
  const check = async () => {
    setBusy(true);
    setError("");
    setChecked(null);
    try {
      setChecked(rowsOf(await bulkPayoutsApi.check(await body()))[0] ?? null);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };
  const add = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await bulkPayoutsApi.add({ ...(await body()), narration: narration.trim() });
      notifications.success(response?.message ?? t("bp_filed"));
      onFiled(rowsOf(response)[0]?.id);
    } catch (e) {
      setError(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };

  const rows = checked?.rows ?? [];
  const valid = rows.filter((r) => r.row_status !== "INVALID").length;
  const currency = checked?.totals?.currency_code;
  const ready = acct.trim() && file;
  const addBlocked = !checked ? t("bp_blockedCheckFirst") : !valid ? t("bp_blockedNoValid") : checked.duplicate ? t("bp_blockedDuplicate") : !narration.trim() ? t("common:blockedFillRequired") : null;

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={t("bp_upload")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button variant="secondary" icon={FileCheck2} loading={busy} disabled={!ready} disabledReason={t("common:blockedFillRequired")} onClick={check}>
            {t("bp_check")}
          </Button>
          <Button icon={Send} loading={busy} disabled={Boolean(addBlocked)} disabledReason={addBlocked} onClick={add}>
            {t("bp_fileBatch")}
          </Button>
        </>
      }
    >
      <div className="grid gap-4">
        {template && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-muted/30 px-3 py-2 text-xs">
            <span className="text-muted-foreground">{t("bp_templateHint", { columns: (template.columns ?? []).join(", "), max: template.max_rows ?? 1000, types: (template.payee_types ?? []).join(", ") })}</span>
            <Button size="sm" variant="secondary" icon={Download} onClick={() => saveBase64(template.csv_base64, template.file_name ?? "bulk_payout_template.csv")}>
              {t("bp_template")}
            </Button>
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("bp_fromWallet")}
            <RequiredMark />
            <input
              value={acct}
              placeholder="1000234567"
              onChange={(e) => {
                setAcct(e.target.value);
                setChecked(null);
              }}
              className={cn(inputClass, "mt-1.5")}
            />
          </label>
          <label className={labelClass}>
            {t("bp_file")}
            <RequiredMark />
            <input
              type="file"
              accept=".csv,.xlsx"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null);
                setChecked(null);
              }}
              className={cn(inputClass, "mt-1.5 py-2 file:me-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1 file:text-xs file:font-semibold file:text-foreground")}
            />
          </label>
        </div>
        <Problems message={error} />
        {checked && (
          <>
            {checked.duplicate && (
              <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {checked.duplicate_message || t("bp_duplicate")}
              </p>
            )}
            <Totals totals={checked.totals} currency={currency} />
            <p className="text-xs text-muted-foreground">{t("bp_validOf", { valid, total: rows.length })}</p>
            <PayoutRows rows={rows} currency={currency} />
            <label className={labelClass}>
              {t("bp_narration")}
              <RequiredMark />
              <textarea value={narration} maxLength={500} onChange={(e) => setNarration(e.target.value)} className={cn(inputClass, "mt-1.5 min-h-16")} />
            </label>
          </>
        )}
      </div>
    </Modal>
  );
}

// One batch: its totals, progress while paid, its rows, and what the user
// may do now (the batch's `actions`).
function BatchView({ id, api, readOnly, onBack }) {
  const { t } = useTranslation(["txn", "common"]);
  const can = usePagePermission();
  const [batch, setBatch] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      setBatch(rowsOf(await api.get({ id }))[0] ?? null);
    } catch (e) {
      notifications.error(e.message);
    }
  }, [api, id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useVisiblePoll(reload, POLL_MS, batch?.batch_status === "PROCESSING");

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await api[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      await reload();
    } catch (e) {
      notifications.error(errorText(t, e));
    } finally {
      setBusy(false);
    }
  };
  const download = async () => {
    setBusy(true);
    try {
      const file = rowsOf(await api.result_file({ id }))[0] ?? {};
      saveBase64(file.csv_base64, file.file_name ?? `bulk_payout_${id}.csv`);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!batch) return <PageSkeleton />;
  const a = batch.actions ?? {};
  const cur = batch.currency_code;
  const buttons = [
    a.result_file && { key: "result", label: t("bp_resultFile"), icon: FileDown, run: download },
    !readOnly && a.cancel && can("Add") && { key: "cancel", label: t("bp_cancel"), icon: Undo2, run: () => setDialog("cancel") },
    !readOnly && a.retry && can("Add") && { key: "retry", label: t("bp_retry"), icon: RotateCcw, run: () => setDialog("retry") },
    !readOnly && a.deauth && can("Authorize") && { key: "deauth", label: t("bp_reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
    !readOnly && a.auth && can("Authorize") && { key: "auth", label: t("bp_authorise"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
  ];
  const done = Number(batch.processed_count ?? 0);
  const todo = Number(batch.to_process_count ?? 0);
  const pct = todo > 0 ? Math.min(100, Math.round((done / todo) * 100)) : 0;

  return (
    <div className="pt-1 pb-6">
      <BackButton onClick={onBack}>
        <ArrowLeft size={15} /> {t("bp_back")}
      </BackButton>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-mono text-xl font-black">{batch.batch_ref}</h1>
              <BatchStatus batch={batch} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[batch.file_name, batch.from_name, batch.from_acct_num, batch.narration, batch.inst_profile_name].filter(Boolean).join(" · ")}</p>
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {batch.batch_status === "PROCESSING" && (
          <div className="mt-3">
            <p className="mb-1 text-xs font-semibold">{t("bp_progress", { done, total: todo })}</p>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}
      </div>
      <Section title={t("bp_details")} className="mb-4">
        <Facts
          rows={[
            [t("bp_totalDebit"), money(batch.total_debit, cur)],
            [t("bp_total_total_amount"), money(batch.total_amount, cur)],
            [t("bp_total_row_count"), batch.row_count],
            [t("bp_total_valid_count"), batch.valid_count],
            [t("bp_postedFailed"), `${batch.posted_count ?? 0} / ${batch.failed_count ?? 0}`],
            [t("bp_createdBy"), batch.created_by],
            [t("bp_created"), accountDate(batch.created_time)],
            batch.decided_by && [t("bp_decidedBy"), batch.decided_by],
            batch.decided_time && [t("bp_decidedAt"), accountDate(batch.decided_time)],
            batch.decision_narration && [t("bp_decisionNote"), batch.decision_narration],
            batch.file_sha256 && [t("bp_fileHash"), <span key="h" className="break-all font-mono text-[10px]">{batch.file_sha256}</span>],
          ]}
        />
      </Section>
      <Section title={t("bp_rows")}>
        <PayoutRows rows={batch.items ?? []} currency={cur} showPosting />
      </Section>
      {dialog && (
        <NarrationDialog
          title={t(`bp_confirm_${dialog}`)}
          hint={t(`bp_confirmHint_${dialog}`)}
          confirmLabel={t(`bp_${dialog === "auth" ? "authorise" : dialog === "deauth" ? "reject" : dialog}`)}
          variant={dialog === "deauth" ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, narration)}
        />
      )}
    </div>
  );
}

