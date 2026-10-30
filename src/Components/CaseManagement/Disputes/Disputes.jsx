import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Plus, Scale } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { TxnDialog } from "@/Components/Finance/Accounts/AccountStatement";
import { AdjustmentForm, TxnCard } from "@/Components/Finance/BalanceAdjustments/BalanceAdjustments";
import { money } from "@/Components/Finance/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { disputeCasesApi } from "@/Services/CaseManagement/disputeCases.api";
import { balanceAdjustmentsApi } from "@/Services/TermDeposits/termDeposits.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { CaseQueue, SUPPORT_QUEUE } from "../OnboardingCases/OnboardingCases";

const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";
const labelClass = "block text-xs font-bold text-foreground";
const PRIORITIES = ["LOW", "NORMAL", "HIGH"];

// CASE MANAGEMENT > Disputes (menu 204): Customer Cases about one
// transaction. The list adds the RRN; a case shows its transaction on top,
// with Make adjustment when the backend allows it; closing asks the outcome.
export const DISPUTE_QUEUE = {
  ...SUPPORT_QUEUE,
  kind: "dispute",
  api: disputeCasesApi,
  categories: undefined,
  outcomes: ["RESOLVED", "REJECTED", "ADJUSTED"],
  closeOutcomes: ["RESOLVED", "REJECTED"],
  titleKey: "disputesTitle",
  subtitleKey: "disputesSubtitle",
  emptyHintKey: "noDisputesHint",
  columns: (t) => [{ key: "rrn", label: t("rrn"), render: (c) => <RrnLink rrn={c.rrn} /> }],
  HeaderAction: RaiseDisputeButton,
  TopPanel: DisputeTransaction,
};

export function Disputes() {
  return <CaseQueue config={DISPUTE_QUEUE} />;
}

function RrnLink({ rrn }) {
  const [open, setOpen] = useState(false);
  if (!rrn) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="font-mono text-xs font-bold text-primary hover:underline">
        {rrn}
      </button>
      {open && <TxnDialog rrn={rrn} onClose={() => setOpen(false)} />}
    </>
  );
}

function RaiseDisputeButton({ onOpened }) {
  const { t } = useTranslation("cases");
  const can = usePagePermission();
  const [open, setOpen] = useState(false);
  if (!can("Add")) return null;
  return (
    <>
      <Button size="sm" icon={Plus} onClick={() => setOpen(true)}>
        {t("raiseDispute")}
      </Button>
      {open && (
        <RaiseDisputeDialog
          onClose={() => setOpen(false)}
          onSaved={(id) => {
            setOpen(false);
            if (id) onOpened(id);
          }}
        />
      )}
    </>
  );
}

// Staff raise a dispute: the transaction's RRN, a title, what happened, the
// priority and, optionally, a first message to the customer.
function RaiseDisputeDialog({ onClose, onSaved }) {
  const { t } = useTranslation("cases");
  const [form, setForm] = useState({ rrn: "", title: "", reason: "", priority: "NORMAL", message: "", party_acct_num: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const ready = form.rrn.trim() && form.title.trim() && form.reason.trim();
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await disputeCasesApi.open({ ...form, rrn: form.rrn.trim(), title: form.title.trim(), reason: form.reason.trim(), message: form.message.trim(), party_acct_num: form.party_acct_num.trim() });
      notifications.success(response?.message ?? t("disputeRaised"));
      onSaved(rowsOf(response)[0]?.id);
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
      title={t("raiseDispute")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={!ready} loading={busy} onClick={save}>
            {t("raiseDispute")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("rrn")} <span className="text-red-500">*</span>
            <input className={cn(inputClass, "font-mono")} value={form.rrn} onChange={(e) => setForm((f) => ({ ...f, rrn: e.target.value.replace(/\s/g, "") }))} placeholder="629214001843" />
          </label>
          <label className={labelClass}>
            {t("priority")}
            <select className={inputClass} value={form.priority} onChange={set("priority")}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(`priority_${p}`, { defaultValue: p })}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={labelClass}>
          {t("caseTitle")} <span className="text-red-500">*</span>
          <input className={inputClass} maxLength={200} value={form.title} onChange={set("title")} placeholder={t("disputeTitlePlaceholder")} />
        </label>
        <label className={labelClass}>
          {t("whatHappened")} <span className="text-red-500">*</span>
          <textarea className={cn(inputClass, "min-h-20")} maxLength={4000} value={form.reason} onChange={set("reason")} />
        </label>
        <label className={labelClass}>
          {t("customerMessage")}
          <textarea dir="auto" className={cn(inputClass, "min-h-16")} maxLength={4000} value={form.message} onChange={set("message")} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("disputeMessageHint")}</span>
        </label>
        <label className={labelClass}>
          {t("disputingAccount")}
          <input className={cn(inputClass, "font-mono")} value={form.party_acct_num} onChange={(e) => setForm((f) => ({ ...f, party_acct_num: e.target.value.replace(/\s/g, "") }))} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("disputingAccountHint")}</span>
        </label>
        {error && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</p>}
      </div>
    </Modal>
  );
}

// Above a dispute's tabs: its transaction, how it was settled, and Make
// adjustment (when `actions.adjust`), which opens the adjustment at step 2.
function DisputeTransaction({ kase, onChanged }) {
  const { t } = useTranslation("cases");
  const [found, setFound] = useState(null);
  const [error, setError] = useState("");
  const [adjusting, setAdjusting] = useState(false);
  const load = useCallback(() => {
    balanceAdjustmentsApi
      .lookup({ dispute_case_id: kase.id })
      .then((r) => setFound(rowsOf(r)[0] ?? null))
      .catch((e) => setError(e.message));
  }, [kase.id]);
  useEffect(() => {
    load();
  }, [load, kase.status]);

  const settled = kase.outcome === "ADJUSTED" ? (kase.timeline ?? []).find((e) => e.event === "CLOSED")?.data : null;
  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-black">
          <Scale size={16} className="text-primary" /> {t("disputedTransaction")}
        </p>
        {kase.actions?.adjust && (
          <Button size="sm" icon={Scale} onClick={() => setAdjusting(true)}>
            {t("makeAdjustment")}
          </Button>
        )}
      </div>
      {settled && (
        <p className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 size={14} />
          {t("settledByAdjustment", { rrn: settled.adjustment_rrn, amount: money(settled.amount, settled.currency) })}
        </p>
      )}
      {found?.transaction ? (
        <TxnCard tx={found.transaction} />
      ) : error ? (
        <p className="text-xs text-red-700">{error}</p>
      ) : (
        <Spinner size={16} />
      )}
      {adjusting && (
        <AdjustmentForm
          disputeId={kase.id}
          onClose={() => setAdjusting(false)}
          onSaved={() => {
            setAdjusting(false);
            load();
            onChanged();
          }}
        />
      )}
    </div>
  );
}
