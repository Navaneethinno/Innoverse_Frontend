import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  HandCoins,
  Landmark,
  LockKeyhole,
  Plus,
  Unlock,
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
import { useMasterCurrencies } from "@/Hooks/Institution/institutionCurrencyHooks";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import { useMenuPermission, usePagePermission } from "@/Hooks/usePermission";
import { useServerList } from "@/Hooks/useServerList";
import { tellerApi } from "@/Services/Accounting/accounting.api";
import { recordOf } from "@/Services/Loans/loans.api";
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

// FINANCE › Teller (menu 196): tills and vaults per branch and currency, and
// the teller's desk. Working a till is the Self action: open it with a
// count, take deposits, withdrawals and loan repayments, move cash to and
// from the vault, close it with a count (a different count posts a variance).
export function Teller() {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const [tab, setTab] = useState(can("Self") ? "desk" : "tills");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <PageTitle>{t("tellerTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("tellerSubtitle")}</p>
      </div>
      <Tabs
        tabs={[{ key: "desk" }, { key: "tills" }]}
        value={tab}
        onChange={setTab}
        labelOf={(k) => t(`tellerTab_${k}`)}
      />
      {tab === "desk" ? <Desk /> : <TillList />}
    </div>
  );
}

const kindLabel = (t, kind) => t(`kind_${kind}`, { defaultValue: kind });
const sessionOwner = (s) => s?.user_name ?? "—";
const sessionOwnerId = (s) => String(s?.user_id ?? "");

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
      render: (r) => <span className="text-xs font-semibold">{kindLabel(t, r.kind)}</span>,
    },
    {
      key: "branch_name",
      label: t("branch"),
      render: (r) => <span className="text-xs">{r.branch_name}</span>,
    },
    {
      key: "balance",
      label: t("balance"),
      render: (r) => (
        <span className="text-xs leading-tight tabular-nums">
          <b className="block">{money(r.balance, r.currency)}</b>
          <span className="text-[10px] text-muted-foreground">
            {t("limitOf", { amount: money(r.cash_limit, r.currency) })}
          </span>
        </span>
      ),
    },
    {
      key: "session",
      label: t("session"),
      sortable: false,
      render: (r) =>
        r.kind === "VAULT" ? (
          "—"
        ) : r.session ? (
          <span className="text-xs leading-tight">
            <b className="block text-emerald-700">
              {t("openBy", { name: sessionOwner(r.session) })}
            </b>
            <span className="text-[10px] text-muted-foreground">
              {accountDate(r.session.opened_at)}
            </span>
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{t("closedTill")}</span>
        ),
    },
    { key: "status", label: t("status"), render: (r) => <StatusBadge status={r.status} /> },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <span className="flex items-center gap-1">
          <RowActions
            buttons={{
              view: true,
              edit: r.status === "ACTIVE",
              deactivate: r.status === "ACTIVE" && !r.session,
              activate: r.status !== "ACTIVE",
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
            <Button size="sm" icon={Plus} onClick={() => setEditing({})}>
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
        </label>
      </div>
      {!till && form.kind === "VAULT" && (
        <p className="mt-3 text-xs text-muted-foreground">{t("oneVaultHint")}</p>
      )}
    </Modal>
  );
}

// A till: its facts, the open session's movements and its last sessions.
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
              [t("kind"), kindLabel(t, till.kind)],
              [t("branch"), till.branch_name],
              [t("balance"), money(till.balance, till.currency)],
              [t("cashLimit"), money(till.cash_limit, till.currency)],
              [t("glAccount"), `${till.gl_account_name ?? ""} · ${till.acct_num ?? ""}`],
              [t("status"), <StatusBadge key="s" status={till.status} />],
            ]}
          />
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
            </div>
          )}
          {till.session && (
            <Section title={t("openSession", { name: sessionOwner(till.session) })}>
              <Movements session={till.session} currency={till.currency} />
            </Section>
          )}
          <Section title={t("lastSessions")}>
            <SessionTable sessions={till.sessions ?? []} currency={till.currency} />
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
          key: "opened_by",
          label: t("teller"),
          render: (s) => <span className="text-xs">{sessionOwner(s)}</span>,
        },
        {
          key: "closed_at",
          label: t("closed"),
          render: (s) => (
            <span className="text-xs">{s.closed_at ? accountDate(s.closed_at) : "—"}</span>
          ),
        },
        {
          key: "opening_count",
          label: t("openingCount"),
          align: "right",
          render: (s) => money(s.opening_counted, currency),
        },
        {
          key: "closing_count",
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
      ]}
    />
  );
}

const Variance = ({ value, currency }) => {
  const n = Number(value);
  if (value == null || value === "") return "—";
  return (
    <b className={cn(n < 0 && "text-red-700", n > 0 && "text-amber-700")}>
      {money(value, currency)}
    </b>
  );
};

