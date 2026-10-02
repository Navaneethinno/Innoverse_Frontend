import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, Eye, Plus, RefreshCw, Scale, Search, XCircle } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Spinner } from "@/Components/Common/Spinner";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { DrCr, TxnDialog } from "@/Components/Epurse/Accounts/AccountStatement";
import { AccountClass, accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { accountsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { balanceAdjustmentsApi } from "@/Services/TermDeposits/termDeposits.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Facts, NarrationDialog, Problems, amountInput, inputClass, labelClass } from "../depositShared";

const STATUSES = ["PENDING", "APPROVED", "REJECTED", "CANCELLED"];

// EPURSE > Balance Adjustments (menu 182): staff credit or debit a
// customer's or merchant's wallet (cash at a counter, a correction). The
// money moves when a checker approves, or at once for Self users.
export function BalanceAdjustments() {
  const { t } = useTranslation(["deposits", "common"]);
  const can = usePagePermission();
  const [status, setStatus] = useState("");
  const [acctNum, setAcctNum] = useState("");
  const [applied, setApplied] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [viewing, setViewing] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const row = rowsOf(await balanceAdjustmentsApi.list({ page, page_size: limit, ...(status ? { status } : {}), ...(applied ? { acct_num: applied } : {}) }))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [status, applied, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);

  // auth / deauth / cancel: the reply is the adjustment.
  const act = async (verb, adjustment, narration) => {
    setBusy(true);
    try {
      const response = await balanceAdjustmentsApi[verb]({ id: adjustment.id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      setViewing((v) => (v ? (rowsOf(response)[0] ?? v) : v));
      void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const rowButtons = (a) => [
    a.actions?.auth && can("Authorize") && { key: "auth", intent: "auth", icon: CheckCircle2 },
    a.actions?.deauth && can("Authorize") && { key: "deauth", intent: "deauth", icon: XCircle },
    a.actions?.cancel && can("Add") && { key: "cancel", intent: "delete", icon: Ban },
  ].filter(Boolean);

  const columns = [
    { key: "requested_at", label: t("requestedAt"), render: (a) => <span className="whitespace-nowrap text-xs">{accountDate(a.requested_at)}</span> },
    {
      key: "acct_num",
      label: t("wallet"),
      align: "left",
      render: (a) => (
        <div>
          <p className="font-mono text-xs font-bold">{a.acct_num}</p>
          <p className="text-[10px] text-muted-foreground">{a.owner_name || "—"}</p>
        </div>
      ),
    },
    { key: "operation_type", label: t("accounts:drCr"), render: (a) => <DrCr type={a.operation_type} /> },
    { key: "amount", label: t("amount"), render: (a) => <span className="whitespace-nowrap text-xs font-bold tabular-nums">{money(a.amount, a.currency_code)}</span> },
    { key: "reason", label: t("reason"), align: "left", render: (a) => <span className="line-clamp-2 text-xs">{a.reason}</span> },
    { key: "status", label: t("status"), render: (a) => <StatusBadge status={a.status} variant="subtle" /> },
    { key: "requested_by", label: t("requestedBy"), render: (a) => <span className="text-xs">{a.requested_userid_name ?? a.requested_by ?? "—"}</span> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (a) => (
        <div className="flex items-center justify-center gap-1">
          <ActionIconButton label={t("view")} intent="view" icon={Eye} onClick={() => setViewing(a)} />
          {rowButtons(a).map((b) => (
            <ActionIconButton key={b.key} label={t(`adj_${b.key}`)} intent={b.intent} icon={b.icon} onClick={() => setDialog({ verb: b.key, adjustment: a })} />
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Scale size={22} className="text-primary" /> {t("adjTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("adjSubtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setAdding(true)}>
              {t("newAdjustment")}
            </Button>
          )}
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setApplied(acctNum.trim());
          setPage(1);
        }}
        className="mb-4 grid gap-3 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_1fr_auto]"
      >
        <input className={inputClass} placeholder={t("walletNumber")} value={acctNum} onChange={(e) => setAcctNum(e.target.value.replace(/\s/g, ""))} />
        <FilterSelect
          value={status}
          onChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
          options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map((s) => ({ value: s, label: t(`adjStatus_${s}`) }))]}
        />
        <Button type="submit" size="sm" icon={Search}>
          {t("search")}
        </Button>
      </form>

      <DataTable
        columns={columns}
        rows={data.items}
        rowKey={(a) => a.id}
        isLoading={loading}
        title={t("adjTitle")}
        emptyTitle={t("noAdjustments")}
        emptyDescription={t("noAdjustmentsHint")}
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

      {adding && (
        <AdjustmentForm
          onClose={() => setAdding(false)}
          onSaved={() => {
            setAdding(false);
            void load();
          }}
        />
      )}
      {viewing && <AdjustmentDetail adjustment={viewing} buttons={rowButtons(viewing)} onAction={(verb) => setDialog({ verb, adjustment: viewing })} onClose={() => setViewing(null)} />}
      {dialog && (
        <NarrationDialog
          title={t(`adj_${dialog.verb}`)}
          hint={t(`adjHint_${dialog.verb}`, { amount: money(dialog.adjustment.amount, dialog.adjustment.currency_code), account: dialog.adjustment.acct_num })}
          confirmLabel={t(`adj_${dialog.verb}`)}
          variant={dialog.verb === "auth" ? "primary" : "danger"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog.verb, dialog.adjustment, narration)}
        />
      )}
    </div>
  );
}

function AdjustmentDetail({ adjustment: a, buttons, onAction, onClose }) {
  const { t } = useTranslation(["deposits", "accounts"]);
  const [txn, setTxn] = useState(false);
  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t("adjustmentN", { id: a.id })}
      subtitle={a.owner_name}
      footer={
        buttons.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {buttons.map((b) => (
              <Button key={b.key} size="sm" icon={b.icon} variant={b.key === "auth" ? "primary" : b.key === "deauth" ? "danger" : "secondary"} onClick={() => onAction(b.key)}>
                {t(`adj_${b.key}`)}
              </Button>
            ))}
          </div>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <p className={cn("text-2xl font-black tabular-nums", a.operation_type === "CR" ? "text-emerald-700" : "text-red-700")}>
          {a.operation_type === "CR" ? "+" : "−"}
          {money(a.amount, a.currency_code)}
        </p>
        <StatusBadge status={a.status} />
      </div>
      <Facts
        rows={[
          [t("wallet"), <span key="w" className="font-mono">{a.acct_num}</span>],
          [t("reason"), a.reason],
          [t("reference"), a.reference || "—"],
          [t("requestedBy"), `${a.requested_userid_name ?? a.requested_by ?? "—"} · ${accountDate(a.requested_at)}`],
          a.decided_by && [t("decidedBy"), `${a.decided_by} · ${accountDate(a.decided_at)}`],
          a.decision_narration && [t("narration"), a.decision_narration],
          a.balance_after != null && [t("balanceAfter"), money(a.balance_after, a.currency_code)],
          a.inst_profile_name && [t("institution"), a.inst_profile_name],
        ]}
      />
      {a.txn_id && (
        <Button variant="outline" size="sm" className="mt-4" onClick={() => setTxn(true)}>
          {t("viewTxnRrn", { rrn: a.rrn })}
        </Button>
      )}
      {txn && <TxnDialog txnId={a.txn_id} onClose={() => setTxn(false)} />}
    </Modal>
  );
}

// New adjustment: the wallet is looked up by number first, so staff see
// whose it is and its balance before crediting or debiting it.
function AdjustmentForm({ onClose, onSaved }) {
  const { t } = useTranslation(["deposits", "accounts"]);
  const [acctNum, setAcctNum] = useState("");
  const [account, setAccount] = useState(null);
  const [looking, setLooking] = useState(false);
  const [form, setForm] = useState({ operation_type: "CR", amount: "", reason: "", reference: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const lookup = async () => {
    if (!acctNum) return;
    setLooking(true);
    setError("");
    try {
      const found = rowsOf(await accountsApi.get({ acct_num: acctNum }))[0] ?? null;
      setAccount(found);
      if (found?.acct_class === "DEPOSIT") setError(t("notAWallet"));
    } catch (e) {
      setAccount(null);
      setError(e.message);
    } finally {
      setLooking(false);
    }
  };

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const wallet = account && account.acct_class !== "DEPOSIT";
  const debitTooBig = wallet && form.operation_type === "DR" && Number(form.amount) > Number(account.avail_bal ?? 0);
  const ready = wallet && Number(form.amount) > 0 && form.reason.trim() && !debitTooBig;

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await balanceAdjustmentsApi.add({ acct_id: account.id, ...form });
      notifications.success(response?.message ?? t("adjustmentSaved"));
      onSaved();
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
      size="md"
      title={t("newAdjustment")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button disabled={!ready} loading={busy} onClick={save}>
            {t("submitAdjustment")}
          </Button>
        </>
      }
    >
      <p className="mb-4 text-sm text-muted-foreground">{t("adjFormHint")}</p>
      <label className={labelClass}>{t("walletNumber")}</label>
      <div className="mb-3 mt-1.5 flex gap-2">
        <input
          className={inputClass}
          value={acctNum}
          onChange={(e) => {
            setAcctNum(e.target.value.replace(/\s/g, ""));
            setAccount(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && void lookup()}
          placeholder="20784000000021"
        />
        <Button variant="outline" size="sm" icon={Search} loading={looking} disabled={!acctNum} onClick={lookup}>
          {t("find")}
        </Button>
      </div>
      {account && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2">
          <div>
            <p className="text-sm font-bold text-foreground">{account.owner?.name || "—"}</p>
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              {account.acct_product_name} <AccountClass value={account.acct_class} />
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t("accounts:availBal")}</p>
            <p className="text-sm font-black tabular-nums">{money(account.avail_bal, account.currency_code)}</p>
          </div>
        </div>
      )}
      {looking && <Spinner size={14} />}
      {wallet && (
        <div className="grid gap-3">
          <SegmentedSwitch
            value={form.operation_type}
            onChange={set("operation_type")}
            options={[
              { value: "CR", label: t("creditWallet") },
              { value: "DR", label: t("debitWallet") },
            ]}
          />
          <label className={labelClass}>
            {t("amountIn", { currency: account.currency_code })}
            <input className={cn(inputClass, "mt-1.5 tabular-nums")} inputMode="decimal" value={form.amount} onChange={(e) => set("amount")(amountInput(e.target.value))} placeholder="0.00" />
            {debitTooBig && <span className="mt-1 block text-[11px] font-semibold text-red-700">{t("debitTooBig")}</span>}
          </label>
          <label className={labelClass}>
            {t("reason")}
            <input className={cn(inputClass, "mt-1.5")} maxLength={200} value={form.reason} onChange={(e) => set("reason")(e.target.value)} placeholder={t("reasonPlaceholder")} />
          </label>
          <label className={labelClass}>
            {t("referenceOptional")}
            <input className={cn(inputClass, "mt-1.5")} maxLength={60} value={form.reference} onChange={(e) => set("reference")(e.target.value)} placeholder={t("referencePlaceholder")} />
          </label>
        </div>
      )}
      {error && <div className="mt-3"><Problems message={error} /></div>}
    </Modal>
  );
}
