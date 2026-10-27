import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { CheckCircle2, FileCheck2, FileWarning, Pencil, Plus, RefreshCw, Send, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { AccountPick } from "@/Components/Finance/coreBankingShared";
import { ActionButtons, Facts, NarrationDialog, Section, inputClass, labelClass } from "@/Components/Finance/Deposits/depositShared";
import { Field, MiniTable, Tabs, useInstitutionScope } from "@/Components/Finance/Loans/loanShared";
import { ExportButtons } from "@/Components/Reports/Shared/reportShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { amlReportsApi } from "@/Services/InnoAML/aml.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { TxnTable } from "../Monitoring/TransactionMonitoring";

const MIN_GROUNDS = 20;
const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : []);

// InnoAML › Regulatory Reports (menu 200): suspicious transaction reports
// (drafted from alerts or by hand, approved by another user, recorded as
// filed with the regulator's reference) and the nightly currency
// transaction reports. Both download as Excel or CSV for the regulator.
export function RegulatoryReports() {
  const { t } = useTranslation("regReports");
  const location = useLocation();
  const [tab, setTab] = useState("str");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5" data-tour="page-title">
        <PageTitle icon={FileWarning}>{t("title")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Tabs tabs={[{ key: "str" }, { key: "ctr" }]} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />
      {tab === "str" ? <StrList openId={location.state?.str} /> : <CtrList />}
    </div>
  );
}

// ---------------------------------------------------------------- STR

function StrList({ openId }) {
  const { t } = useTranslation("regReports");
  const can = usePagePermission();
  const [filters, setFilters] = useState({ status: "", search: "" });
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(openId ?? null);
  const [adding, setAdding] = useState(false);
  const body = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);
  const load = useCallback(
    () =>
      amlReportsApi.str
        .list(body)
        .then((r) => setRows(rowsOf(r)))
        .catch((e) => {
          setRows([]);
          notifications.error(e.message);
        }),
    [body],
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-48">
          <Field
            field={{ type: "select", blank: t("anyStatus"), options: ["DRAFT", "PENDING_APPROVAL", "REJECTED", "APPROVED", "FILED"].map((v) => ({ value: v, label: t(`str_${v}`) })) }}
            value={filters.status}
            onChange={(status) => setFilters((f) => ({ ...f, status }))}
          />
        </div>
        <input className={cn(inputClass, "w-56")} placeholder={t("searchStr")} value={filters.search} onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))} />
        {can("Add") && (
          <Button size="sm" icon={Plus} className="ml-auto" onClick={() => setAdding(true)} data-tour="add">
            {t("newStr")}
          </Button>
        )}
      </div>
      {!rows ? (
        <PageSkeleton />
      ) : (
        <MiniTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={t("noStr")}
          columns={[
            {
              key: "reference",
              label: t("reference"),
              render: (r) => (
                <button type="button" className="font-mono text-xs font-bold text-primary hover:underline" onClick={() => setOpen(r.id)}>
                  {r.reference}
                </button>
              ),
            },
            { key: "subject_name", label: t("subject"), render: (r) => <span className="text-xs font-semibold">{r.subject_name}</span> },
            { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} /> },
            { key: "total_amount", label: t("total"), render: (r) => <span className="text-xs tabular-nums">{r.total_amount}</span> },
            { key: "activity", label: t("activity"), render: (r) => <span className="text-xs">{[r.activity_from, r.activity_to].filter(Boolean).join(" – ") || "—"}</span> },
            { key: "prepared_by", label: t("preparedBy"), render: (r) => <span className="text-xs">{r.prepared_by}</span> },
            { key: "filing_reference", label: t("filedRef"), render: (r) => <span className="font-mono text-xs">{r.filing_reference || "—"}</span> },
          ]}
        />
      )}
      {open && <StrDetail id={open} onClose={() => setOpen(null)} onChanged={load} />}
      {adding && (
        <StrForm
          onClose={() => setAdding(false)}
          onSaved={(str) => {
            setAdding(false);
            void load();
            if (str?.id) setOpen(str.id);
          }}
        />
      )}
    </div>
  );
}

