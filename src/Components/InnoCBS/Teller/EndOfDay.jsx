import { LinkButton } from "@/Components/Common/TextButtons";
import { platformToday } from "@/Utils/Lib/dateFormat";
import { EmptyNote } from "@/Components/Common/EmptyNote";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, CheckCircle2, LockKeyhole, Unlock, XCircle } from "lucide-react";
import { MenuLink } from "@/Components/Common/MenuLink";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { accountDate, money } from "@/Components/InnoCBS/Accounts/accountShared";
import { useAuth } from "@/Hooks/useAuth";
import { usePagePermission } from "@/Hooks/usePermission";
import { glReportsApi, tellerApi } from "@/Services/Accounting/accounting.api";
import { DateInput } from "@/Components/Common/DateInput";
import { ExportButtons } from "@/Components/Reports/Shared/reportShared";
import { recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, NarrationDialog, Section, inputClass, labelClass } from "../Deposits/depositShared";
import { Field, MiniTable, useInstitutionScope } from "../Loans/loanShared";
import { branchOptions, slipReference, useCoreBanking } from "../coreBankingShared";
import { CountDialog } from "./Desk";
import { ProofSheet, Variance, kindLabel, newSlip, sessionOwner } from "./tellerShared";

// A vault's counts, latest first (at most 100).
export function VaultCounts({ vault }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    tellerApi
      .vault_counts(scope({ id: vault.id }))
      .then((r) => setRows(Array.isArray(r?.data) ? r.data : []))
      .catch((e) => {
        setRows([]);
        notifications.error(e.message);
      });
  }, [vault.id, scope]);
  if (!rows) return <PageSkeleton />;
  return (
    <MiniTable
      rows={rows}
      rowKey={(v) => v.id}
      empty={t("noVaultCounts")}
      columns={[
        { key: "business_date", label: t("businessDate"), render: (v) => <span className="text-xs">{v.business_date}</span> },
        {
          key: "counted_at",
          label: t("countedBy"),
          render: (v) => (
            <span className="text-xs leading-tight">
              <b className="block">{v.counted_by}</b>
              <span className="text-muted-foreground">{accountDate(v.counted_at)}</span>
            </span>
          ),
        },
        { key: "expected", label: t("expected"), align: "right", render: (v) => money(v.expected, vault.currency) },
        { key: "counted", label: t("counted"), align: "right", render: (v) => money(v.counted, vault.currency) },
        { key: "variance", label: t("variance"), align: "right", render: (v) => <Variance value={v.variance} currency={vault.currency} /> },
        { key: "rrn", label: "RRN", render: (v) => <span className="font-mono text-xs">{v.rrn || "—"}</span> },
        { key: "note", label: t("note"), wrap: true, render: (v) => <span className="text-xs">{v.note || "—"}</span> },
      ]}
    />
  );
}

