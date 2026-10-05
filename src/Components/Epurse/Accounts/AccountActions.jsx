import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, Lock, LockOpen, Power, RotateCcw, Snowflake, Trash2, UserPlus, XCircle } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { accountActionsApi, accountPartiesApi, accountStatementsApi } from "@/Services/Epurse/accounts.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, NarrationDialog, Problems, inputClass, labelClass } from "../../TermDeposits/depositShared";
import { MiniTable } from "../../Loans/loanShared";
import { accountDate, money } from "./accountShared";

// Account actions, parties and statements (Accounts handoffs 5 and 6).
// Every change is a request a second user approves (Self posts at once);
// the server decides what is allowed and says why when it is not.

const RESTRICTION_TONE = {
  FROZEN: "border-sky-200 bg-sky-50 text-sky-700",
  BLOCKED: "border-red-200 bg-red-50 text-red-700",
  DORMANT: "border-slate-300 bg-slate-100 text-slate-700",
  AWAITING_DEPOSIT: "border-amber-200 bg-amber-50 text-amber-800",
  AWAITING_ACTIVATION: "border-amber-200 bg-amber-50 text-amber-800",
};

// The account's restriction (FROZEN, BLOCKED, DORMANT, AWAITING_*), next to its status.
export function RestrictionBadge({ value }) {
  const { t } = useTranslation("accounts");
  if (!value) return null;
  return <span className={cn("whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-bold", RESTRICTION_TONE[value] ?? "border-border bg-muted text-muted-foreground")}>{t(`restriction_${value}`, { defaultValue: value })}</span>;
}

const ICONS = { FREEZE: Snowflake, UNFREEZE: LockOpen, BLOCK: Lock, UNBLOCK: LockOpen, CLOSE: Ban, REACTIVATE: RotateCcw, ACTIVATE: Power };

// What the account's state offers. The server still has the last word
// (the product's lifecycle rules, a zero balance before closing...).
function offeredActions(a) {
  if (Number(a.status) !== 1) return ["REACTIVATE"];
  switch (a.restriction) {
    case "FROZEN":
      return ["UNFREEZE", "BLOCK", "CLOSE"];
    case "BLOCKED":
      return ["UNBLOCK", "CLOSE"];
    case "DORMANT":
      return ["REACTIVATE", "CLOSE"];
    case "AWAITING_ACTIVATION":
      return ["ACTIVATE", "CLOSE"];
    case "AWAITING_DEPOSIT":
      return ["CLOSE"];
    default:
      return ["FREEZE", "BLOCK", "CLOSE"];
  }
}

const actionLabel = (t, request) => (request.action === "ADD_PARTY" || request.action === "REMOVE_PARTY" ? `${t(`action_${request.action}`)}${request.payload?.role ? ` · ${t(`role_${request.payload.role}`, { defaultValue: request.payload.role })}` : ""}${request.payload?.name ? ` · ${request.payload.name}` : ""}` : t(`action_${request.action}`, { defaultValue: request.action }));

