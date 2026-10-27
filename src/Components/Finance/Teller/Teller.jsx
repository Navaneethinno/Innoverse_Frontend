import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  CheckCircle2,
  HandCoins,
  Landmark,
  LockKeyhole,
  Plus,
  Printer,
  Undo2,
  Unlock,
  Vault,
  XCircle,
} from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { ReceiptDialog } from "@/Components/Finance/Transactions/txnShared";
import { useMasterCurrencies } from "@/Hooks/Institution/institutionCurrencyHooks";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { tellerApi } from "@/Services/Accounting/accounting.api";
import { loanFacilitiesApi, recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import {
  ActionButtons,
  Facts,
  NarrationDialog,
  Section,
  inputClass,
  labelClass,
} from "../Deposits/depositShared";
import { Field, MiniTable, Tabs, useInstitutionScope } from "../Loans/loanShared";
import {
  AccountPick,
  FacilityPick,
  branchOptions,
  slipReference,
  useCoreBanking,
} from "../coreBankingShared";

// The transfer queue isn't pushed: read again this often on the desk and
// the queue (and after every action).
const QUEUE_EVERY = 45000;

// FINANCE › Teller (menu 196): tills and vaults per branch and currency, the
// teller's desk and the cash transfers between them. Working a till is the
// Self action, and the role (teller / vault custodian, from Core Banking
// Setup) is checked too: open with a count, serve customers, ask the vault
// for cash or send cash on (each waits for the other side's decision),
// close with a count (a difference posts a variance).
export function Teller() {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const [tab, setTab] = useState(can("Self") ? "desk" : "tills");
  const waiting = useWaitingForMe(can("Self"));
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5" data-tour="page-title">
        <PageTitle>{t("tellerTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("tellerSubtitle")}</p>
      </div>
      <Tabs
        tabs={[{ key: "desk" }, { key: "transfers", count: waiting.rows.length || undefined }, { key: "tills" }]}
        value={tab}
        onChange={setTab}
        labelOf={(k) => t(`tellerTab_${k}`)}
      />
      {tab === "desk" && <Desk waiting={waiting} />}
      {tab === "transfers" && <Transfers waiting={waiting} />}
      {tab === "tills" && <TillList />}
    </div>
  );
}

// What only this user can complete (as vault custodian, or as the teller a
// transfer is sent to), read every QUEUE_EVERY.
function useWaitingForMe(enabled) {
  const { scope } = useInstitutionScope();
  const [rows, setRows] = useState([]);
  const reload = useCallback(
    () =>
      enabled
        ? tellerApi
            .transfers(scope({ awaits_me: true }))
            .then((r) => setRows(Array.isArray(r?.data) ? r.data : []))
            .catch(() => {})
        : Promise.resolve(),
    [enabled, scope],
  );
  useEffect(() => {
    void reload();
    const timer = window.setInterval(() => void reload(), QUEUE_EVERY);
    return () => window.clearInterval(timer);
  }, [reload]);
  return { rows, reload };
}

const kindLabel = (t, kind) => t(`kind_${kind}`, { defaultValue: kind });
const sessionOwner = (s) => s?.user_name ?? "—";
const sessionOwnerId = (s) => String(s?.user_id ?? "");
// A slip number for counter work, made once per dialog and kept across
// retries: the same slip on the same till never posts twice.
const newSlip = (till) => slipReference(`${till.code}-${Date.now().toString(36).toUpperCase()}`);
// "1000×42 · 200×2": a count by note.
const notesText = (d) =>
  d && typeof d === "object" && Object.keys(d).length
    ? Object.entries(d)
        .sort((a, b) => Number(b[0]) - Number(a[0]))
        .map(([note, count]) => `${note}×${count}`)
        .join(" · ")
    : "—";

function TillList() {
  const { t } = useTranslation(["corebank", "common"]);
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const [viewing, setViewing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const [opening, setOpening] = useState(null);
  const list = useServerList({ api: tellerApi.listPath, call: tellerApi.list });
  const columns = [
    {
      key: "branch_name",
      label: t("branch"),
      render: (r) => <span className="text-xs">{r.branch_name}</span>,
    },
    {
      key: "code",
      label: t("till"),
      render: (r) => (
        <span className="text-xs leading-tight">
          <b className="block font-mono">{r.code}</b>
          <span className="text-muted-foreground">{r.name}</span>
        </span>
      ),
    },
    {
      key: "kind",
      label: t("kind"),
      render: (r) => (
        <span className="text-xs font-semibold">
          {kindLabel(t, r.kind)} <span className="font-normal text-muted-foreground">· {r.currency}</span>
        </span>
      ),
    },
    {
      key: "balance",
      label: t("balance"),
      render: (r) => (
        <span className="text-xs leading-tight tabular-nums" data-tour="till-balance">
          <b className="block">{money(r.balance, r.currency)}</b>
          <span className="text-[10px] text-muted-foreground">
            {t("limitOf", { amount: money(r.cash_limit, r.currency) })}
          </span>
        </span>
      ),
    },
    {
      key: "available",
      label: t("available"),
      render: (r) => (
        <span className="text-xs tabular-nums" data-tour="till-available">
          {money(r.available ?? r.balance, r.currency)}
        </span>
      ),
    },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "session",
      label: t("openByColumn"),
      sortable: false,
      render: (r) =>
        r.kind === "VAULT" ? (
          "—"
        ) : r.session ? (
          <span className="text-xs leading-tight" data-tour="till-open-by">
            <b className="block text-emerald-700">{sessionOwner(r.session)}</b>
            <span className="text-[10px] text-muted-foreground">
              {accountDate(r.session.opened_at)}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("closedTill")}</span>
        ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <span className="flex items-center gap-1">
          <RowActions
            buttons={{
              view: true,
              edit: r.status === "ACTIVE" && can("Edit"),
              deactivate: r.status === "ACTIVE" && !r.session && can("Deactivate"),
              activate: r.status !== "ACTIVE" && can("Reactivate"),
            }}
            onView={() => setViewing(r)}
            onEdit={() => setEditing(r)}
            onDeactivate={() => setDeciding({ verb: "deactivate", till: r })}
            onReactivate={() => setDeciding({ verb: "reactivate", till: r })}
          />
          {r.kind === "TILL" && !r.session && r.status === "ACTIVE" && can("Self") && (
            <ActionIconButton
              label={t("openTill")}
              intent="reactivate"
              icon={Unlock}
              onClick={() => setOpening(r)}
            />
          )}
        </span>
      ),
    },
  ];
  const decide = async (narration) => {
    try {
      const r = await tellerApi[deciding.verb](
        scope({ id: deciding.till.id, ...(narration ? { narration } : {}) }),
      );
      if (r?.message) notifications.success(r.message);
      setDeciding(null);
      list.reload();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  return (
    <>
      <ListTable
        list={list}
        columns={columns}
        rowKey={(r) => r.id}
        title={t("tellerTab_tills")}
        emptyTitle={t("noTills")}
        emptyDescription={t("noTillsHint")}
        actions={
          can("Add") && (
            <Button size="sm" icon={Plus} onClick={() => setEditing({})} data-tour="add">
              {t("addTill")}
            </Button>
          )
        }
      />
      {viewing && <TillDetail id={viewing.id} onClose={() => setViewing(null)} />}
      {editing && (
        <TillForm
          till={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={list.reload}
        />
      )}
      {opening && (
        <CountDialog
          verb="open"
          till={opening}
          onClose={() => setOpening(null)}
          onDone={() => {
            setOpening(null);
            list.reload();
          }}
        />
      )}
      {deciding && (
        <NarrationDialog
          title={t(`till_${deciding.verb}`, { code: deciding.till.code })}
          hint={t(`till_${deciding.verb}Hint`)}
          confirmLabel={t(`till_${deciding.verb}Confirm`)}
          variant={deciding.verb === "deactivate" ? "danger" : "primary"}
          onClose={() => setDeciding(null)}
          onSave={decide}
        />
      )}
    </>
  );
}

const blankTill = {
  branch_id: "",
  code: "",
  name: "",
  kind: "TILL",
  currency_id: "",
  cash_limit: "",
};

function TillForm({ till, onClose, onSaved }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const setup = useCoreBanking(scope, !till);
  const { currencies } = useMasterCurrencies();
  const [form, setForm] = useState(() =>
    till ? { ...blankTill, ...till, cash_limit: String(till.cash_limit ?? "") } : blankTill,
  );
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const ready = till
    ? form.name.trim()
    : form.branch_id && form.code && form.name.trim() && form.currency_id;
  const save = async () => {
    setSaving(true);
    try {
      const body = till
        ? { id: till.id, name: form.name.trim(), cash_limit: form.cash_limit || "0" }
        : {
            branch_id: Number(form.branch_id),
            code: form.code,
            name: form.name.trim(),
            kind: form.kind,
            currency_id: Number(form.currency_id),
            cash_limit: form.cash_limit || "0",
          };
      const r = await tellerApi[till ? "edit" : "add"](scope(body));
      if (r?.message) notifications.success(r.message);
      onSaved();
      onClose();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={till ? t("editTill", { code: till.code }) : t("addTill")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={saving} disabled={!ready} onClick={() => void save()}>
            {t("save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        {!till && (
          <>
            <label className={labelClass}>
              {t("branch")}
              <Field
                field={{
                  type: "select",
                  blank: t("choose"),
                  options: branchOptions(setup, { openOnly: true }),
                }}
                value={form.branch_id}
                onChange={set("branch_id")}
              />
            </label>
            <label className={labelClass}>
              {t("kind")}
              <Field
                field={{
                  type: "select",
                  options: ["TILL", "VAULT"].map((k) => ({ value: k, label: kindLabel(t, k) })),
                }}
                value={form.kind}
                onChange={set("kind")}
              />
            </label>
            <label className={labelClass}>
              {t("code")}
              <Field field={{ type: "code" }} value={form.code} onChange={set("code")} />
            </label>
            <label className={labelClass}>
              {t("currency")}
              <Field
                field={{
                  type: "select",
                  blank: t("choose"),
                  options: currencies.map((c) => ({
                    value: String(c.id ?? c.currency_id),
                    label: [c.alpha_code ?? c.currency_code, c.name ?? c.currency_name]
                      .filter(Boolean)
                      .join(" · "),
                  })),
                }}
                value={form.currency_id}
                onChange={set("currency_id")}
              />
            </label>
          </>
        )}
        <label className={labelClass}>
          {t("name")}
          <Field field={{}} value={form.name} onChange={set("name")} />
        </label>
        <label className={labelClass}>
          {t("cashLimit")}
          <Field field={{ type: "amount" }} value={form.cash_limit} onChange={set("cash_limit")} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
            {t("cashLimitHint")}
          </span>
        </label>
      </div>
      {!till && form.kind === "VAULT" && (
        <p className="mt-3 text-xs text-muted-foreground">{t("oneVaultHint")}</p>
      )}
    </Modal>
  );
}

// The till's money: balance, cash promised either way, what's available
// and its limit.
function BalanceFacts({ till }) {
  const { t } = useTranslation("corebank");
  const m = (v) => money(v ?? "0", till.currency);
  return (
    <Facts
      rows={[
        [t("balance"), m(till.balance), "font-black"],
        [t("available"), m(till.available ?? till.balance), "font-black text-emerald-700"],
        [t("pendingOut"), m(till.pending_out), Number(till.pending_out) ? "text-amber-700" : undefined],
        [t("pendingIn"), m(till.pending_in), Number(till.pending_in) ? "text-sky-700" : undefined],
        [t("cashLimit"), Number(till.cash_limit) ? m(till.cash_limit) : t("noLimit")],
      ]}
    />
  );
}

// A till: its money, today's movements, its last sessions and transfers.
function TillDetail({ id, onClose }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [till, setTill] = useState(null);
  const navigate = useNavigate();
  const canJournal = useMenuPermission("Finance Transaction");
  useEffect(() => {
    tellerApi
      .get(scope({ id }))
      .then((r) => setTill(recordOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [id, scope]);
  return (
    <Modal
      open
      size="xl"
      onClose={onClose}
      title={till ? `${till.code} · ${till.name}` : t("till")}
    >
      {!till ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4">
          <Facts
            rows={[
              [t("kind"), `${kindLabel(t, till.kind)} · ${till.currency}`],
              [t("branch"), till.branch_name],
              [t("glAccount"), `${till.gl_account_name ?? ""} · ${till.acct_num ?? ""}`],
              [t("status"), <StatusBadge key="s" status={till.status} />],
            ]}
          />
          <BalanceFacts till={till} />
          {/* Cash reaches a vault by a manual journal: DR the vault, CR its source. */}
          {till.kind === "VAULT" && till.status === "ACTIVE" && canJournal("Add") && (
            <div>
              <Button
                size="sm"
                icon={Landmark}
                onClick={() =>
                  navigate("/manualjournal", {
                    state: {
                      journal: {
                        currency_id: till.currency_id,
                        narration: t("fundVaultNarration", { code: till.code }),
                        lines: [
                          { gl_account_id: String(till.gl_account_id), op: "DR" },
                          { gl_account_id: "", op: "CR" },
                        ],
                      },
                    },
                  })
                }
              >
                {t("fundVault")}
              </Button>
              <p className="mt-1 text-[11px] text-muted-foreground">{t("fundVaultHint")}</p>
            </div>
          )}
          {till.session && (
            <Section
              title={t("openSessionSince", {
                name: sessionOwner(till.session),
                date: accountDate(till.session.opened_at),
              })}
            >
              <Movements session={till.session} currency={till.currency} />
            </Section>
          )}
          <Section title={t("lastSessions")}>
            <SessionTable sessions={till.sessions ?? []} currency={till.currency} />
          </Section>
          <Section title={t("tillTransfers")}>
            <TransferTable query={{ till_id: till.id }} />
          </Section>
        </div>
      )}
    </Modal>
  );
}

function SessionTable({ sessions, currency }) {
  const { t } = useTranslation("corebank");
  return (
    <MiniTable
      rows={sessions}
      empty={t("noSessions")}
      columns={[
        {
          key: "opened_at",
          label: t("opened"),
          render: (s) => <span className="text-xs">{accountDate(s.opened_at)}</span>,
        },
        {
          key: "closed_at",
          label: t("closed"),
          render: (s) => (
            <span className="text-xs">{s.closed_at ? accountDate(s.closed_at) : "—"}</span>
          ),
        },
        {
          key: "user_name",
          label: t("teller"),
          render: (s) => <span className="text-xs">{sessionOwner(s)}</span>,
        },
        {
          key: "opening_counted",
          label: t("openingCount"),
          align: "right",
          render: (s) => money(s.opening_counted, currency),
        },
        {
          key: "closing_expected",
          label: t("expected"),
          align: "right",
          render: (s) => money(s.closing_expected, currency),
        },
        {
          key: "closing_counted",
          label: t("closingCount"),
          align: "right",
          render: (s) => money(s.closing_counted, currency),
        },
        {
          key: "variance",
          label: t("variance"),
          align: "right",
          render: (s) => <Variance value={s.variance} currency={currency} />,
        },
        {
          key: "denominations",
          label: t("byNote"),
          wrap: true,
          render: (s) => <span className="font-mono text-[11px]">{notesText(s.denominations)}</span>,
        },
      ]}
    />
  );
}

const Variance = ({ value, currency }) => {
  const n = Number(value);
  if (value == null || value === "") return "—";
  return (
    <b
      className={cn(n < 0 && "text-red-700", n > 0 && "text-amber-700")}
      data-tour="till-variance"
    >
      {money(value, currency)}
    </b>
  );
};

// The session's cash in / out and every movement: DR is cash into the till,
// CR is cash out.
function Movements({ session, currency }) {
  const { t } = useTranslation("corebank");
  return (
    <div className="grid gap-3" data-tour="till-movements">
      <Facts
        rows={[
          [t("openingCount"), money(session.opening_counted, currency)],
          [t("cashIn"), money(session.cash_in, currency), "text-emerald-700"],
          [t("cashOut"), money(session.cash_out, currency), "text-red-700"],
          session.variance != null && [t("variance"), money(session.variance, currency)],
        ]}
      />
      <MiniTable
        rows={session.movements ?? []}
        rowKey={(m) => m.txn_id ?? m.rrn}
        empty={t("noMovements")}
        columns={[
          {
            key: "at",
            label: t("time"),
            render: (m) => <span className="text-xs">{accountDate(m.at)}</span>,
          },
          {
            key: "txn_type",
            label: t("movement"),
            wrap: true,
            render: (m) => (
              <span className="text-xs leading-tight">
                <b className="block">{t(`move_${m.txn_type}`, { defaultValue: m.txn_type })}</b>
                <span className="text-muted-foreground">{m.description}</span>
              </span>
            ),
          },
          {
            key: "op",
            label: t("inOut"),
            render: (m) => (
              <span
                className={cn(
                  "text-xs font-bold",
                  m.op === "CR" ? "text-red-700" : "text-emerald-700",
                )}
              >
                {t(m.op === "CR" ? "out" : "in")}
              </span>
            ),
          },
          {
            key: "amount",
            label: t("amount"),
            align: "right",
            render: (m) => (
              <b className={cn(m.op === "CR" ? "text-red-700" : "text-emerald-700")}>
                {money(m.amount, currency)}
              </b>
            ),
          },
          {
            key: "rrn",
            label: "RRN",
            render: (m) => <span className="font-mono text-xs">{m.rrn}</span>,
          },
        ]}
      />
    </div>
  );
}

// The teller's own open till, or the tills to open one.
function Desk({ waiting }) {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const me = useOwnIds().userId;
  const [tills, setTills] = useState(null);
  const [till, setTill] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [summary, setSummary] = useState(null);
  const load = useCallback(async () => {
    try {
      const r = await tellerApi.list(scope({ status: "ACTIVE", limit: 200 }));
      const rows = Array.isArray(r?.data) ? r.data : [];
      setTills(rows);
      const mine = rows.find((x) => x.session && sessionOwnerId(x.session) === me);
      setTill(mine ? recordOf(await tellerApi.get(scope({ id: mine.id }))) : null);
    } catch (e) {
      setTills([]);
      notifications.error(e.message);
    }
  }, [scope, me]);
  useEffect(() => {
    void load();
  }, [load]);
  const done = () => {
    setDialog(null);
    void load();
    void waiting.reload();
  };

  if (!tills) return <PageSkeleton />;
  if (!can("Self"))
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("notATeller")}</p>;
  if (!till) {
    const closed = tills.filter((x) => x.kind === "TILL" && !x.session);
    return (
      <div className="grid gap-4">
        <WaitingPanel waiting={waiting} onChanged={done} />
        <Section title={t("openATill")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("openATillHint")}</p>
          <MiniTable
            rows={closed}
            empty={t("noTillToOpen")}
            columns={[
              {
                key: "code",
                label: t("till"),
                render: (r) => (
                  <span className="text-xs">
                    <b className="font-mono">{r.code}</b> · {r.name}
                  </span>
                ),
              },
              { key: "branch_name", label: t("branch") },
              {
                key: "balance",
                label: t("balance"),
                align: "right",
                render: (r) => money(r.balance, r.currency),
              },
              {
                key: "open",
                label: "",
                render: (r) => (
                  <Button
                    size="sm"
                    icon={Unlock}
                    onClick={() => setDialog({ kind: "open", till: r })}
                    data-tour="teller-open"
                  >
                    {t("openTill")}
                  </Button>
                ),
              },
            ]}
          />
          {dialog && (
            <CountDialog
              verb="open"
              till={dialog.till}
              onClose={() => setDialog(null)}
              onDone={done}
            />
          )}
        </Section>
      </div>
    );
  }
  const sameDrawer = (x) =>
    x.branch_id === till.branch_id && x.currency_id === till.currency_id && x.id !== till.id;
  const vault = tills.find((x) => x.kind === "VAULT" && sameDrawer(x));
  // A transfer goes only to an open till of the same branch and currency.
  const openTills = tills.filter((x) => x.kind === "TILL" && x.session && sameDrawer(x));
  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-border bg-card p-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("yourTill")}
          </p>
          <p className="text-lg font-black">
            <span className="font-mono">{till.code}</span> · {till.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {[till.branch_name, till.currency].join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("available")}
          </p>
          <p className="text-2xl font-black tabular-nums">
            {money(till.available ?? till.balance, till.currency)}
          </p>
        </div>
      </div>
      <div data-tour="teller-balance">
        <BalanceFacts till={till} />
      </div>
      <ActionButtons
        buttons={[
          {
            key: "deposit",
            label: t("deposit"),
            icon: ArrowDownToLine,
            variant: "primary",
            run: () => setDialog({ kind: "deposit" }),
          },
          {
            key: "withdraw",
            label: t("withdraw"),
            icon: ArrowUpFromLine,
            run: () => setDialog({ kind: "withdraw" }),
          },
          {
            key: "loan_repay",
            label: t("loanRepay"),
            icon: HandCoins,
            run: () => setDialog({ kind: "loan_repay" }),
          },
          {
            key: "requisition",
            label: t("askVault"),
            icon: Vault,
            run: () => setDialog({ kind: "REQUISITION" }),
          },
          {
            key: "send",
            label: t("sendCash"),
            icon: ArrowLeftRight,
            run: () => setDialog({ kind: "TRANSFER" }),
          },
          {
            key: "close",
            label: t("closeTill"),
            icon: LockKeyhole,
            variant: "danger",
            run: () => setDialog({ kind: "close" }),
          },
        ]}
      />
      <WaitingPanel waiting={waiting} onChanged={done} />
      <Section title={t("myPendingTransfers")}>
        <TransferTable query={{ till_id: till.id, status: "PENDING" }} onChanged={done} />
      </Section>
      <Section title={t("thisSession")}>
        {till.session && <Movements session={till.session} currency={till.currency} />}
      </Section>
      {dialog?.kind === "close" && (
        <CountDialog
          verb="close"
          till={till}
          onClose={() => setDialog(null)}
          onDone={(session) => {
            setSummary(session);
            done();
          }}
        />
      )}
      {["deposit", "withdraw", "loan_repay"].includes(dialog?.kind) && (
        <CounterDialog
          kind={dialog.kind}
          till={till}
          onClose={() => setDialog(null)}
          onDone={(txn) => {
            if (txn?.txn_id && dialog.kind !== "loan_repay") setReceipt(txn.txn_id);
            done();
          }}
        />
      )}
      {["REQUISITION", "TRANSFER"].includes(dialog?.kind) && (
        <TransferDialog
          initialKind={dialog.kind}
          till={till}
          vault={vault}
          openTills={openTills}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
      {receipt && <ReceiptDialog txnId={receipt} onClose={() => setReceipt(null)} />}
      {summary && (
        <SessionSummary session={summary} till={till} onClose={() => setSummary(null)} />
      )}
    </div>
  );
}

// Open or close a till with the cash counted. Opening warns before a count
// that differs from the books (the difference posts as a variance at once);
// closing may count by note and is refused while transfers are pending.
function CountDialog({ verb, till, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fromNotes = notes.reduce((sum, n) => sum + Number(n.value || 0) * Number(n.count || 0), 0);
  const amount = notes.length ? fromNotes.toFixed(2) : counted;
  const difference = amount === "" ? 0 : Number(amount) - Number(till.balance ?? 0);
  const pending = Number(till.pending_out || 0) + Number(till.pending_in || 0);
  const save = async () => {
    setBusy(true);
    try {
      const denominations = notes.length
        ? Object.fromEntries(
            notes.filter((n) => n.value && n.count).map((n) => [n.value, Number(n.count)]),
          )
        : undefined;
      const r = await tellerApi[verb](
        scope({
          id: till.id,
          counted: amount || "0",
          note: note.trim(),
          ...(denominations ? { denominations } : {}),
        }),
      );
      const session = verb === "close" ? recordOf(r) : recordOf(r)?.session;
      notifications.success(
        Number(session?.variance)
          ? t("countedWithVariance", { amount: money(session.variance, till.currency) })
          : r?.message,
      );
      onDone(session);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t(verb === "open" ? "openTillTitle" : "closeTillTitle", { code: till.code })}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            loading={busy}
            disabled={amount === "" || (verb === "close" && pending > 0)}
            variant={verb === "close" ? "danger" : "primary"}
            onClick={() => void save()}
          >
            {t(verb === "open" ? "openTill" : "closeTill")}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">
        {t("countHint", { amount: money(till.balance, till.currency) })}
      </p>
      {verb === "close" && pending > 0 && (
        <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          {t("closePendingHint")}
        </p>
      )}
      <label className={labelClass}>
        {t("counted")}
        <AmountInput
          className={cn(inputClass, "mt-1.5")}
          value={amount}
          onChange={(v) => !notes.length && setCounted(v)}
        />
      </label>
      {amount !== "" && difference !== 0 && (
        <p
          className={cn(
            "mt-2 rounded-xl px-3 py-2 text-xs font-semibold",
            difference < 0 ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900",
          )}
        >
          {t(difference < 0 ? "countShort" : "countOver", {
            counted: money(amount, till.currency),
            expected: money(till.balance, till.currency),
            amount: money(Math.abs(difference).toFixed(2), till.currency),
          })}
        </p>
      )}
      {verb === "close" && (
        <div className="mt-3">
          <p className={labelClass}>{t("byNote")}</p>
          <div className="mt-1.5 grid gap-2">
            {notes.map((n, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                <AmountInput
                  className={inputClass}
                  placeholder={t("noteValue")}
                  value={n.value}
                  onChange={(v) =>
                    setNotes((list) => list.map((x, j) => (j === i ? { ...x, value: v } : x)))
                  }
                />
                <input
                  className={cn(inputClass, "tabular-nums")}
                  inputMode="numeric"
                  placeholder={t("noteCount")}
                  value={n.count}
                  onChange={(e) =>
                    setNotes((list) =>
                      list.map((x, j) =>
                        j === i ? { ...x, count: e.target.value.replace(/\D/g, "") } : x,
                      ),
                    )
                  }
                />
                <button
                  type="button"
                  className="text-xs font-bold text-red-600"
                  onClick={() => setNotes((list) => list.filter((_, j) => j !== i))}
                >
                  ×
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              className="w-fit"
              onClick={() => setNotes((list) => [...list, { value: "", count: "" }])}
            >
              {t("addNote")}
            </Button>
          </div>
        </div>
      )}
      <label className={cn(labelClass, "mt-3 block")}>
        {t("note")}
        <input
          className={cn(inputClass, "mt-1.5")}
          value={note}
          maxLength={200}
          onChange={(e) => setNote(e.target.value)}
        />
      </label>
    </Modal>
  );
}

// The closed session as an end-of-day summary the teller can print.
function SessionSummary({ session, till, onClose }) {
  const { t } = useTranslation("corebank");
  const c = till.currency;
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={t("endOfDay", { code: till.code })}
      footer={
        <Button icon={Printer} onClick={() => window.print()}>
          {t("print")}
        </Button>
      }
    >
      <div className="grid gap-3">
        <Facts
          rows={[
            [t("teller"), sessionOwner(session)],
            [t("opened"), accountDate(session.opened_at)],
            [t("closed"), accountDate(session.closed_at)],
            [t("openingCount"), money(session.opening_counted, c)],
            [t("cashIn"), money(session.cash_in, c), "text-emerald-700"],
            [t("cashOut"), money(session.cash_out, c), "text-red-700"],
            [t("expected"), money(session.closing_expected, c)],
            [t("closingCount"), money(session.closing_counted, c), "font-black"],
            [t("variance"), <Variance key="v" value={session.variance} currency={c} />],
            [t("byNote"), notesText(session.denominations)],
          ]}
        />
        <Movements session={session} currency={c} />
      </div>
    </Modal>
  );
}

// Counter work on the open till: a cash deposit or withdrawal on a customer
// account, or a loan repayment. The slip number is made once and kept, so a
// retry after a timeout answers the first posting instead of posting again.
function CounterDialog({ kind, till, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [target, setTarget] = useState(null);
  const [due, setDue] = useState(null);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState(() => newSlip(till));
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  // A loan: what is due today, offered as the amount.
  useEffect(() => {
    if (kind !== "loan_repay" || !target?.id) return;
    setDue(null);
    loanFacilitiesApi
      .due(scope({ id: target.id }))
      .then((r) => {
        const d = recordOf(r);
        setDue(d);
        if (Number(d?.total_due)) setAmount(String(d.total_due));
      })
      .catch((e) => notifications.error(e.message));
  }, [kind, target, scope]);
  const ready = Number(amount) > 0 && reference && target;
  const save = async () => {
    setBusy(true);
    try {
      const common = { id: till.id, amount, reference, narration: narration.trim() };
      const body =
        kind === "loan_repay"
          ? { ...common, facility_id: target.id }
          : { ...common, acct_id: target.id };
      const r = await tellerApi[kind](scope(body));
      const txn = recordOf(r);
      if (txn?.replayed) notifications.info(t("alreadyPosted", { rrn: txn.rrn }));
      else if (kind === "loan_repay")
        notifications.success(
          t("repaid", {
            amount: money(txn?.amount, till.currency),
            principal: money(txn?.principal, till.currency),
            interest: money(txn?.interest, till.currency),
          }),
        );
      else if (r?.message) notifications.success(r.message);
      onDone(txn);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      title={t(`money_${kind}`)}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} onClick={() => void save()}>
            {t(`money_${kind}`)}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className={labelClass}>
          {t(kind === "loan_repay" ? "loanFacility" : "customerAccount")}
          <div className="mt-1.5">
            {kind === "loan_repay" ? (
              <FacilityPick value={target} onChange={setTarget} scope={scope} />
            ) : (
              <AccountPick
                value={target}
                onChange={setTarget}
                scope={scope}
                filter={(a) => a.currency_id === till.currency_id && a.acct_class === "CUSTOMER"}
              />
            )}
          </div>
        </label>
        {kind === "loan_repay" && due && (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs">
            {Number(due.total_due)
              ? t("dueToday", { amount: money(due.total_due, till.currency) })
              : t("nothingDueToday")}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("amountIn", { currency: till.currency })}
            <AmountInput className={cn(inputClass, "mt-1.5")} value={amount} onChange={setAmount} />
          </label>
          <label className={labelClass}>
            {t("slipReference")}
            <input
              className={cn(inputClass, "mt-1.5 font-mono")}
              value={reference}
              onChange={(e) => setReference(slipReference(e.target.value))}
            />
          </label>
        </div>
        <label className={labelClass}>
          {t("narration")}
          <input
            className={cn(inputClass, "mt-1.5")}
            value={narration}
            maxLength={200}
            onChange={(e) => setNarration(e.target.value)}
          />
        </label>
        <p className="text-xs text-muted-foreground">
          {kind === "withdraw"
            ? t("withdrawHint", { amount: money(till.available ?? till.balance, till.currency) })
            : t("slipHint")}
        </p>
      </div>
    </Modal>
  );
}

// Ask the vault for cash (a requisition, decided by a vault custodian), send
// cash back to it (a return) or to another open till (a transfer, accepted
// by that till's teller). Nothing moves until the other side decides; cash
// sent is held back from this till meanwhile.
function TransferDialog({ initialKind, till, vault, openTills, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [kind, setKind] = useState(initialKind);
  const [toTill, setToTill] = useState("");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState(() => newSlip(till));
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const needsVault = kind !== "TRANSFER";
  const ready =
    Number(amount) > 0 && reference && (needsVault ? Boolean(vault) : Boolean(toTill));
  const save = async () => {
    setBusy(true);
    try {
      const r = await tellerApi.transfer_request(
        scope({
          kind,
          till_id: till.id,
          ...(kind === "TRANSFER" ? { to_till_id: Number(toTill) } : {}),
          amount,
          reference,
          narration: narration.trim(),
        }),
      );
      if (r?.message) notifications.success(r.message);
      onDone();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const kinds = initialKind === "REQUISITION" ? ["REQUISITION"] : ["TRANSFER", "RETURN"];
  return (
    <Modal
      open
      onClose={onClose}
      title={t(initialKind === "REQUISITION" ? "askVault" : "sendCash")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} onClick={() => void save()}>
            {t(`request_${kind}`)}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <p className="text-xs text-muted-foreground">{t(`transferHint_${kind}`)}</p>
        {kinds.length > 1 && (
          <label className={labelClass}>
            {t("sendTo")}
            <Field
              field={{
                type: "select",
                options: kinds.map((k) => ({ value: k, label: t(`sendTo_${k}`) })),
              }}
              value={kind}
              onChange={setKind}
            />
          </label>
        )}
        {kind === "TRANSFER" ? (
          <label className={labelClass}>
            {t("receivingTill")}
            <Field
              field={{
                type: "select",
                blank: openTills.length ? t("choose") : t("noOpenTills"),
                options: openTills.map((x) => ({
                  value: String(x.id),
                  label: `${x.code} · ${x.name} (${sessionOwner(x.session)})`,
                })),
              }}
              value={toTill}
              onChange={setToTill}
            />
          </label>
        ) : vault ? (
          <p className="rounded-xl bg-muted/50 px-3 py-2 text-xs">
            {t("theVault", { code: vault.code, name: vault.name })}
          </p>
        ) : (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {t("noVault")}
          </p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("amountIn", { currency: till.currency })}
            <AmountInput className={cn(inputClass, "mt-1.5")} value={amount} onChange={setAmount} />
          </label>
          <label className={labelClass}>
            {t("slipReference")}
            <input
              className={cn(inputClass, "mt-1.5 font-mono")}
              value={reference}
              onChange={(e) => setReference(slipReference(e.target.value))}
            />
          </label>
        </div>
        <label className={labelClass}>
          {t("narration")}
          <input
            className={cn(inputClass, "mt-1.5")}
            value={narration}
            maxLength={200}
            onChange={(e) => setNarration(e.target.value)}
          />
        </label>
        {kind !== "REQUISITION" && (
          <p className="text-xs text-muted-foreground">
            {t("sendHoldHint", { amount: money(till.available ?? till.balance, till.currency) })}
          </p>
        )}
      </div>
    </Modal>
  );
}

// What only this user can complete, on the desk.
function WaitingPanel({ waiting, onChanged }) {
  const { t } = useTranslation("corebank");
  if (!waiting.rows.length) return null;
  return (
    <Section title={t("waitingForMeN", { count: waiting.rows.length })}>
      <div data-tour="teller-waiting">
        <TransferRows rows={waiting.rows} onChanged={onChanged} />
      </div>
    </Section>
  );
}

// Cash Transfers: waiting for me, my pending requests, and all (filtered).
function Transfers({ waiting }) {
  const { t } = useTranslation("corebank");
  const me = useOwnIds().userId;
  const [view, setView] = useState(waiting.rows.length ? "waiting" : "mine");
  const [filters, setFilters] = useState({ kind: "", status: "" });
  return (
    <div className="grid gap-3">
      <Tabs
        tabs={[
          { key: "waiting", count: waiting.rows.length || undefined },
          { key: "mine" },
          { key: "all" },
        ]}
        value={view}
        onChange={setView}
        labelOf={(k) => t(`transfersTab_${k}`)}
      />
      {view === "waiting" && (
        <Section title={t("transfersTab_waiting")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("waitingHint")}</p>
          <TransferRows rows={waiting.rows} onChanged={waiting.reload} />
        </Section>
      )}
      {view === "mine" && (
        <Section title={t("transfersTab_mine")}>
          <TransferTable
            query={{ status: "PENDING" }}
            keep={(r) => String(r.requested_user_id) === String(me)}
            onChanged={waiting.reload}
          />
        </Section>
      )}
      {view === "all" && (
        <Section title={t("transfersTab_all")}>
          <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:w-1/2">
            <Field
              field={{
                type: "select",
                blank: t("anyKind"),
                options: ["REQUISITION", "RETURN", "TRANSFER"].map((k) => ({
                  value: k,
                  label: t(`transfer_${k}`),
                })),
              }}
              value={filters.kind}
              onChange={(kind) => setFilters((f) => ({ ...f, kind }))}
            />
            <Field
              field={{
                type: "select",
                blank: t("anyStatus"),
                options: ["PENDING", "COMPLETED", "REJECTED", "CANCELLED"].map((k) => ({
                  value: k,
                  label: t(`transferStatus_${k}`),
                })),
              }}
              value={filters.status}
              onChange={(status) => setFilters((f) => ({ ...f, status }))}
            />
          </div>
          <TransferTable
            query={Object.fromEntries(Object.entries(filters).filter(([, v]) => v))}
            onChanged={waiting.reload}
          />
        </Section>
      )}
    </div>
  );
}

// Transfers for a query (latest first, at most 200), read again every
// QUEUE_EVERY and after an action.
function TransferTable({ query, keep, onChanged }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const key = JSON.stringify(query);
  // Read again on a timer, so a refusal shows here rather than as a toast
  // every time.
  const load = useCallback(
    () =>
      tellerApi
        .transfers(scope(JSON.parse(key)))
        .then((r) => {
          setRows(Array.isArray(r?.data) ? r.data : []);
          setError("");
        })
        .catch((e) => {
          setRows((prev) => prev ?? []);
          setError(e.message);
        }),
    [key, scope],
  );
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), QUEUE_EVERY);
    return () => window.clearInterval(timer);
  }, [load]);
  if (!rows) return <PageSkeleton />;
  return (
    <TransferRows
      rows={keep ? rows.filter(keep) : rows}
      empty={error || t("noTransfers")}
      onChanged={() => {
        void load();
        onChanged?.();
      }}
    />
  );
}

// Transfer rows with the buttons the server allows (actions): Approve a
// requisition, Accept a return or transfer, Reject with a reason, Cancel
// one's own.
function TransferRows({ rows, empty, onChanged }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [deciding, setDeciding] = useState(null);
  const decide = async (note) => {
    const { verb, row } = deciding;
    try {
      const r = await tellerApi[`transfer_${verb}`](
        scope({ transfer_id: row.id, ...(note ? { note } : {}) }),
      );
      if (r?.message) notifications.success(r.message);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setDeciding(null);
      onChanged?.();
    }
  };
  const fromTo = (code, kind) => (
    <span className="text-xs">
      <b className="font-mono">{code}</b>{" "}
      <span className="text-muted-foreground">{kindLabel(t, kind)}</span>
    </span>
  );
  return (
    <>
      <MiniTable
        rows={rows}
        rowKey={(r) => r.id}
        empty={empty ?? t("noTransfers")}
        columns={[
          {
            key: "requested_at",
            label: t("requested"),
            render: (r) => (
              <span className="text-xs leading-tight">
                <b className="block">{accountDate(r.requested_at)}</b>
                <span className="text-muted-foreground">{r.requested_by}</span>
              </span>
            ),
          },
          {
            key: "kind",
            label: t("kind"),
            render: (r) => <span className="text-xs font-semibold">{t(`transfer_${r.kind}`)}</span>,
          },
          { key: "from", label: t("from"), render: (r) => fromTo(r.from_till_code, r.from_till_kind) },
          { key: "to", label: t("to"), render: (r) => fromTo(r.to_till_code, r.to_till_kind) },
          {
            key: "amount",
            label: t("amount"),
            align: "right",
            render: (r) => <b className="tabular-nums">{money(r.amount, r.currency)}</b>,
          },
          {
            key: "reference",
            label: t("reference"),
            wrap: true,
            render: (r) => (
              <span className="text-xs leading-tight">
                <span className="block font-mono">{r.reference}</span>
                {r.narration && <span className="text-muted-foreground">{r.narration}</span>}
              </span>
            ),
          },
          {
            key: "status",
            label: t("status"),
            wrap: true,
            render: (r) => (
              <span className="text-xs leading-tight">
                <StatusBadge status={r.status} />
                {r.status === "PENDING" && !r.actions?.approve && (
                  <span className="mt-0.5 block text-muted-foreground">
                    {r.kind === "TRANSFER"
                      ? t("waitingFor", { code: r.to_till_code })
                      : t("waitingForCustodian")}
                  </span>
                )}
                {r.decided_by && r.status !== "PENDING" && (
                  <span className="mt-0.5 block text-muted-foreground">
                    {r.decided_by} · {accountDate(r.decided_at)}
                  </span>
                )}
                {r.decision_note && (
                  <span className="mt-0.5 block italic text-muted-foreground">{r.decision_note}</span>
                )}
                {r.rrn && <span className="mt-0.5 block font-mono text-[10px]">{r.rrn}</span>}
              </span>
            ),
          },
          {
            key: "actions",
            label: "",
            render: (r) => (
              <span className="flex flex-wrap justify-end gap-1">
                {r.actions?.approve && (
                  <Button
                    size="sm"
                    icon={CheckCircle2}
                    onClick={() => setDeciding({ verb: "approve", row: r })}
                  >
                    {t(r.kind === "REQUISITION" ? "approve" : "accept")}
                  </Button>
                )}
                {r.actions?.reject && (
                  <Button
                    size="sm"
                    variant="danger"
                    icon={XCircle}
                    onClick={() => setDeciding({ verb: "reject", row: r })}
                  >
                    {t("reject")}
                  </Button>
                )}
                {r.actions?.cancel && (
                  <Button
                    size="sm"
                    variant="outline"
                    icon={Undo2}
                    onClick={() => setDeciding({ verb: "cancel", row: r })}
                  >
                    {t("cancelRequest")}
                  </Button>
                )}
              </span>
            ),
          },
        ]}
      />
      {deciding && (
        <NarrationDialog
          title={t(`decide_${deciding.verb}`, {
            amount: money(deciding.row.amount, deciding.row.currency),
            from: deciding.row.from_till_code,
            to: deciding.row.to_till_code,
          })}
          hint={t(`decideHint_${deciding.verb}`)}
          confirmLabel={t(
            deciding.verb === "approve"
              ? deciding.row.kind === "REQUISITION"
                ? "approve"
                : "accept"
              : deciding.verb === "reject"
                ? "reject"
                : "cancelRequest",
          )}
          variant={deciding.verb === "approve" ? "primary" : "danger"}
          required={deciding.verb === "reject"}
          onClose={() => setDeciding(null)}
          onSave={decide}
        />
      )}
    </>
  );
}
