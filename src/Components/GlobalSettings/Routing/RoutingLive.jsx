import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, CheckCircle2, Play, RefreshCw, Undo2, XCircle } from "lucide-react";
import { CopyButton } from "@/Components/Common/CopyButton";
import { ListTable } from "@/Components/Common/ListView";
import { Modal } from "@/Components/Common/Modal";
import { useServerList } from "@/Hooks/useServerList";
import { RowActions } from "@/Components/Common/RowActions";
import { Button } from "@/Components/Common/Button";
import { Spinner } from "@/Components/Common/Spinner";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { ActionButtons, NarrationDialog, Section, inputClass, labelClass } from "@/Components/Finance/Deposits/depositShared";
import { Field, MiniTable } from "@/Components/Finance/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { routingApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { CARD_DIRECTIONS } from "./routingShared";
import { useRoutingOptions } from "./RoutingSetup";

// The live side of routing: each interface's health (with the operator's
// emergency switch), the simulator and the decisions log. All read the
// authorised setup of the institution in scope.

const STATE_TONES = {
  UP: "bg-emerald-50 text-emerald-700",
  DOWN: "bg-red-50 text-red-700",
  PROBING: "bg-amber-50 text-amber-700",
  FORCED_DOWN: "border border-red-500 text-red-700",
  FORCED_UP: "border border-emerald-500 text-emerald-700",
};
export function HealthBadge({ state }) {
  const { t } = useTranslation("routing");
  if (!state) return null;
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black", STATE_TONES[state] ?? "bg-muted text-muted-foreground")}>{t(`state_${state}`, { defaultValue: state })}</span>;
}

const REFRESH_MS = 20000;