// The action buttons, the open request (approve / reject / cancel) and the
// history of requests. `onChanged` reloads the account.
export function AccountRequests({ account, onChanged }) {
  const { t } = useTranslation(["accounts", "common"]);
  const can = usePagePermission();
  const own = useOwnIds();
  const [rows, setRows] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(rowsOf(await accountActionsApi.list({ acct_id: account.id, page: 1, limit: 50 })).flatMap((r) => r.items ?? r.requests ?? [r]));
    } catch (error) {
      notifications.error(error.message);
      setRows([]);
    }
  }, [account.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(accountActionsApi.listPath, () => void load());

  const act = async (call) => {
    setBusy(true);
    try {
      const response = await call();
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      await load();
      onChanged();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const pending = rows?.find((r) => r.status === "PENDING");
  const mine = pending && [String(own.userId), own.userName].includes(String(pending.requested_by));
  const buttons = !pending && can("Edit") ? offeredActions(account).map((code) => ({ key: code, label: t(`action_${code}`), icon: ICONS[code], variant: code === "CLOSE" || code === "BLOCK" ? "danger" : "secondary", run: () => setDialog({ kind: "add", action: code }) })) : [];

  return (
    <div className="grid gap-4">
      {buttons.length > 0 && <ActionButtons buttons={buttons} busy={busy} />}
      {pending && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-500/10">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-200">{t("pendingRequest")}</p>
          <p className="mt-1 text-sm font-bold text-foreground">{actionLabel(t, pending)}</p>
          <p className="text-xs text-muted-foreground">
            {pending.reason} · {pending.requested_by} · {accountDate(pending.requested_at)}
          </p>
          <div className="mt-3">
            <ActionButtons
              busy={busy}
              buttons={[
                can("Authorise") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog({ kind: "auth" }) },
                can("Authorise") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog({ kind: "deauth" }) },
                can("Edit") && mine && { key: "cancel", label: t("cancelRequest"), icon: XCircle, run: () => void act(() => accountActionsApi.cancel({ id: pending.id })) },
              ]}
            />
          </div>
        </div>
      )}

      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{t("requestHistory")}</p>
        {!rows ? (
          <Spinner size={14} />
        ) : (
          <MiniTable
            rows={rows}
            rowKey={(r) => r.id}
            empty={t("noRequests")}
            columns={[
              { key: "action", label: t("action"), render: (r) => <span className="text-xs font-semibold">{actionLabel(t, r)}</span> },
              { key: "reason", label: t("reason"), render: (r) => <span className="text-xs">{r.reason || "—"}</span> },
              { key: "status", label: t("status"), render: (r) => <span className="text-xs font-bold">{t(`reqStatus_${r.status}`, { defaultValue: r.status })}</span> },
              { key: "requested", label: t("requested"), render: (r) => <span className="text-[11px]">{r.requested_by} · {accountDate(r.requested_at)}</span> },
              { key: "decided", label: t("decided"), render: (r) => <span className="text-[11px]">{r.decided_by ? `${r.decided_by} · ${accountDate(r.decided_at)}${r.decision_note ? ` · ${r.decision_note}` : ""}` : "—"}</span> },
            ]}
          />
        )}
      </div>

      {dialog?.kind === "add" && (
        <NarrationDialog title={t("actionTitle", { action: t(`action_${dialog.action}`), number: account.acct_num })} hint={t(`actionHint_${dialog.action}`)} label={t("reason")} required confirmLabel={t(`action_${dialog.action}`)} variant={dialog.action === "CLOSE" || dialog.action === "BLOCK" ? "danger" : "primary"} busy={busy} onClose={() => setDialog(null)} onSave={(reason) => act(() => accountActionsApi.add({ acct_id: account.id, action: dialog.action, reason }))} />
      )}
      {dialog?.kind === "auth" && <NarrationDialog title={t("approveTitle")} confirmLabel={t("approve")} busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(() => accountActionsApi.auth({ id: pending.id, narration }))} />}
      {dialog?.kind === "deauth" && <NarrationDialog title={t("rejectTitle")} confirmLabel={t("reject")} variant="danger" required busy={busy} onClose={() => setDialog(null)} onSave={(narration) => act(() => accountActionsApi.deauth({ id: pending.id, narration }))} />}
    </div>
  );
}

const ROLES = ["JOINT_HOLDER", "GUARDIAN", "GROUP_MEMBER", "NOMINEE"];