// One STR: its facts, transactions and timeline, and the steps the server
// allows (actions): edit, submit, approve / reject (another user), file.
function StrDetail({ id, onClose, onChanged }) {
  const { t } = useTranslation("regReports");
  const [str, setStr] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [editing, setEditing] = useState(false);
  const load = useCallback(
    () =>
      amlReportsApi.str
        .get({ id })
        .then((r) => setStr(recordOf(r)))
        .catch((e) => notifications.error(e.message)),
    [id],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const act = async (verb, body = {}) => {
    try {
      const r = await amlReportsApi.str[verb]({ id, ...body });
      if (r?.message) notifications.success(r.message);
      setDialog(null);
      setStr(recordOf(r) ?? str);
      onChanged();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const a = str?.actions ?? {};
  const short = str && (str.grounds ?? "").trim().length < MIN_GROUNDS;
  return (
    <Modal open size="xl" onClose={onClose} title={str ? `${str.reference} · ${str.subject_name}` : t("str")}>
      {!str ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={str.status} />
            <div className="flex flex-wrap items-center gap-2">
              <ActionButtons
                buttons={[
                  a.edit && { key: "edit", label: t("edit"), icon: Pencil, run: () => setEditing(true) },
                  a.submit && { key: "submit", label: t("submit"), icon: Send, variant: "primary", run: () => setDialog("submit") },
                  a.reject && { key: "reject", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
                  a.approve && { key: "approve", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
                  a.file && { key: "file", label: t("recordFiling"), icon: FileCheck2, variant: "primary", run: () => setDialog("file") },
                ]}
              />
              <ExportButtons formats={["XLSX", "CSV"]} exportFile={(format) => amlReportsApi.str.export({ id, reference: str.reference, format })} />
            </div>
          </div>
          {a.submit && short && <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{t("groundsTooShort", { count: MIN_GROUNDS })}</p>}
          <Facts
            rows={[
              [t("subject"), str.subject_name],
              [t("total"), str.total_amount, "font-black"],
              [t("activity"), [str.activity_from, str.activity_to].filter(Boolean).join(" – ") || "—"],
              [t("alerts"), (str.alert_ids ?? []).length || "—"],
              str.filing_reference && [t("filedRef"), str.filing_reference],
            ]}
          />
          <Section title={t("grounds")}>
            <p className="whitespace-pre-wrap text-sm">{str.grounds || "—"}</p>
            {str.action_taken && (
              <>
                <p className="mt-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">{t("actionTaken")}</p>
                <p className="whitespace-pre-wrap text-sm">{str.action_taken}</p>
              </>
            )}
          </Section>
          <Section title={t("timeline")}>
            <ol className="grid gap-1.5 text-sm">
              {[
                ["prepared", str.prepared_by, str.prepared_at],
                ["submitted", null, str.submitted_at],
                ["decided", str.decided_by, str.decided_at, str.decision_note],
                ["filed", str.filed_by, str.filed_at, str.filing_reference],
              ]
                .filter(([, , at]) => at)
                .map(([step, by, at, note]) => (
                  <li key={step} className="flex flex-wrap gap-x-2">
                    <b>{t(`step_${step}`)}</b>
                    <span className="text-muted-foreground">{[by, accountDate(at)].filter(Boolean).join(" · ")}</span>
                    {note && <span className="italic text-muted-foreground">{note}</span>}
                  </li>
                ))}
            </ol>
          </Section>
          <Section title={t("transactions")}>
            <TxnTable txns={str.txns ?? []} />
          </Section>
        </div>
      )}
      {dialog === "submit" && <NarrationDialog title={t("submit")} hint={t("submitHint")} confirmLabel={t("submit")} onClose={() => setDialog(null)} onSave={() => act("submit")} label={t("noteOptional")} />}
      {dialog === "auth" && <NarrationDialog title={t("approve")} hint={t("approveHint")} confirmLabel={t("approve")} onClose={() => setDialog(null)} onSave={(note) => act("auth", note ? { note } : {})} />}
      {dialog === "deauth" && <NarrationDialog title={t("reject")} hint={t("rejectHint")} confirmLabel={t("reject")} variant="danger" required onClose={() => setDialog(null)} onSave={(note) => act("deauth", { note })} />}
      {dialog === "file" && (
        <NarrationDialog
          title={t("recordFiling")}
          hint={t("recordFilingHint")}
          label={t("filingReference")}
          confirmLabel={t("recordFiling")}
          required
          onClose={() => setDialog(null)}
          onSave={(filing_reference) => act("record_filing", { filing_reference })}
        />
      )}
      {editing && (
        <StrForm
          str={str}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            setStr(next ?? str);
            onChanged();
          }}
        />
      )}
    </Modal>
  );
}

// A new STR (pick a customer's or merchant's account, then their
// transactions from its statement), or a draft's grounds and transactions.
function StrForm({ str, onClose, onSaved }) {
  const { t } = useTranslation("regReports");
  const { scope } = useInstitutionScope();
  const [account, setAccount] = useState(null);
  const [lines, setLines] = useState(null);
  const [txnIds, setTxnIds] = useState(() => new Set(str?.txn_ids ?? []));
  const [grounds, setGrounds] = useState(str?.grounds ?? "");
  const [actionTaken, setActionTaken] = useState(str?.action_taken ?? "");
  const [busy, setBusy] = useState(false);
  // The account's latest transactions, to pick from.
  useEffect(() => {
    if (!account) return;
    setLines(null);
    accountsApi
      .ledger({ acct_num: account.acct_num, page: 1, limit: 100 })
      .then((r) => setLines(recordOf(r)?.lines ?? []))
      .catch((e) => {
        setLines([]);
        notifications.error(e.message);
      });
  }, [account]);
  const toggle = (id) =>
    setTxnIds((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const owner = account?.owner;
  const ready = (str || owner) && txnIds.size > 0 && grounds.trim();
  const save = async () => {
    setBusy(true);
    try {
      const common = { txn_ids: [...txnIds], grounds: grounds.trim(), action_taken: actionTaken.trim() };
      const r = str ? await amlReportsApi.str.edit({ id: str.id, ...common }) : await amlReportsApi.str.add({ entity_type: owner.kind, entity_id: owner.id, ...common });
      if (r?.message) notifications.success(r.message);
      onSaved(recordOf(r));
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={str ? t("editStr", { reference: str.reference }) : t("newStr")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} onClick={() => void save()}>
            {t("saveDraft")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {!str && (
          <label className={labelClass}>
            {t("partyAccount")}
            <div className="mt-1.5">
              <AccountPick value={account} onChange={setAccount} scope={scope} filter={(a) => a.acct_class === "CUSTOMER"} />
            </div>
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("partyAccountHint")}</span>
          </label>
        )}
        {account && (
          <Section title={t("pickTransactions", { count: txnIds.size })}>
            {!lines ? (
              <PageSkeleton />
            ) : (
              <MiniTable
                rows={lines}
                rowKey={(l) => l.id}
                empty={t("noTxns")}
                columns={[
                  { key: "pick", label: "", render: (l) => <input type="checkbox" aria-label={t("pick")} checked={txnIds.has(l.txn_id)} onChange={() => toggle(l.txn_id)} /> },
                  { key: "tran_date_time", label: t("date"), render: (l) => <span className="text-xs">{accountDate(l.tran_date_time)}</span> },
                  { key: "txn_type", label: t("type"), render: (l) => <span className="text-xs font-semibold">{l.txn_short_desc ?? l.txn_type}</span> },
                  { key: "operation_type", label: t("drCr"), render: (l) => <span className="text-xs">{l.operation_type}</span> },
                  { key: "txn_amount", label: t("amount"), align: "right", render: (l) => <b className="tabular-nums">{money(l.txn_amount, l.currency_code)}</b> },
                  { key: "rrn", label: "RRN", render: (l) => <span className="font-mono text-xs">{l.rrn}</span> },
                ]}
              />
            )}
          </Section>
        )}
        {str && <p className="text-xs text-muted-foreground">{t("draftTxns", { count: txnIds.size })}</p>}
        <label className={labelClass}>
          {t("grounds")}
          <textarea className={cn(inputClass, "mt-1.5 min-h-32")} maxLength={20000} value={grounds} onChange={(e) => setGrounds(e.target.value)} />
          <span className={cn("mt-1 block text-[11px] font-normal", grounds.trim().length < MIN_GROUNDS ? "text-amber-700" : "text-muted-foreground")}>
            {t("groundsCount", { count: grounds.trim().length, min: MIN_GROUNDS })}
          </span>
        </label>
        <label className={labelClass}>
          {t("actionTaken")}
          <textarea className={cn(inputClass, "mt-1.5 min-h-20")} maxLength={5000} value={actionTaken} onChange={(e) => setActionTaken(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- CTR

function CtrList() {
  const { t } = useTranslation("regReports");
  const can = usePagePermission();
  const [filters, setFilters] = useState({ from: "", to: "", status: "", search: "" });
  const [rows, setRows] = useState(null);
  const [picked, setPicked] = useState(new Set());
  const [dialog, setDialog] = useState(null);
  const [genDate, setGenDate] = useState("");
  const body = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);
  const load = useCallback(
    () =>
      amlReportsApi.ctr
        .list(body)
        .then((r) => setRows(rowsOf(r)))
        .catch((e) => {
          setRows([]);
          notifications.error(e.message);
        }),
    [body],
  );
  useEffect(() => {
    setPicked(new Set());
    void load();
  }, [load]);
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const toggle = (id) =>
    setPicked((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const file = async (filing_reference) => {
    try {
      const r = recordOf(await amlReportsApi.ctr.record_filing({ ids: [...picked], filing_reference }));
      notifications.success(t("ctrFiled", { count: r?.filed ?? picked.size }));
      setDialog(null);
      setPicked(new Set());
      await load();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const generate = async () => {
    try {
      const r = recordOf(await amlReportsApi.ctr.generate(genDate ? { date: genDate } : {}));
      notifications.success(t("ctrGenerated", { count: r?.generated ?? 0, date: r?.business_date }));
      setDialog(null);
      await load();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">{t("ctrHint")}</p>
      <div className="flex flex-wrap items-end gap-2">
        <DateInput className={cn(inputClass, "w-40")} value={filters.from} onChange={(e) => set("from")(e.target.value)} />
        <DateInput className={cn(inputClass, "w-40")} value={filters.to} onChange={(e) => set("to")(e.target.value)} />
        <div className="w-40">
          <Field field={{ type: "select", blank: t("anyStatus"), options: ["GENERATED", "FILED"].map((v) => ({ value: v, label: t(`ctr_${v}`) })) }} value={filters.status} onChange={set("status")} />
        </div>
        <input className={cn(inputClass, "w-48")} placeholder={t("searchParty")} value={filters.search} onChange={(e) => set("search")(e.target.value)} />
        <div className="ml-auto flex flex-wrap gap-2">
          {can("Edit") && (
            <Button size="sm" icon={FileCheck2} disabled={!picked.size} onClick={() => setDialog("file")}>
              {t("recordFilingN", { count: picked.size })}
            </Button>
          )}
          {can("Add") && (
            <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => setDialog("generate")}>
              {t("generateAgain")}
            </Button>
          )}
          <ExportButtons formats={["XLSX", "CSV"]} exportFile={(format) => amlReportsApi.ctr.export({ ...body, format })} />
        </div>
      </div>
      {!rows ? (
        <PageSkeleton />
      ) : (
        <MiniTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={t("noCtr")}
          columns={[
            can("Edit") && {
              key: "pick",
              label: "",
              render: (r) => (r.status === "GENERATED" ? <input type="checkbox" aria-label={t("pick")} checked={picked.has(r.id)} onChange={() => toggle(r.id)} /> : null),
            },
            { key: "business_date", label: t("businessDate"), render: (r) => <span className="text-xs">{r.business_date}</span> },
            { key: "party_name", label: t("party"), render: (r) => <span className="text-xs font-semibold">{r.party_name}</span> },
            { key: "currency", label: t("currency") },
            { key: "cash_in", label: t("cashIn"), align: "right", render: (r) => <span className="tabular-nums">{money(r.cash_in, r.currency)}</span> },
            { key: "cash_out", label: t("cashOut"), align: "right", render: (r) => <span className="tabular-nums">{money(r.cash_out, r.currency)}</span> },
            { key: "txn_count", label: t("txns"), align: "right" },
            { key: "status", label: t("status"), render: (r) => <span className="text-xs font-semibold">{t(`ctr_${r.status}`, { defaultValue: r.status })}</span> },
            { key: "filing_reference", label: t("filedRef"), render: (r) => <span className="font-mono text-xs">{r.filing_reference || "—"}</span> },
          ].filter(Boolean)}
        />
      )}
      {dialog === "file" && (
        <NarrationDialog
          title={t("recordFilingN", { count: picked.size })}
          hint={t("recordFilingHint")}
          label={t("batchReference")}
          confirmLabel={t("recordFiling")}
          required
          onClose={() => setDialog(null)}
          onSave={file}
        />
      )}
      {dialog === "generate" && (
        <Modal
          open
          onClose={() => setDialog(null)}
          title={t("generateAgain")}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                {t("cancel")}
              </Button>
              <Button onClick={() => void generate()}>{t("generate")}</Button>
            </>
          }
        >
          <p className="mb-3 text-sm text-muted-foreground">{t("generateHint")}</p>
          <label className={labelClass}>
            {t("businessDate")}
            <DateInput className={cn(inputClass, "mt-1.5")} value={genDate} onChange={(e) => setGenDate(e.target.value)} />
          </label>
        </Modal>
      )}
    </div>
  );
}