const ReadyLine = ({ ok, children }) => (
  <li className={cn("flex items-start gap-2 rounded-xl px-3 py-2 text-sm", ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800")}>
    {ok ? <CheckCircle2 size={16} className="mt-0.5 shrink-0" /> : <XCircle size={16} className="mt-0.5 shrink-0" />}
    <span className="min-w-0">{children}</span>
  </li>
);

// A readiness entry may be a code or an object naming the till.
const tillText = (x) => (typeof x === "object" && x ? `${x.code ?? x.till_code ?? ""}${x.user_name ? ` (${x.user_name})` : ""}` : String(x));

const codeOf = (x) => (typeof x === "object" && x ? (x.code ?? x.till_code) : x);

// A branch's end of day: the readiness checklist, cash position, tills,
// vault counts, differences, transactions and transfers of the day; a vault
// custodian closes the day once everything is ready (no more till work there
// until it is reopened, with a reason, or the next day starts).
export function EndOfDay() {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const branches = branchOptions(useCoreBanking(scope), { openOnly: true });
  // The user's own branch first (from the sign-in), else the first open one.
  const home = useAuth((x) => x.user?.branch?.branch_id);
  const [branch, setBranch] = useState(home ? String(home) : "");
  const [date, setDate] = useState(platformToday());
  const [report, setReport] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const [proof, setProof] = useState(null);
  const branchId = branch || branches[0]?.value || "";
  const load = useCallback(() => {
    if (!branchId) return;
    setReport(null);
    tellerApi
      .eod_report(scope({ branch_id: Number(branchId), ...(date ? { date } : {}) }))
      .then((r) => setReport(recordOf(r) ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setReport({});
      });
  }, [branchId, date, scope]);
  useEffect(() => {
    load();
  }, [load]);
  const act = async (verb, body = {}) => {
    setBusy(true);
    try {
      const r = await tellerApi[verb](scope({ branch_id: Number(branchId), ...body }));
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      setReport(recordOf(r) ?? report);
    } catch (e) {
      notifications.error(e.message);
      setDialog(null);
      load();
    } finally {
      setBusy(false);
    }
  };
  const ready = report?.readiness ?? {};
  const closed = report?.status === "CLOSED";
  const isToday = !date || date === platformToday();
  const cashOf = (code) => (report?.cash ?? []).find((c) => c.code === code);
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-64">
          <Field field={{ type: "select", options: branches.length ? branches : [{ value: "", label: t("noBranches") }] }} value={branchId} onChange={setBranch} />
        </div>
        <DateInput className={cn(inputClass, "w-44")} value={date} max={platformToday()} onChange={(e) => setDate(e.target.value)} />
        {branchId && (
          <span className="ml-auto flex items-center gap-2 text-xs font-semibold text-muted-foreground">
            {t("branchTrialBalance")}
            <ExportButtons formats={["XLSX", "CSV"]} exportFile={(format) => glReportsApi.trialBalanceExport({ branch_id: Number(branchId), ...(date ? { as_of: date } : {}), format })} />
          </span>
        )}
      </div>
      {!branchId ? (
        <EmptyNote>{t("noBranches")}</EmptyNote>
      ) : !report ? (
        <PageSkeleton />
      ) : (
        <>
          <div
            className={cn("flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4", closed ? "border-slate-300 bg-slate-50" : "border-emerald-200 bg-emerald-50")}
            data-tour="eod-status"
          >
            <div className="text-sm">
              <p className="font-black">
                {report.branch_code} · {report.branch_name} · {report.business_date}: {t(closed ? "dayClosed" : "dayOpen")}
              </p>
              {closed && <p className="text-xs">{t("dayClosedBy", { name: report.closed_by, date: accountDate(report.closed_at) })}</p>}
              {report.snapshot && <p className="text-xs font-semibold">{t("reportAsAtClose", { date: accountDate(report.closed_at) })}</p>}
              {report.reopen_reason && <p className="text-xs">{t("dayReopenedBy", { name: report.reopened_by, date: accountDate(report.reopened_at), reason: report.reopen_reason })}</p>}
            </div>
            {can("Self") && isToday && (
              <ActionButtons
                busy={busy}
                buttons={[
                  closed && { key: "reopen", label: t("reopenDay"), icon: Unlock, run: () => setDialog("reopen") },
                  !closed && { key: "close", label: t("closeDay"), icon: LockKeyhole, variant: "danger", disabled: !ready.ready, run: () => setDialog("close") },
                ]}
              />
            )}
          </div>
          {!closed && (
            <Section title={t("readiness")}>
              <ul className="grid gap-1.5" data-tour="eod-readiness">
                <ReadyLine ok={!(ready.open_tills ?? []).length}>
                  <b>{t("checkTills")}</b>
                  {(ready.open_tills ?? []).length > 0 && <span className="block text-xs">{ready.open_tills.map(tillText).join(", ")}</span>}
                </ReadyLine>
                <ReadyLine ok={!Number(ready.transfers_pending)}>
                  <b>{t("checkTransfers")}</b>
                  {Number(ready.transfers_pending) > 0 && <span className="block text-xs">{t("transfersPendingN", { count: Number(ready.transfers_pending) })}</span>}
                </ReadyLine>
                <ReadyLine ok={!ready.cash_over_limit}>
                  <b>{t("checkCashLimit")}</b>
                  {ready.cash_over_limit && (
                    <span className="block text-xs">
                      {t("cashOverLimit", { amount: money(ready.cash_over_limit.excess, ready.cash_over_limit.currency) })} <MenuLink slug="treasury" label={t("openTreasury")} />
                    </span>
                  )}
                </ReadyLine>
                <ReadyLine ok={!(ready.vaults_not_counted ?? []).length}>
                  <b>{t("checkVaults")}</b>
                  {(ready.vaults_not_counted ?? []).map((x) => {
                    const v = cashOf(codeOf(x));
                    return (
                      <span key={String(codeOf(x))} className="mt-1 flex items-center gap-2 text-xs">
                        {codeOf(x)}
                        {v && can("Self") && (
                          <Button size="sm" variant="outline" icon={Calculator} onClick={() => setDialog({ vault: { id: v.till_id, code: v.code, name: v.name, balance: v.balance, currency: v.currency } })}>
                            {t("countVault")}
                          </Button>
                        )}
                      </span>
                    );
                  })}
                </ReadyLine>
              </ul>
            </Section>
          )}
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title={t("cashPosition")}>
              <MiniTable
                rows={report.cash ?? []}
                rowKey={(c) => c.till_id}
                empty={t("noTills")}
                columns={[
                  { key: "code", label: t("till"), render: (c) => <span className="text-xs"><b className="font-mono">{c.code}</b> · {c.name}</span> },
                  { key: "kind", label: t("kind"), render: (c) => <span className="text-xs">{kindLabel(t, c.kind)}</span> },
                  { key: "balance", label: t("balance"), align: "right", render: (c) => <b className="tabular-nums">{money(c.balance, c.currency)}</b> },
                ]}
              />
              {(report.cash_totals ?? []).map((x) => (
                <p key={x.currency} className="mt-2 text-right text-xs">
                  {t("cashTotals", { tills: money(x.tills, x.currency), vaults: money(x.vaults, x.currency) })} · <b>{money(x.total, x.currency)}</b>
                </p>
              ))}
            </Section>
            <Section title={t("differences")}>
              <MiniTable
                rows={report.variance_totals ?? []}
                rowKey={(x) => x.currency}
                empty={t("noDifferences")}
                columns={[
                  { key: "currency", label: t("currency") },
                  { key: "tills", label: t("tills"), align: "right", render: (x) => <Variance value={x.tills} currency={x.currency} /> },
                  { key: "vaults", label: t("vaults"), align: "right", render: (x) => <Variance value={x.vaults} currency={x.currency} /> },
                  { key: "total", label: t("total"), align: "right", render: (x) => <Variance value={x.total} currency={x.currency} /> },
                ]}
              />
              <p className="mt-3 text-xs text-muted-foreground">
                {t("transfersToday", {
                  completed: report.transfers?.completed ?? 0,
                  rejected: report.transfers?.rejected ?? 0,
                  cancelled: report.transfers?.cancelled ?? 0,
                  pending: report.transfers?.pending ?? 0,
                })}
              </p>
            </Section>
          </div>
          <Section title={t("tillsToday")}>
            <MiniTable
              rows={report.sessions ?? []}
              rowKey={(x) => x.session_id}
              empty={t("noSessions")}
              columns={[
                { key: "till_code", label: t("till"), render: (x) => <b className="font-mono text-xs">{x.till_code}</b> },
                { key: "user_name", label: t("teller"), render: (x) => <span className="text-xs">{x.user_name}</span> },
                { key: "opened_at", label: t("opened"), render: (x) => <span className="text-xs">{accountDate(x.opened_at)}</span> },
                { key: "closed_at", label: t("closed"), render: (x) => <span className="text-xs">{x.closed_at ? accountDate(x.closed_at) : "—"}</span> },
                { key: "opening_counted", label: t("openingCount"), align: "right", render: (x) => money(x.opening_counted, x.currency) },
                { key: "expected", label: t("expected"), align: "right", render: (x) => money(x.expected, x.currency) },
                { key: "counted", label: t("closingCount"), align: "right", render: (x) => money(x.counted, x.currency) },
                { key: "variance", label: t("variance"), align: "right", render: (x) => <Variance value={x.variance} currency={x.currency} /> },
                { key: "status", label: t("status"), render: (x) => <span className="text-xs font-semibold">{t(`sessionStatus_${x.status}`, { defaultValue: x.status })}</span> },
                {
                  key: "proof",
                  label: "",
                  render: (x) => (
                    <LinkButton onClick={() => setProof({ till: { id: x.till_id, code: x.till_code }, sessionId: x.session_id })}>
                      {t("proofSheet")}
                    </LinkButton>
                  ),
                },
              ]}
            />
          </Section>
          <div className="grid gap-4 lg:grid-cols-2">
            <Section title={t("vaultCountsToday")}>
              <MiniTable
                rows={report.vault_counts ?? []}
                rowKey={(v) => v.id}
                empty={t("noVaultCounts")}
                columns={[
                  { key: "till_code", label: t("till"), render: (v) => <b className="font-mono text-xs">{v.till_code}</b> },
                  { key: "counted_by", label: t("countedBy"), render: (v) => <span className="text-xs">{v.counted_by} · {accountDate(v.counted_at)}</span> },
                  { key: "counted", label: t("counted"), align: "right", render: (v) => money(v.counted, v.currency) },
                  { key: "variance", label: t("variance"), align: "right", render: (v) => <Variance value={v.variance} currency={v.currency} /> },
                ]}
              />
            </Section>
            <Section title={t("transactionsToday")}>
              <MiniTable
                rows={report.transactions ?? []}
                rowKey={(x) => `${x.txn_type}-${x.currency}`}
                empty={t("noMovements")}
                columns={[
                  { key: "name", label: t("movement"), render: (x) => <span className="text-xs font-semibold">{x.name ?? x.txn_type}</span> },
                  { key: "count", label: t("count"), align: "right" },
                  { key: "debits", label: t("debits"), align: "right", render: (x) => money(x.debits, x.currency) },
                  { key: "credits", label: t("credits"), align: "right", render: (x) => money(x.credits, x.currency) },
                ]}
              />
            </Section>
          </div>
        </>
      )}
      {dialog === "close" && (
        <NarrationDialog title={t("closeDay")} hint={t("closeDayHint")} confirmLabel={t("closeDay")} variant="danger" busy={busy} label={t("noteOptional")} onClose={() => setDialog(null)} onSave={() => act("day_close")} />
      )}
      {dialog === "reopen" && (
        <NarrationDialog title={t("reopenDay")} hint={t("reopenDayHint")} label={t("reason")} confirmLabel={t("reopenDay")} required busy={busy} onClose={() => setDialog(null)} onSave={(reason) => act("day_reopen", { reason })} />
      )}
      {dialog?.vault && (
        <CountDialog
          verb="vault"
          till={dialog.vault}
          onClose={() => setDialog(null)}
          onDone={() => {
            setDialog(null);
            load();
          }}
        />
      )}
      {proof && <ProofSheet till={proof.till} sessionId={proof.sessionId} onClose={() => setProof(null)} />}
    </div>
  );
}

// A vault custodian gives cash to an open till of the branch; the teller
// accepts (or rejects) it. The cash is set aside in the vault at once.
export function IssueDialog({ vault, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [tills, setTills] = useState(null);
  const [form, setForm] = useState({ to_till_id: "", amount: "", reference: newSlip(vault), narration: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    tellerApi
      .list(scope({ branch_id: vault.branch_id, kind: "TILL" }))
      .then((r) => setTills((Array.isArray(r?.data) ? r.data : []).filter((x) => x.session && x.currency === vault.currency)))
      .catch(() => setTills([]));
  }, [scope, vault.branch_id, vault.currency]);
  const ready = form.to_till_id && Number(form.amount) > 0 && form.reference;
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const r = await tellerApi.transfer_request(scope({ kind: "ISSUE", to_till_id: Number(form.to_till_id), amount: form.amount, reference: form.reference, narration: form.narration.trim() }));
      if (r?.message) notifications.success(r.message);
      onDone();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t("giveCash")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} disabledReason={t("common:blockedFillRequired")} onClick={() => void save()}>
            {t("giveCash")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t("giveCashHint", { code: vault.code })}</p>
        <label className={labelClass}>
          {t("receivingTill")}
          <Field
            field={{
              type: "select",
              blank: tills?.length ? t("choose") : t("noOpenTills"),
              options: (tills ?? []).map((x) => ({ value: String(x.id), label: `${x.code} · ${sessionOwner(x.session)}` })),
            }}
            value={form.to_till_id}
            onChange={(v) => setForm((f) => ({ ...f, to_till_id: v }))}
          />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("amountIn", { currency: vault.currency })}
            <AmountInput className={cn(inputClass, "mt-1.5")} value={form.amount} onChange={(amount) => setForm((f) => ({ ...f, amount }))} />
          </label>
          <label className={labelClass}>
            {t("slipReference")}
            <input className={cn(inputClass, "mt-1.5 font-mono")} value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: slipReference(e.target.value) }))} />
          </label>
        </div>
        <label className={labelClass}>
          {t("narration")}
          <input className={cn(inputClass, "mt-1.5")} maxLength={200} value={form.narration} onChange={(e) => setForm((f) => ({ ...f, narration: e.target.value }))} />
        </label>
        {error && <p className="text-xs font-semibold text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}