// The account's other parties; adding or removing one is a request too.
export function AccountParties({ account }) {
  const { t } = useTranslation(["accounts", "common"]);
  const can = usePagePermission();
  const [rows, setRows] = useState(null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setRows(rowsOf(await accountPartiesApi.list({ acct_id: account.id })).flatMap((r) => r.parties ?? r.items ?? [r]));
    } catch (error) {
      notifications.error(error.message);
      setRows([]);
    }
  }, [account.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(accountActionsApi.listPath, () => void load());

  const request = async (body, done) => {
    setBusy(true);
    try {
      const response = await accountActionsApi.add({ acct_id: account.id, ...body });
      notifications.success(response?.message ?? t("requestMade"));
      done();
      await load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid gap-3">
      {can("Edit") && (
        <Button size="sm" variant="secondary" icon={UserPlus} className="justify-self-start" onClick={() => setAdding(true)}>
          {t("addParty")}
        </Button>
      )}
      {!rows ? (
        <Spinner size={14} />
      ) : (
        <MiniTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={t("noParties")}
          columns={[
            { key: "role", label: t("role"), render: (r) => <span className="text-xs font-semibold">{t(`role_${r.role}`, { defaultValue: r.role })}</span> },
            { key: "name", label: t("name"), render: (r) => <span className="text-xs">{r.name || "—"}</span> },
            { key: "relationship", label: t("relationship"), render: (r) => <span className="text-xs">{r.relationship || "—"}</span> },
            { key: "share", label: t("share"), align: "right", render: (r) => <span className="text-xs tabular-nums">{r.share_percent != null && r.share_percent !== "" ? `${Number(r.share_percent)}%` : "—"}</span> },
            { key: "added", label: t("added"), render: (r) => <span className="text-[11px]">{accountDate(r.added_at)}</span> },
            ...(can("Edit") ? [{ key: "x", label: "", render: (r) => <ActionIconButton label={t("removeParty")} intent="delete" icon={Trash2} onClick={() => setRemoving(r)} /> }] : []),
          ]}
        />
      )}
      {adding && <AddPartyDialog busy={busy} onClose={() => setAdding(false)} onSave={(party, reason) => request({ action: "ADD_PARTY", reason, party }, () => setAdding(false))} />}
      {removing && (
        <NarrationDialog title={t("removePartyTitle", { name: removing.name ?? "" })} label={t("reason")} required confirmLabel={t("removeParty")} variant="danger" busy={busy} onClose={() => setRemoving(null)} onSave={(reason) => request({ action: "REMOVE_PARTY", reason, party: { party_id: removing.id } }, () => setRemoving(null))} />
      )}
    </div>
  );
}

// A party is a customer (by one of their wallet numbers) or, for a
// nominee, simply a name; plus the relationship and the nominee's share.
function AddPartyDialog({ busy, onClose, onSave }) {
  const { t } = useTranslation("accounts");
  const [form, setForm] = useState({ role: "JOINT_HOLDER", by: "acct", acct_num: "", name: "", relationship: "", share_percent: "", reason: "" });
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }));
  const nominee = form.role === "NOMINEE";
  const byName = nominee && form.by === "name";
  const ready = form.reason.trim() && (byName ? form.name.trim() : form.acct_num.trim());
  const party = {
    role: form.role,
    ...(byName ? { name: form.name.trim() } : { acct_num: form.acct_num.replace(/\s/g, "") }),
    ...(form.relationship.trim() ? { relationship: form.relationship.trim() } : {}),
    ...(nominee && form.share_percent !== "" ? { share_percent: form.share_percent } : {}),
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("addParty")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button icon={UserPlus} loading={busy} disabled={!ready} onClick={() => onSave(party, form.reason.trim())}>
            {t("addParty")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={labelClass}>
          {t("role")}
          <FilterSelect className="mt-1.5" value={form.role} onChange={set("role")} options={ROLES.map((r) => ({ value: r, label: t(`role_${r}`) }))} />
        </label>
        {nominee && (
          <label className={labelClass}>
            {t("nomineeIs")}
            <FilterSelect className="mt-1.5" value={form.by} onChange={set("by")} options={[{ value: "acct", label: t("nomineeCustomer") }, { value: "name", label: t("nomineeOther") }]} />
          </label>
        )}
        {byName ? (
          <label className={cn(labelClass, "sm:col-span-2")}>
            {t("name")}
            <input className={cn(inputClass, "mt-1.5")} value={form.name} onChange={set("name")} />
          </label>
        ) : (
          <label className={cn(labelClass, "sm:col-span-2")}>
            {t("partyWallet")}
            <input className={cn(inputClass, "mt-1.5 font-mono")} value={form.acct_num} onChange={set("acct_num")} placeholder="2580000000025" />
          </label>
        )}
        <label className={labelClass}>
          {t("relationship")}
          <input className={cn(inputClass, "mt-1.5")} value={form.relationship} onChange={set("relationship")} />
        </label>
        {nominee && (
          <label className={labelClass}>
            {t("share")}
            <input className={cn(inputClass, "mt-1.5 tabular-nums")} inputMode="decimal" value={form.share_percent} onChange={(e) => set("share_percent")(e.target.value.replace(/[^\d.]/g, ""))} placeholder="50" />
          </label>
        )}
        <label className={cn(labelClass, "sm:col-span-2")}>
          {t("reason")}
          <input className={cn(inputClass, "mt-1.5")} value={form.reason} onChange={set("reason")} />
        </label>
      </div>
    </Modal>
  );
}