// The open session's cash in / out and every movement, newest first.
function Movements({ session, currency }) {
  const { t } = useTranslation("corebank");
  return (
    <div className="grid gap-3">
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
            render: (m) => (
              <span className="text-xs font-semibold">{m.description ?? m.txn_type}</span>
            ),
          },
          {
            key: "rrn",
            label: t("reference"),
            render: (m) => <span className="font-mono text-xs">{m.rrn}</span>,
          },
          {
            key: "amount",
            label: t("amount"),
            align: "right",
            render: (m) => (
              <b
                className={cn(
                  // DR is cash into the till, CR is cash out.
                  m.op === "CR" ? "text-red-700" : "text-emerald-700",
                )}
              >
                {money(m.amount, currency)}
              </b>
            ),
          },
        ]}
      />
    </div>
  );
}

// The teller's own open till, or the tills of their branch to open one.
function Desk() {
  const { t } = useTranslation("corebank");
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const me = useOwnIds().userId;
  const [tills, setTills] = useState(null);
  const [till, setTill] = useState(null);
  const [dialog, setDialog] = useState(null);
  const load = useCallback(async () => {
    try {
      const r = await tellerApi.list(scope({ status: "ACTIVE", limit: 100 }));
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
  };

  if (!tills) return <PageSkeleton />;
  if (!can("Self"))
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("notATeller")}</p>;
  if (!till) {
    const closed = tills.filter((x) => x.kind === "TILL" && !x.session);
    return (
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
    );
  }
  const vaults = tills.filter(
    (x) =>
      x.kind === "VAULT" && x.branch_id === till.branch_id && x.currency_id === till.currency_id,
  );
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
            {[
              till.branch_name,
              t("limitOf", { amount: money(till.cash_limit, till.currency) }),
            ].join(" · ")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            {t("inTheTill")}
          </p>
          <p className="text-2xl font-black tabular-nums">{money(till.balance, till.currency)}</p>
        </div>
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
          vaults.length > 0 && {
            key: "transfer",
            label: t("vaultTransfer"),
            icon: ArrowLeftRight,
            run: () => setDialog({ kind: "transfer" }),
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
      <Section title={t("thisSession")}>
        {till.session && <Movements session={till.session} currency={till.currency} />}
      </Section>
      {dialog?.kind === "close" && (
        <CountDialog verb="close" till={till} onClose={() => setDialog(null)} onDone={done} />
      )}
      {dialog && dialog.kind !== "close" && (
        <MoneyDialog
          kind={dialog.kind}
          till={till}
          vaults={vaults}
          onClose={() => setDialog(null)}
          onDone={done}
        />
      )}
    </div>
  );
}

// Open or close a till with the cash counted; closing may count by note.
function CountDialog({ verb, till, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState([]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fromNotes = notes.reduce((sum, n) => sum + Number(n.value || 0) * Number(n.count || 0), 0);
  const amount = notes.length ? fromNotes.toFixed(2) : counted;
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
      const session = recordOf(r)?.session ?? recordOf(r);
      notifications.success(
        Number(session?.variance)
          ? t("closedWithVariance", { amount: money(session.variance, till.currency) })
          : r?.message,
      );
      onDone();
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
            disabled={amount === ""}
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
      <label className={labelClass}>
        {t("counted")}
        <AmountInput
          className={cn(inputClass, "mt-1.5")}
          value={amount}
          onChange={(v) => !notes.length && setCounted(v)}
        />
      </label>
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

// A cash deposit / withdrawal on a customer account, a loan repayment, or a
// transfer with the branch's vault; the slip number is the reference.
function MoneyDialog({ kind, till, vaults, onClose, onDone }) {
  const { t } = useTranslation("corebank");
  const { scope } = useInstitutionScope();
  const [target, setTarget] = useState(null);
  const [direction, setDirection] = useState("TO_VAULT");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const vault = vaults[0];
  const ready = Number(amount) > 0 && reference && (kind === "transfer" || target);
  const save = async () => {
    setBusy(true);
    try {
      const common = { amount, reference, narration: narration.trim() };
      const body =
        kind === "transfer"
          ? {
              ...common,
              from_till_id: direction === "TO_VAULT" ? till.id : vault.id,
              to_till_id: direction === "TO_VAULT" ? vault.id : till.id,
            }
          : kind === "loan_repay"
            ? { ...common, id: till.id, facility_id: target.id }
            : { ...common, id: till.id, acct_id: target.id };
      const r = await tellerApi[kind](scope(body));
      if (r?.message) notifications.success(r.message);
      onDone();
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
        {kind === "transfer" ? (
          <label className={labelClass}>
            {t("direction")}
            <Field
              field={{
                type: "select",
                options: [
                  { value: "TO_VAULT", label: t("toVault", { code: vault.code }) },
                  { value: "FROM_VAULT", label: t("fromVault", { code: vault.code }) },
                ],
              }}
              value={direction}
              onChange={setDirection}
            />
          </label>
        ) : (
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
        {kind === "withdraw" && (
          <p className="text-xs text-muted-foreground">
            {t("withdrawHint", { amount: money(till.balance, till.currency) })}
          </p>
        )}
      </div>
    </Modal>
  );
}
