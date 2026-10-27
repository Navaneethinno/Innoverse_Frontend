import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowRightLeft, CheckCircle2, ChevronDown, Landmark, PackageCheck, Plus, Truck, Undo2, XCircle } from "lucide-react";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { DateInput } from "@/Components/Common/DateInput";
import { Modal } from "@/Components/Common/Modal";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Toggle } from "@/Components/Common/Toggle";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Finance/Accounts/accountShared";
import { coreBankingApi, tellerApi, treasuryApi } from "@/Services/Accounting/accounting.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { usePagePermission } from "@/Hooks/usePermission";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog, Section, inputClass, labelClass } from "../Deposits/depositShared";
import { Field, MiniTable, Tabs, useInstitutionScope } from "../Loans/loanShared";
import { slipReference } from "../coreBankingShared";

const KINDS = ["CHEST_IN", "CHEST_OUT", "INTER_BRANCH"];
const STATUSES = ["REQUESTED", "APPROVED", "DISPATCHED", "RECEIVED", "REJECTED", "CANCELLED"];
const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : []);

// FINANCE › Treasury (menu 201): bulk cash between branch vaults and the
// currency chest (a settlement counterparty) or between branches, the
// position with each settlement counterparty, and what each branch owes the
// others through inter-branch suspense.
export function Treasury() {
  const { t } = useTranslation("treasury");
  const [tab, setTab] = useState("movements");
  return (
    <div className="pb-8 pt-4">
      <div className="mb-5" data-tour="page-title">
        <PageTitle icon={Landmark}>{t("title")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <Tabs tabs={[{ key: "movements" }, { key: "positions" }, { key: "interBranch" }]} value={tab} onChange={setTab} labelOf={(k) => t(`tab_${k}`)} />
      {tab === "movements" && <Movements />}
      {tab === "positions" && <Positions />}
      {tab === "interBranch" && <InterBranch />}
    </div>
  );
}

// A side of a movement: a vault (code, branch) or a counterparty.
const sideText = (m, side) =>
  m[`${side}_till_code`]
    ? `${m[`${side}_till_code`]} · ${m[`${side}_branch_name`] ?? ""}`
    : (m.counterparty_name ?? m.counterparty_code ?? "—");

// ---------------------------------------------------------------- movements

function Movements() {
  const { t } = useTranslation("treasury");
  const can = usePagePermission();
  const { scope } = useInstitutionScope();
  const [filters, setFilters] = useState({ status: "", kind: "", awaits_me: false });
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  const [adding, setAdding] = useState(false);
  const body = useMemo(() => Object.fromEntries(Object.entries(filters).filter(([, v]) => v)), [filters]);
  const load = useCallback(
    () =>
      treasuryApi.movements
        .list(scope(body))
        .then((r) => setRows(rowsOf(r)))
        .catch((e) => {
          setRows([]);
          notifications.error(e.message);
        }),
    [body, scope],
  );
  useEffect(() => {
    void load();
  }, [load]);
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  return (
    <div className="grid gap-3">
      <p className="text-xs text-muted-foreground">{t("movementsHint")}</p>
      <div className="flex flex-wrap items-center gap-2">
        <div className="w-44">
          <Field field={{ type: "select", blank: t("anyStatus"), options: STATUSES.map((v) => ({ value: v, label: t(`status_${v}`) })) }} value={filters.status} onChange={set("status")} />
        </div>
        <div className="w-44">
          <Field field={{ type: "select", blank: t("anyKind"), options: KINDS.map((v) => ({ value: v, label: t(`kind_${v}`) })) }} value={filters.kind} onChange={set("kind")} />
        </div>
        <span data-tour="treasury-awaits">
          <Toggle showLabel label={t("awaitingMe")} checked={filters.awaits_me} onChange={set("awaits_me")} />
        </span>
        {can("Add") && (
          <Button size="sm" icon={Plus} className="ml-auto" onClick={() => setAdding(true)} data-tour="add">
            {t("newMovement")}
          </Button>
        )}
      </div>
      {!rows ? (
        <PageSkeleton />
      ) : (
        <MiniTable
          rows={rows}
          rowKey={(m) => m.id}
          empty={t("noMovements")}
          columns={[
            {
              key: "reference",
              label: t("reference"),
              render: (m) => (
                <button type="button" className="font-mono text-xs font-bold text-primary hover:underline" onClick={() => setOpen(m.id)}>
                  {m.reference}
                </button>
              ),
            },
            { key: "kind", label: t("kind"), render: (m) => <span className="text-xs font-semibold">{t(`kind_${m.kind}`)}</span> },
            { key: "from", label: t("from"), wrap: true, render: (m) => <span className="text-xs">{sideText(m, "from")}</span> },
            { key: "to", label: t("to"), wrap: true, render: (m) => <span className="text-xs">{sideText(m, "to")}</span> },
            { key: "amount", label: t("amount"), align: "right", render: (m) => <b className="tabular-nums">{money(m.amount, m.currency)}</b> },
            { key: "status", label: t("status"), render: (m) => <StatusBadge status={m.status} /> },
            {
              key: "requested",
              label: t("requested"),
              render: (m) => (
                <span className="text-xs leading-tight">
                  <b className="block">{m.requested_by}</b>
                  <span className="text-muted-foreground">{accountDate(m.requested_at)}</span>
                </span>
              ),
            },
            {
              key: "received_amount",
              label: t("received"),
              align: "right",
              render: (m) =>
                m.received_amount ? (
                  <span className="text-xs leading-tight tabular-nums">
                    <b className="block">{money(m.received_amount, m.currency)}</b>
                    {Number(m.variance) !== 0 && <span className={cn(Number(m.variance) < 0 ? "text-red-700" : "text-amber-700")}>{money(m.variance, m.currency)}</span>}
                  </span>
                ) : (
                  "—"
                ),
            },
          ]}
        />
      )}
      {open && <MovementDetail id={open} onClose={() => setOpen(null)} onChanged={load} />}
      {adding && (
        <MovementForm
          onClose={() => setAdding(false)}
          onSaved={(m) => {
            setAdding(false);
            void load();
            if (m?.id) setOpen(m.id);
          }}
        />
      )}
    </div>
  );
}

// One movement: its timeline, and the step the server allows this user
// (actions): approve / reject, dispatch, receive with the count, cancel.
function MovementDetail({ id, onClose, onChanged }) {
  const { t } = useTranslation("treasury");
  const { scope } = useInstitutionScope();
  const [m, setM] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [counted, setCounted] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    treasuryApi.movements
      .get(scope({ id }))
      .then((r) => setM(recordOf(r)))
      .catch((e) => notifications.error(e.message));
  }, [id, scope]);
  const act = async (verb, body = {}) => {
    setBusy(true);
    try {
      const r = await treasuryApi.movements[verb](scope({ id, ...body }));
      const next = recordOf(r);
      if (verb === "receive" && Number(next?.variance)) notifications.info(t("receivedWithVariance", { amount: money(next.variance, next.currency) }));
      else if (r?.message) notifications.success(r.message);
      setDialog(null);
      setM(next ?? m);
      onChanged();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };
  const a = m?.actions ?? {};
  const difference = counted === "" || !m ? 0 : Number(counted) - Number(m.amount);
  return (
    <Modal open size="lg" onClose={onClose} title={m ? `${m.reference} · ${t(`kind_${m.kind}`)}` : t("movement")}>
      {!m ? (
        <PageSkeleton />
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusBadge status={m.status} />
            <ActionButtons
              busy={busy}
              buttons={[
                a.cancel && { key: "cancel", label: t("cancelRequest"), icon: Undo2, run: () => setDialog("cancel") },
                a.reject && { key: "reject", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
                a.approve && { key: "approve", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
                a.dispatch && { key: "dispatch", label: t("dispatch"), icon: Truck, variant: "primary", run: () => setDialog("dispatch") },
                a.receive && { key: "receive", label: t("receive"), icon: PackageCheck, variant: "primary", run: () => setDialog("receive") },
              ]}
            />
          </div>
          <Facts
            rows={[
              [t("from"), sideText(m, "from")],
              [t("to"), sideText(m, "to")],
              [t("amount"), money(m.amount, m.currency), "font-black"],
              m.received_amount && [t("received"), money(m.received_amount, m.currency)],
              m.variance != null && Number(m.variance) !== 0 && [t("variance"), money(m.variance, m.currency), Number(m.variance) < 0 ? "text-red-700" : "text-amber-700"],
              m.narration && [t("narration"), m.narration],
            ]}
          />
          <Section title={t("timeline")}>
            <ol className="grid gap-1.5 text-sm">
              {[
                ["requested", m.requested_by, m.requested_at],
                ["approved", m.approved_by, m.approved_at, m.decision_note],
                ["dispatched", m.dispatched_by, m.dispatched_at, m.dispatch_txn_id && `#${m.dispatch_txn_id}`],
                ["received", m.received_by, m.received_at, m.receive_txn_id && `#${m.receive_txn_id}`],
              ]
                .filter(([, , at]) => at)
                .map(([step, by, at, extra]) => (
                  <li key={step} className="flex flex-wrap gap-x-2">
                    <b>{t(`step_${step}`)}</b>
                    <span className="text-muted-foreground">{[by, accountDate(at)].filter(Boolean).join(" · ")}</span>
                    {extra && <span className="font-mono text-xs text-muted-foreground">{extra}</span>}
                  </li>
                ))}
              {["REJECTED", "CANCELLED"].includes(m.status) && (
                <li className="text-red-700">
                  <b>{t(`status_${m.status}`)}</b> {m.decision_note}
                </li>
              )}
            </ol>
          </Section>
        </div>
      )}
      {dialog === "auth" && <NarrationDialog title={t("approve")} hint={t("approveHint")} confirmLabel={t("approve")} busy={busy} onClose={() => setDialog(null)} onSave={(note) => act("auth", note ? { note } : {})} />}
      {dialog === "deauth" && <NarrationDialog title={t("reject")} confirmLabel={t("reject")} variant="danger" required busy={busy} onClose={() => setDialog(null)} onSave={(note) => act("deauth", { note })} />}
      {dialog === "cancel" && <NarrationDialog title={t("cancelRequest")} confirmLabel={t("cancelRequest")} variant="danger" busy={busy} onClose={() => setDialog(null)} onSave={(note) => act("cancel", note ? { note } : {})} />}
      {dialog === "dispatch" && (
        <Modal
          open
          onClose={() => setDialog(null)}
          title={t("dispatch")}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                {t("cancel")}
              </Button>
              <Button loading={busy} onClick={() => void act("dispatch")}>
                {t("dispatch")}
              </Button>
            </>
          }
        >
          <p className="text-sm text-muted-foreground">{t("dispatchHint", { amount: money(m.amount, m.currency) })}</p>
        </Modal>
      )}
      {dialog === "receive" && (
        <Modal
          open
          onClose={() => setDialog(null)}
          title={t("receive")}
          footer={
            <>
              <Button variant="ghost" onClick={() => setDialog(null)}>
                {t("cancel")}
              </Button>
              <Button loading={busy} disabled={counted === ""} onClick={() => void act("receive", { received_amount: counted })}>
                {t("receive")}
              </Button>
            </>
          }
        >
          <p className="mb-3 text-sm text-muted-foreground">{t("receiveHint", { amount: money(m.amount, m.currency) })}</p>
          <label className={labelClass}>
            {t("counted")}
            <AmountInput className={cn(inputClass, "mt-1.5")} value={counted} onChange={setCounted} />
          </label>
          {counted !== "" && difference !== 0 && (
            <p className={cn("mt-2 rounded-xl px-3 py-2 text-xs font-semibold", difference < 0 ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900")}>
              {t(difference < 0 ? "countShort" : "countOver", { amount: money(Math.abs(difference).toFixed(2), m.currency) })}
            </p>
          )}
        </Modal>
      )}
    </Modal>
  );
}

// A new movement: the kind first, which decides the two sides.
function MovementForm({ onClose, onSaved }) {
  const { t } = useTranslation("treasury");
  const { scope } = useInstitutionScope();
  const [vaults, setVaults] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [form, setForm] = useState({ kind: "CHEST_IN", from: "", to: "", counterparty: "", amount: "", reference: "", narration: "" });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    tellerApi
      .list(scope({ kind: "VAULT", status: "ACTIVE", limit: 200 }))
      .then((r) => setVaults(rowsOf(r).filter((v) => v.kind === "VAULT" && v.status === "ACTIVE")))
      .catch(() => setVaults([]));
    coreBankingApi
      .get(scope())
      .then((r) => setCounterparties(recordOf(r)?.setup?.treasury?.counterparties ?? []))
      .catch(() => setCounterparties([]));
  }, [scope]);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const vaultOptions = (list) => list.map((v) => ({ value: String(v.id), label: `${v.code} · ${v.branch_name} (${v.currency}, ${money(v.available ?? v.balance, v.currency)})` }));
  const source = vaults.find((v) => String(v.id) === form.from);
  // Inter-branch: another branch, the same currency.
  const destinations = form.kind === "INTER_BRANCH" ? vaults.filter((v) => source && v.branch_id !== source.branch_id && v.currency_id === source.currency_id) : vaults;
  const counterpartyField = (
    <label className={labelClass}>
      {t("counterparty")}
      <Field
        field={{ type: "select", blank: counterparties.length ? t("choose") : t("noCounterparties"), options: counterparties.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })) }}
        value={form.counterparty}
        onChange={set("counterparty")}
      />
    </label>
  );
  const vaultField = (key, list, label) => (
    <label className={labelClass}>
      {label}
      <Field field={{ type: "select", blank: list.length ? t("choose") : t("noVaults"), options: vaultOptions(list) }} value={form[key]} onChange={set(key)} />
    </label>
  );
  const ready =
    Number(form.amount) > 0 &&
    form.reference &&
    (form.kind === "CHEST_IN" ? form.counterparty && form.to : form.kind === "CHEST_OUT" ? form.from && form.counterparty : form.from && form.to);
  const save = async () => {
    setBusy(true);
    try {
      const r = await treasuryApi.movements.add(
        scope({
          kind: form.kind,
          ...(form.kind !== "CHEST_IN" ? { from_till_id: Number(form.from) } : {}),
          ...(form.kind !== "CHEST_OUT" ? { to_till_id: Number(form.to) } : {}),
          ...(form.kind !== "INTER_BRANCH" ? { counterparty_code: form.counterparty } : {}),
          amount: form.amount,
          reference: form.reference,
          ...(form.narration.trim() ? { narration: form.narration.trim() } : {}),
        }),
      );
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
      onClose={onClose}
      title={t("newMovement")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} onClick={() => void save()}>
            {t("request")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        <label className={labelClass}>
          {t("kind")}
          <Field
            field={{ type: "select", options: KINDS.map((v) => ({ value: v, label: t(`kind_${v}`) })) }}
            value={form.kind}
            onChange={(kind) => setForm((f) => ({ ...f, kind, from: "", to: "", counterparty: "" }))}
          />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t(`kindHint_${form.kind}`)}</span>
        </label>
        {form.kind === "CHEST_IN" && (
          <>
            {counterpartyField}
            {vaultField("to", vaults, t("toVault"))}
          </>
        )}
        {form.kind === "CHEST_OUT" && (
          <>
            {vaultField("from", vaults, t("fromVault"))}
            {counterpartyField}
          </>
        )}
        {form.kind === "INTER_BRANCH" && (
          <>
            {vaultField("from", vaults, t("fromVault"))}
            {vaultField("to", destinations, t("toVaultOtherBranch"))}
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={labelClass}>
            {t("amount")}
            <AmountInput className={cn(inputClass, "mt-1.5")} value={form.amount} onChange={set("amount")} />
          </label>
          <label className={labelClass}>
            {t("manifest")}
            <input className={cn(inputClass, "mt-1.5 font-mono")} value={form.reference} onChange={(e) => set("reference")(slipReference(e.target.value))} />
          </label>
        </div>
        <label className={labelClass}>
          {t("narration")}
          <input className={cn(inputClass, "mt-1.5")} maxLength={200} value={form.narration} onChange={(e) => set("narration")(e.target.value)} />
        </label>
      </div>
    </Modal>
  );
}

// ---------------------------------------------------------------- positions

const POSITION_TONE = {
  OK: "border-emerald-200 bg-emerald-50 text-emerald-800",
  SHORT: "border-amber-200 bg-amber-50 text-amber-900",
  BELOW_MINIMUM: "border-red-200 bg-red-50 text-red-800",
};

function Positions() {
  const { t } = useTranslation("treasury");
  const { scope } = useInstitutionScope();
  const [rows, setRows] = useState(null);
  useEffect(() => {
    treasuryApi
      .positions(scope({}))
      .then((r) => setRows(rowsOf(r)))
      .catch((e) => {
        setRows([]);
        notifications.error(e.message);
      });
  }, [scope]);
  if (!rows) return <PageSkeleton />;
  if (!rows.length) return <p className="py-8 text-center text-sm text-muted-foreground">{t("noPositions")}</p>;
  return (
    <div className="grid gap-3 lg:grid-cols-2" data-tour="treasury-positions">
      <p className="text-xs text-muted-foreground lg:col-span-2">{t("positionsHint")}</p>
      {rows.map((p) => (
        <PositionCard key={`${p.code}-${p.currency_id}`} p={p} />
      ))}
    </div>
  );
}

function PositionCard({ p }) {
  const { t } = useTranslation("treasury");
  const [open, setOpen] = useState(false);
  const m = (v) => money(v, p.currency);
  return (
    <section className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-black">
            {p.code} · {p.name}
          </p>
          <p className="text-xs text-muted-foreground">
            {t(`cpKind_${p.kind}`, { defaultValue: p.kind })} · {p.gl_name} · {p.currency}
          </p>
        </div>
        <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", POSITION_TONE[p.status] ?? POSITION_TONE.OK)}>{t(`pos_${p.status}`, { defaultValue: p.status })}</span>
      </div>
      <Facts
        rows={[
          [t("balance"), m(p.balance)],
          [t("obligations"), m(p.obligations)],
          [t("net"), m(p.net), "font-black"],
          [t("minimumBalance"), m(p.minimum_balance)],
          [t("headroom"), m(p.headroom), Number(p.headroom) < 0 ? "text-red-700 font-black" : "font-black"],
        ]}
      />
      {(p.obligation_gls ?? []).length > 0 && (
        <button type="button" onClick={() => setOpen((v) => !v)} className="mt-2 flex items-center gap-1 text-xs font-bold text-primary">
          <ChevronDown size={13} className={cn("transition-transform", open && "rotate-180")} /> {t("obligationGls")}
        </button>
      )}
      {open && (
        <ul className="mt-2 grid gap-1 text-xs">
          {p.obligation_gls.map((g) => (
            <li key={g.gl_account_id} className="flex justify-between gap-2">
              <span>{[g.gl_code, g.name].filter(Boolean).join(" · ")}</span>
              <b className="tabular-nums">{m(g.balance)}</b>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- inter-branch

function InterBranch() {
  const { t } = useTranslation("treasury");
  const { scope } = useInstitutionScope();
  const [asOf, setAsOf] = useState("");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    setRows(null);
    treasuryApi
      .inter_branch(scope(asOf ? { as_of: asOf } : {}))
      .then((r) => setRows(rowsOf(r)))
      .catch((e) => {
        setRows([]);
        notifications.error(e.message);
      });
  }, [asOf, scope]);
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="max-w-3xl text-xs text-muted-foreground">{t("interBranchHint")}</p>
        <label className={labelClass}>
          {t("asOf")}
          <DateInput className={cn(inputClass, "mt-1.5 w-44")} value={asOf} onChange={(e) => setAsOf(e.target.value)} />
        </label>
      </div>
      {!rows ? (
        <PageSkeleton />
      ) : !rows.length ? (
        <p className="py-8 text-center text-sm text-muted-foreground">{t("noInterBranch")}</p>
      ) : (
        rows.map((c) => (
          <Section key={c.currency_id} title={`${c.currency} · ${c.as_of ?? ""}`}>
            {!c.balanced && <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{t("notBalanced", { total: money(c.total, c.currency) })}</p>}
            <MiniTable
              rows={c.branches ?? []}
              rowKey={(b) => b.branch_id}
              columns={[
                { key: "branch", label: t("branch"), render: (b) => <span className="text-xs font-semibold">{b.branch_id ? `${b.branch_code} · ${b.branch_name}` : t("noBranch")}</span> },
                {
                  key: "balance",
                  label: t("balance"),
                  align: "right",
                  render: (b) => <b className={cn("tabular-nums", Number(b.balance) < 0 && "text-red-700")}>{money(b.balance, c.currency)}</b>,
                },
                { key: "meaning", label: "", render: (b) => <span className="text-xs text-muted-foreground">{Number(b.balance) > 0 ? t("owedToBranch") : Number(b.balance) < 0 ? t("branchOwes") : ""}</span> },
                { key: "legs", label: t("legs"), align: "right" },
              ]}
            />
            <p className={cn("mt-2 text-right text-sm font-black", c.balanced ? "text-emerald-700" : "text-red-700")}>
              <ArrowRightLeft size={13} className="mr-1 inline" />
              {t("total")}: {money(c.total, c.currency)}
            </p>
          </Section>
        ))
      )}
    </div>
  );
}