// The account's statements (made by the nightly job), each opened with its lines.
export function AccountStatements({ account }) {
  const { t } = useTranslation("accounts");
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    accountStatementsApi
      .list({ acct_id: account.id, page: 1, limit: 24 })
      .then((r) => !cancelled && setRows(rowsOf(r).flatMap((x) => x.statements ?? x.items ?? [x])))
      .catch((e) => !cancelled && (setError(e.message), setRows([])));
    return () => {
      cancelled = true;
    };
  }, [account.id]);

  const view = async (id) => {
    try {
      setOpen(rowsOf(await accountStatementsApi.get({ id }))[0] ?? null);
    } catch (e) {
      notifications.error(e.message);
    }
  };

  const cur = account.currency_code;
  return (
    <div className="grid gap-3">
      <Problems message={error} />
      {!rows ? (
        <Spinner size={14} />
      ) : (
        <MiniTable
          rows={rows}
          rowKey={(r) => r.id}
          empty={t("noStatements")}
          columns={[
            { key: "period", label: t("period"), render: (r) => <button type="button" onClick={() => void view(r.id)} className="text-xs font-bold text-primary hover:underline">{`${r.period_from} → ${r.period_to}`}</button> },
            { key: "opening", label: t("openingBalance"), align: "right", render: (r) => <span className="text-xs tabular-nums">{money(r.opening_balance, cur)}</span> },
            { key: "in", label: t("totalCredits"), align: "right", render: (r) => <span className="text-xs tabular-nums text-emerald-700">{money(r.total_credits, cur)}</span> },
            { key: "out", label: t("totalDebits"), align: "right", render: (r) => <span className="text-xs tabular-nums text-red-700">{money(r.total_debits, cur)}</span> },
            { key: "closing", label: t("closingBalance"), align: "right", render: (r) => <b className="text-xs tabular-nums">{money(r.closing_balance, cur)}</b> },
            { key: "n", label: t("txnCount"), align: "right", render: (r) => <span className="text-xs tabular-nums">{r.txn_count}</span> },
            { key: "delivery", label: t("delivery"), render: (r) => <span className="text-[11px]">{[r.email_delivery && t("byEmail"), r.paper_requested && t("onPaper")].filter(Boolean).join(" · ") || "—"}</span> },
          ]}
        />
      )}
      {open && (
        <Modal open onClose={() => setOpen(null)} size="lg" title={t("statementFor", { from: open.period_from, to: open.period_to })}>
          <MiniTable
            rows={open.lines ?? []}
            rowKey={(l, i) => `${l.rrn}-${i}`}
            empty={t("noLines")}
            columns={[
              { key: "date", label: t("date"), render: (l) => <span className="whitespace-nowrap text-[11px]">{accountDate(l.date)}</span> },
              { key: "description", label: t("description"), render: (l) => <span className="text-xs">{l.description}</span> },
              { key: "rrn", label: "RRN", render: (l) => <span className="font-mono text-[11px]">{l.rrn}</span> },
              { key: "amount", label: t("amount"), align: "right", render: (l) => <span className={cn("text-xs tabular-nums", l.operation_type === "CREDIT" ? "text-emerald-700" : "text-red-700")}>{money(l.amount, cur)}</span> },
              { key: "balance", label: t("balance"), align: "right", render: (l) => <span className="text-xs tabular-nums">{money(l.balance, cur)}</span> },
            ]}
          />
        </Modal>
      )}
    </div>
  );
}