export function HealthBoard({ scope }) {
  const { t } = useTranslation("routing");
  const can = usePagePermission();
  const [rows, setRows] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => {
    routingApi
      .health(scope())
      .then((r) => setRows(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
  }, [scope]);
  // Refreshed every 20 s while the board is open.
  useEffect(() => {
    load();
    const timer = window.setInterval(load, REFRESH_MS);
    return () => window.clearInterval(timer);
  }, [load]);
  const set = async (row, override, reason) => {
    setBusy(true);
    try {
      setRows(rowsOf(await routingApi.health_set(scope({ interface: row.interface, override, reason: reason ?? "" }))));
      notifications.success(t(`override_${override || "CLEAR"}_done`, { name: row.name }));
      setDialog(null);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  if (!rows) return <Spinner size={16} />;
  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t("healthHint")}</p>
        <Button size="sm" variant="ghost" icon={RefreshCw} onClick={load}>
          {t("refresh")}
        </Button>
      </div>
      {!rows.length && <p className="py-6 text-center text-sm text-muted-foreground">{t("noInterfaces")}</p>}
      {rows.map((h) => (
        <div key={h.interface} className="rounded-2xl border border-border bg-card p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold">
                {h.name} <span className="font-mono text-xs font-normal text-muted-foreground">{h.interface}</span>
                <HealthBadge state={h.state} />
                {!h.active && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{t("off")}</span>}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {[
                  t(`kind_${h.kind}`, { defaultValue: h.kind }),
                  h.provider,
                  h.groups?.length && t("inGroups", { groups: h.groups.join(", ") }),
                  h.failures ? t("failuresInRow", { count: h.failures }) : null,
                  h.state === "DOWN" && h.retry_at && t("retryAt", { at: accountDate(h.retry_at) }),
                  h.down_since && t("downSince", { at: accountDate(h.down_since) }),
                  t("lastOk", { at: h.last_ok_at ? accountDate(h.last_ok_at) : "—" }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {h.last_error && <p className="mt-1 break-all font-mono text-[11px] text-red-700">{h.last_error}</p>}
              {h.override && <p className="mt-1 text-[11px] font-semibold text-amber-800">{t("overrideBy", { state: t(`override_${h.override}`), by: h.override_by, at: accountDate(h.override_at), reason: h.override_reason })}</p>}
            </div>
            {can("Change Status") && (
              <ActionButtons
                busy={busy}
                buttons={[
                  h.override !== "DOWN" && { key: "down", label: t("stopSending"), icon: Ban, variant: "danger", run: () => setDialog({ row: h, override: "DOWN" }) },
                  h.override !== "UP" && { key: "up", label: t("forceUp"), icon: CheckCircle2, run: () => setDialog({ row: h, override: "UP" }) },
                  h.override && { key: "clear", label: t("clearOverride"), icon: Undo2, run: () => void set(h, "") },
                ]}
              />
            )}
          </div>
        </div>
      ))}
      {dialog && (
        <NarrationDialog
          title={t(`override_${dialog.override}_title`, { name: dialog.row.name })}
          hint={t(`override_${dialog.override}_hint`)}
          confirmLabel={t(dialog.override === "DOWN" ? "stopSending" : "forceUp")}
          variant={dialog.override === "DOWN" ? "danger" : "primary"}
          label={t("reasonRequired")}
          required
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(reason) => set(dialog.row, dialog.override, reason)}
        />
      )}
    </div>
  );
}

const OUTCOME_TONES = { ROUTED: "bg-emerald-50 text-emerald-700", DEFAULT: "bg-slate-100 text-slate-700", NO_ROUTE: "bg-red-50 text-red-700", ISSUER_UNSUPPORTED: "bg-red-50 text-red-700" };
const Outcome = ({ value }) => {
  const { t } = useTranslation("routing");
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-black", OUTCOME_TONES[value] ?? "bg-muted")}>{t(`outcome_${value}`, { defaultValue: value })}</span>;
};

// Where a transaction would go, without sending anything (live routing only).
export function Simulator({ scope, instProfileId }) {
  const { t } = useTranslation("routing");
  const options = useRoutingOptions(instProfileId);
  const [form, setForm] = useState({ direction: "SERVICE", txn_type: "", channel: "", service: "", card_number: "", product_class: "", amount: "", currency: "" });
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  const card = CARD_DIRECTIONS.includes(form.direction);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const run = async () => {
    setBusy(true);
    try {
      const body = Object.fromEntries(Object.entries({ ...form, service: form.direction === "SERVICE" ? form.service : "", card_number: card ? form.card_number.replace(/\D/g, "") : "", product_class: card ? form.product_class : "" }).filter(([, v]) => v !== ""));
      setAnswer(rowsOf(await routingApi.simulate(scope(body)))[0] ?? null);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  if (!options) return <Spinner size={16} />;
  const select = (key, label, list, blankLabel) => (
    <label className={labelClass}>
      {label}
      <Field field={{ type: "select", blank: blankLabel, options: list }} value={form[key]} onChange={set(key)} />
    </label>
  );
  return (
    <div className="grid gap-4">
      <Section title={t("simulate")}>
        <p className="mb-3 text-xs text-muted-foreground">{t("simulateLiveHint")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {select("direction", t("direction"), (options.directions ?? []).map((d) => ({ value: d, label: t(`direction_${d}`, { defaultValue: d }) })))}
          {select("txn_type", t("txnType"), (options.txn_types ?? []).map((x) => ({ value: x.code, label: x.name })), t("any"))}
          {select("channel", t("channel"), (options.channels ?? []).map((c) => ({ value: c, label: c })), t("any"))}
          {form.direction === "SERVICE" && select("service", t("service"), (options.providers ?? []).filter((p) => !p.connection_only).map((p) => ({ value: p.code, label: p.name })), t("choose"))}
          {card && (
            <label className={labelClass}>
              {t("cardNumber")}
              <input className={cn(inputClass, "mt-1 font-mono")} inputMode="numeric" autoComplete="off" maxLength={19} value={form.card_number} onChange={(e) => set("card_number")(e.target.value.replace(/\D/g, ""))} placeholder="541333" />
            </label>
          )}
          {card && select("product_class", t("productClass"), (options.product_classes ?? []).map((v) => ({ value: v, label: t(`class_${v}`, { defaultValue: v }) })), t("any"))}
          <label className={labelClass}>
            {t("amount")}
            <input className={cn(inputClass, "mt-1")} inputMode="decimal" value={form.amount} onChange={(e) => set("amount")(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0.00" />
          </label>
          {select("currency", t("currency"), (options.currencies ?? []).map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })), t("any"))}
        </div>
        <Button className="mt-3" icon={Play} loading={busy} disabled={form.direction === "SERVICE" && !form.service} onClick={() => void run()}>
          {t("whereWouldItGo")}
        </Button>
      </Section>
      {answer && <DecisionView decision={answer} />}
    </div>
  );
}

const REASONS = ["MEMBER_INACTIVE", "INTERFACE_INACTIVE", "PROVIDER_INACTIVE", "DOWN", "FORCED_DOWN", "TYPE_NOT_TAKEN", "AMOUNT_BAND"];

// One decision: outcome, why, the card, and every candidate in rank order.
export function DecisionView({ decision: d }) {
  const { t } = useTranslation("routing");
  const chosen = d.chosen_interface ?? d.chosen?.interface;
  return (
    <Section
      title={
        <span className="flex flex-wrap items-center gap-2">
          <Outcome value={d.outcome} /> {d.explain}
        </span>
      }
    >
      <dl className="mb-3 grid gap-2 text-xs sm:grid-cols-3">
        <Fact label={t("rule")} value={d.rule ? (d.rule_name ? `${d.rule_name} (${d.rule})` : d.rule) : "—"} />
        <Fact label={t("group")} value={d.group ? (d.group_name ? `${d.group_name} (${d.group})` : d.group) : "—"} />
        <Fact label={t("setupVersion")} value={d.setup_version ?? "—"} />
        {d.card && (
          <>
            <Fact label={t("card")} value={<span className="font-mono">{d.card.pan_masked}</span>} />
            <Fact label={t("onUs")} value={t(d.card.on_us ? "onUs_OURS" : "onUs_OTHERS")} />
            <Fact label={t("issuer")} value={d.card.known === false ? t("unknownIssuer") : [d.card.issuer_name, d.card.issuer, d.card.network, d.card.range].filter(Boolean).join(" · ")} />
          </>
        )}
      </dl>
      <MiniTable
        rows={d.candidates ?? []}
        rowKey={(c) => c.interface}
        empty={t("noCandidates")}
        rowClass={(c) => c.interface === chosen && "bg-emerald-50 font-semibold"}
        columns={[
          { key: "rank", label: "#" },
          { key: "name", label: t("interface"), render: (c) => <span>{c.name} <span className="font-mono text-muted-foreground">{c.interface}</span></span> },
          { key: "kind", label: t("kind"), render: (c) => t(`kind_${c.kind}`, { defaultValue: c.kind }) },
          { key: "eligible", label: t("eligible"), render: (c) => (c.eligible ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-red-600" />) },
          { key: "reason", label: t("why"), render: (c) => (c.reason ? t(REASONS.includes(c.reason) ? `reason_${c.reason}` : "reason_other", { defaultValue: c.reason, code: c.reason }) : "—") },
          { key: "health", label: t("health"), render: (c) => <HealthBadge state={c.health} /> },
        ]}
      />
    </Section>
  );
}

const Fact = ({ label, value }) => (
  <div className="rounded-xl border border-border px-3 py-2">
    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="mt-0.5 font-semibold">{value}</dd>
  </div>
);

// A code with today's name over it; the code alone once the name is gone.
const Named = ({ code, name }) =>
  code ? (
    <span className="leading-tight">
      {name && <span className="block">{name}</span>}
      <span className={cn("font-mono", name && "text-[10px] text-muted-foreground")}>{code}</span>
    </span>
  ) : (
    "—"
  );

// The log of routed transactions, newest first, on the shared list (tabs by
// outcome, direction / channel / type filters, dates, search by reference,
// RRN, wallet, codes or card). A row shows what matters at a glance; its
// View opens the whole decision (rule, group, candidates).
export function Decisions({ instProfileId }) {
  const { t } = useTranslation("routing");
  const options = useRoutingOptions(instProfileId);
  const txnName = (code) => options?.txn_types?.find((x) => x.code === code)?.name ?? code;
  const [open, setOpen] = useState(null);
  const list = useServerList({ api: routingApi.decisionsPath, call: routingApi.decisions, prefix: "dec_" });
  const hasCards = list.rows.some((d) => d.pan_masked);
  const columns = [
    { key: "created_at", label: t("time"), render: (d) => <span className="whitespace-nowrap text-xs">{accountDate(d.created_at)}</span> },
    { key: "outcome", label: t("outcome"), render: (d) => <Outcome value={d.outcome} /> },
    {
      key: "txn_type",
      label: t("transaction"),
      render: (d) => (
        <span className="text-xs leading-tight">
          <span className="block">{txnName(d.txn_type)}</span>
          <span className="text-[10px] text-muted-foreground">{[d.channel, t(`directionShort_${d.direction}`, { defaultValue: d.direction })].filter(Boolean).join(" · ")}</span>
        </span>
      ),
    },
    // Who paid and how much: the wallet (a card's masked number when it has one).
    {
      key: "amount",
      label: t("amountAndPayer"),
      render: (d) => (
        <span className="text-xs leading-tight">
          <span className="block font-semibold tabular-nums">{d.amount != null ? d.amount : "—"}</span>
          <span className="font-mono text-[10px] text-muted-foreground">{d.acct_num || (hasCards && d.pan_masked) || ""}</span>
        </span>
      ),
    },
    { key: "rule", label: t("rule"), render: (d) => <Named code={d.rule} name={d.rule_name} /> },
    { key: "chosen", label: t("chosen"), render: (d) => <Named code={d.chosen_interface} name={d.chosen_interface_name} /> },
    hasCards && {
      key: "card",
      label: t("card"),
      render: (d) =>
        d.pan_masked ? (
          <span className="text-xs leading-tight">
            <span className="block font-mono">{d.pan_masked}</span>
            <span className="text-[10px] text-muted-foreground">{[d.on_us != null && t(d.on_us ? "onUs_OURS" : "onUs_OTHERS"), d.issuer].filter(Boolean).join(" · ")}</span>
          </span>
        ) : (
          "—"
        ),
    },
    {
      key: "rrn",
      label: t("reference"),
      render: (d) =>
        d.rrn ? (
          <span className="inline-flex items-center gap-1 font-mono text-xs">
            {d.rrn} <CopyButton value={d.rrn} />
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">{d.client_reference || t("notPosted")}</span>
        ),
    },
    { key: "actions", label: t("actions"), sortable: false, render: (d) => <RowActions buttons={{ view: true }} onView={() => setOpen(d)} /> },
  ].filter(Boolean);
  return (
    <>
      <ListTable list={list} columns={columns} rowKey={(d) => d.id} title={t("tab_decisions")} emptyTitle={t("noDecisions")} />
      {open && (
        <Modal open onClose={() => setOpen(null)} size="xl" title={t("decisionTitle", { id: open.id, at: accountDate(open.created_at) })}>
          <DecisionView decision={open} />
          <dl className="mt-3 grid gap-1 text-[11px] text-muted-foreground">
            {[
              ["clientReference", open.client_reference],
              ["payerWallet", open.acct_num],
              ["idempotencyKeyLabel", open.idempotency_key],
            ]
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <div key={k} className="flex flex-wrap gap-1">
                  <dt className="font-semibold">{t(k)}:</dt>
                  <dd className="break-all font-mono">{v}</dd>
                </div>
              ))}
          </dl>
        </Modal>
      )}
    </>
  );
}
