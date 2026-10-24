import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowDown, ArrowLeft, ArrowUp, CheckCircle2, Pencil, Plus, Power, RotateCcw, Save, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DigitChips } from "@/Components/Common/DigitChips";
import { DragGrip, moveItem, useDragReorder } from "@/Components/Common/dragReorder";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { RowActions } from "@/Components/Common/RowActions";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { ActionButtons, AuditTimeline, NarrationDialog, Problems, Section, inputClass, labelClass } from "@/Components/Finance/Deposits/depositShared";
import { ProductStatus } from "@/Components/Finance/Settings/DepositProducts/productShared";
import { Field, MiniTable, RowsEditor, Tabs } from "@/Components/Finance/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { routingApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { CARD_DIRECTIONS, SECTIONS, code, groupFits, onUsIn, rangeProblem, specificity, toBody, toForm } from "./routingShared";

// The routing setups (one per institution, maker-checker as a whole, like
// External Providers): list, view (in effect, waiting, history) and editor.

export function useRoutingOptions(instProfileId) {
  const [options, setOptions] = useState(null);
  useEffect(() => {
    routingApi
      .options(instProfileId ? { inst_profile_id: instProfileId } : {})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setOptions({});
      });
  }, [instProfileId]);
  return options;
}

const yesNo = (t, on) => <span className={on ? "font-bold text-emerald-700" : "text-muted-foreground"}>{t(on ? "yes" : "no")}</span>;
const named = (list, value) => (list ?? []).find((x) => (x.code ?? x) === value)?.name ?? value;

export function SetupList({ scope, chooser, institution, onOpen }) {
  const { t } = useTranslation(["routing", "fees", "common"]);
  const can = usePagePermission();
  const [opening, setOpening] = useState(false);
  const list = useServerList({ api: routingApi.listPath, call: routingApi.list });
  // One setup per institution: Add opens the existing one when there is one.
  const add = async () => {
    setOpening(true);
    try {
      const id = rowsOf(await routingApi.options(scope()))[0]?.routing_setup_id;
      onOpen(id ? { kind: "view", id } : { kind: "edit", setup: null });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setOpening(false);
    }
  };
  const columns = [
    {
      key: "inst_profile_name",
      label: t("fees:institution"),
      align: "left",
      render: (s) => (
        <button type="button" onClick={() => onOpen({ kind: "view", id: s.id })} className="text-left text-xs font-bold text-primary hover:underline">
          {s.inst_profile_name}
        </button>
      ),
    },
    { key: "status", label: t("fees:status"), render: (s) => <ProductStatus product={s} /> },
    { key: "interface_count", label: t("interfaceCount"), render: (s) => <span className="text-xs tabular-nums">{s.interface_count ?? "—"}</span> },
    { key: "rule_count", label: t("ruleCount"), render: (s) => <span className="text-xs tabular-nums">{s.rule_count ?? "—"}</span> },
    { key: "updated_time", label: t("fees:updated"), render: (s) => <span className="whitespace-nowrap text-xs">{`${s.updated_by ?? s.created_by ?? ""} · ${accountDate(s.updated_time ?? s.created_time)}`}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (s) => <RowActions buttons={{ view: true }} onView={() => onOpen({ kind: "view", id: s.id })} /> },
  ];
  const actions = can("Add") && (
    <Button size="sm" icon={Plus} loading={opening} disabled={chooser && !institution} onClick={add}>
      {t("setUp")}
    </Button>
  );
  return <ListTable list={list} actions={actions} columns={columns} rowKey={(s) => s.id} title={t("setups")} emptyTitle={t("noSetups")} emptyDescription={t("noSetupsHint")} />;
}

// The five lists as tables; with `other`, rows new or changed are marked.
function ConfigTables({ config, other, options }) {
  const { t } = useTranslation("routing");
  const [tab, setTab] = useState("interfaces");
  const changed = (key) => {
    if (!other) return () => undefined;
    const before = new Set((other[key] ?? []).map((x) => JSON.stringify(x)));
    return (r) => (before.has(JSON.stringify(r)) ? undefined : "bg-amber-50");
  };
  const c = config ?? {};
  const tabs = SECTIONS.map((key) => ({ key, count: (c[key] ?? []).length }));
  const ifaceName = (v) => (c.interfaces ?? []).find((x) => x.code === v)?.name ?? v;
  const tables = {
    interfaces: [
      { key: "name", label: t("interface"), render: (x) => <span><b>{x.name}</b> <span className="font-mono text-muted-foreground">{x.code}</span></span> },
      { key: "kind", label: t("kind"), render: (x) => t(`kind_${x.kind}`, { defaultValue: x.kind }) },
      { key: "target", label: t("connectsTo"), render: (x) => (x.kind === "PROVIDER" ? named(options?.providers, x.provider) : x.kind === "CARD_NETWORK" ? [x.network, x.acquirer_id && t("acquirerShort", { id: x.acquirer_id })].filter(Boolean).join(" · ") : t("ourAuthorisation")) },
      { key: "txn_types", label: t("takes"), render: (x) => (x.txn_types?.length ? x.txn_types.map((v) => named(options?.txn_types, v)).join(", ") : t("anyType")) },
      { key: "down", label: t("downAfter"), render: (x) => t("downRule", { n: x.failure_threshold, s: x.cooldown_seconds }) },
      { key: "cost_note", label: t("costNote"), wrap: true, render: (x) => x.cost_note || "—" },
      { key: "active", label: t("active"), render: (x) => yesNo(t, x.active) },
    ],
    issuers: [
      { key: "name", label: t("issuer"), render: (x) => <span><b>{x.name}</b> <span className="font-mono text-muted-foreground">{x.code}</span></span> },
      { key: "network", label: t("network"), render: (x) => named(options?.card_networks, x.network) || "—" },
      { key: "country", label: t("country"), render: (x) => x.country || "—" },
      { key: "active", label: t("active"), render: (x) => yesNo(t, x.active) },
    ],
    bin_ranges: [
      { key: "issuer", label: t("issuer"), render: (x) => named(c.issuers, x.issuer) },
      { key: "range", label: t("binRange"), render: (x) => <span className="font-mono">{x.low === x.high || !x.high ? x.low : `${x.low} – ${x.high}`}</span> },
      { key: "product_class", label: t("productClass"), render: (x) => x.product_class || t("any") },
      { key: "active", label: t("active"), render: (x) => yesNo(t, x.active) },
    ],
    route_groups: [
      { key: "name", label: t("group"), render: (g) => <span><b>{g.name}</b> <span className="font-mono text-muted-foreground">{g.code}</span></span> },
      {
        key: "members",
        label: t("membersInOrder"),
        wrap: true,
        render: (g) =>
          [...(g.members ?? [])]
            .sort((a, b) => a.rank - b.rank)
            .map((m) => `${m.rank}. ${ifaceName(m.interface)}${m.min_amount || m.max_amount ? ` (${m.min_amount || "0"}–${m.max_amount || "∞"})` : ""}${m.active ? "" : ` · ${t("off")}`}`)
            .join("  →  ") || "—",
      },
      { key: "active", label: t("active"), render: (g) => yesNo(t, g.active) },
    ],
    rules: [
      { key: "name", label: t("rule"), render: (r) => <span><b>{r.name}</b> <span className="font-mono text-muted-foreground">{r.code}</span></span> },
      { key: "direction", label: t("direction"), render: (r) => t(`direction_${r.direction}`, { defaultValue: r.direction }) },
      { key: "matches", label: t("matches"), wrap: true, render: (r) => matchText(t, r, options, c) },
      { key: "group", label: t("group"), render: (r) => named(c.route_groups, r.group) },
      { key: "specificity", label: t("specificity"), render: (r) => <Badge>{r.specificity ?? specificity({ ...r, on_us: onUsIn(r.on_us) })}</Badge> },
      { key: "priority", label: t("priority"), align: "right" },
      { key: "active", label: t("active"), render: (r) => yesNo(t, r.active) },
    ],
  };
  return (
    <div>
      <Tabs tabs={tabs} value={tab} onChange={setTab} labelOf={(k) => t(`section_${k}`)} />
      {tab === "issuers" && <OurBins bins={options?.our_bins} />}
      <MiniTable rows={c[tab] ?? []} rowKey={(x, i) => x.code ?? `${x.issuer}-${x.low}-${i}`} empty={t("nothingHere")} rowClass={changed(tab)} columns={tables[tab]} />
    </div>
  );
}

// What a rule matches, in words: "Vodacom · APP · up to 500.00"; "anything" when nothing is set.
function matchText(t, r, options, c) {
  const card = CARD_DIRECTIONS.includes(r.direction);
  const onUs = onUsIn(r.on_us);
  const parts = [
    r.txn_type && named(options?.txn_types, r.txn_type),
    r.direction === "SERVICE" && r.service && named(options?.providers, r.service),
    card && onUs && t(`onUs_${onUs}`),
    card && r.network && named(options?.card_networks, r.network),
    card && r.issuer && named(c.issuers, r.issuer),
    card && r.product_class,
    r.channel,
    r.currency,
    (r.min_amount || r.max_amount) && `${r.min_amount || "0"}–${r.max_amount || "∞"}`,
  ].filter(Boolean);
  return parts.join(" · ") || t("anything");
}

const Badge = ({ children, tone = "bg-primary/10 text-primary" }) => <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-black tabular-nums", tone)}>{children}</span>;

function OurBins({ bins }) {
  const { t } = useTranslation("routing");
  return (
    <div className="mb-3 rounded-xl border border-border bg-muted/40 p-3">
      <p className="text-xs font-bold">{t("ourCards")}</p>
      <p className="mt-1 flex flex-wrap gap-1.5 text-[11px]">
        {bins?.length ? bins.map((b) => <span key={b.bin} className="rounded-full bg-card px-2 py-0.5 font-mono">{`${b.bin} · ${b.network}`}</span>) : <span className="text-muted-foreground">{t("noOurBins")}</span>}
      </p>
    </div>
  );
}

export function SetupView({ id, onBack, onEdit }) {
  const { t } = useTranslation(["routing", "fees", "deposits"]);
  const can = usePagePermission();
  const [s, setS] = useState(null);
  const [audit, setAudit] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);
  const options = useRoutingOptions(s?.inst_profile_id);

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([routingApi.get({ id }), routingApi.audit({ id }).catch(() => null)]);
      setS(rowsOf(got)[0] ?? null);
      setAudit(history ? rowsOf(history) : []);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [id]);
  useEffect(() => {
    void reload();
  }, [reload]);

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await routingApi[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      if (verb === "delete" && Number(s.status) === 9) return onBack();
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!s) return <PageSkeleton />;
  const a = s.actions ?? {};
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("fees:edit"), icon: Pencil, run: () => onEdit(s) },
    a.submit && can("Add") && { key: "submit", label: t("fees:submit"), icon: Send, variant: "outline", run: ask("submit") },
    a.deactivate && can("Change Status") && { key: "deactivate", label: t("fees:deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Change Status") && { key: "reactivate", label: t("fees:reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("fees:delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorise") && { key: "deauth", label: t("fees:reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorise") && { key: "auth", label: t("fees:approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToSetups")}
      </button>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{t("setupOf", { name: s.inst_profile_name })}</h1>
              <ProductStatus product={s} />
            </div>
            {s.narration && <p className="mt-1 text-xs text-muted-foreground">{s.narration}</p>}
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        <Warnings list={s.warnings} />
      </div>
      {s.pending ? (
        <div className="mb-4 grid gap-4">
          <Section title={t("fees:inEffect")}>
            <ConfigTables config={s.config} options={options} />
          </Section>
          <Section title={t("deposits:proposedBy", { action: t(`deposits:pending_${s.pending.action}`, { defaultValue: s.pending.action }), name: s.pending.proposed_by?.name ?? s.pending.proposed_by ?? "—", date: accountDate(s.pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
            {s.pending.config ? <ConfigTables config={s.pending.config} other={s.config} options={options} /> : <p className="text-sm text-muted-foreground">{t(`deposits:pendingHint_${s.pending.action}`, { defaultValue: "" })}</p>}
          </Section>
        </div>
      ) : (
        <Section title={s.draft ? t("fees:draft") : t("fees:inEffect")} className="mb-4">
          <ConfigTables config={s.draft ?? s.config} options={options} />
        </Section>
      )}
      <Section title={t("fees:history")}>
        <AuditTimeline audit={audit} />
      </Section>
      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "fees:approve" : dialog === "deauth" ? "fees:reject" : `fees:${dialog}`)}
          variant={["delete", "deauth", "deactivate"].includes(dialog) ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, narration)}
        />
      )}
    </div>
  );
}

// What submitting would be refused for, checked by the server without saving
// (each time the Review tab opens).
function ValidateResult({ id, body, scope }) {
  const { t } = useTranslation("routing");
  const [answer, setAnswer] = useState(null);
  const key = JSON.stringify(body);
  useEffect(() => {
    let cancelled = false;
    setAnswer(null);
    const sent = JSON.parse(key);
    routingApi
      .validate(id ? { id, ...sent } : scope(sent))
      .then((r) => !cancelled && setAnswer(rowsOf(r)[0] ?? {}))
      .catch((error) => !cancelled && setAnswer({ valid: false, warnings: [error.message] }));
    return () => {
      cancelled = true;
    };
  }, [id, key, scope]);
  if (!answer) return <p className="text-xs text-muted-foreground">{t("checking")}</p>;
  if (answer.valid && !answer.warnings?.length) return <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">{t("validOk")}</p>;
  return <Warnings list={answer.warnings} />;
}

function Warnings({ list }) {
  if (!list?.length) return null;
  return (
    <ul className="mt-3 grid gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
      {list.map((w) => (
        <li key={w} className="flex items-start gap-1.5">
          <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
        </li>
      ))}
    </ul>
  );
}

const EDIT_TABS = [...SECTIONS, "review"];
const blank = {
  interfaces: () => ({ code: "", name: "", kind: "PROVIDER", provider: "", network: "", txn_types: [], failover_codes: [], failure_threshold: "3", cooldown_seconds: "60", cost_note: "", active: true }),
  issuers: () => ({ code: "", name: "", country: "", network: "", active: true }),
  bin_ranges: () => ({ issuer: "", low: "", high: "", product_class: "", active: true }),
  rules: () => ({ code: "", name: "", direction: "SERVICE", txn_type: "", channel: "", service: "", on_us: "", network: "", issuer: "", product_class: "", currency: "", min_amount: "", max_amount: "", group: "", priority: "100", active: true }),
};

// Add or edit the setup, one tab per list, then Review. A new one, a Draft
// or a Rejected Add saves drafts and is submitted; an approved one proposes
// its changes in one edit. The server's problems are shown on their tab.
export function SetupEditor({ setup, scope, onClose, onSaved, onSimulate }) {
  const { t } = useTranslation(["routing", "fees", "deposits"]);
  const options = useRoutingOptions(setup?.inst_profile_id ?? scope().inst_profile_id);
  const [form, setForm] = useState(null);
  const [id, setId] = useState(setup?.id ?? null);
  const [tab, setTab] = useState("interfaces");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const drafting = !setup || [9, 5].includes(Number(setup.status));
  const started = useRef(false);

  useEffect(() => {
    if (!options || started.current) return;
    started.current = true;
    setForm(toForm(setup ? (setup.draft ?? setup.pending?.config ?? setup.config) : null));
  }, [options, setup]);

  const save = async (submit) => {
    setBusy(true);
    setError(null);
    try {
      let savedId = id;
      if (drafting) {
        const body = { ...toBody(form), is_draft: true };
        const response = id ? await routingApi.edit({ id, ...body }) : await routingApi.add(scope(body));
        savedId = rowsOf(response)[0]?.id ?? id;
        setId(savedId);
        if (!submit) {
          notifications.success(t("deposits:draftSaved"));
          return;
        }
      }
      const response = drafting ? await routingApi.submit({ id: savedId }) : await routingApi.edit({ id: savedId, ...toBody(form) });
      notifications.success(response?.message ?? t("deposits:submitted"));
      onSaved(savedId);
    } catch (e) {
      setError(e);
      // Open the first tab with a problem.
      const first = SECTIONS.find((s) => e.problemKeys?.some((k) => k.section === s));
      if (first) setTab(first);
    } finally {
      setBusy(false);
    }
  };

  if (!form || !options) return <PageSkeleton />;
  const set = (key) => (rows) => setForm((f) => ({ ...f, [key]: rows }));
  // Problems per tab: the server's (by section) and what is plainly unfinished here.
  const serverCount = (s) => error?.problemKeys?.filter((k) => k.section === s).length ?? 0;
  const local = {
    interfaces: form.interfaces.filter((x) => !code(x.code) || !String(x.name).trim() || (x.kind === "PROVIDER" && !x.provider) || (x.kind === "CARD_NETWORK" && !x.network)).length,
    issuers: form.issuers.filter((x) => !code(x.code) || !String(x.name).trim()).length,
    bin_ranges: form.bin_ranges.filter((x) => !x.issuer || rangeProblem(x)).length,
    route_groups: form.route_groups.filter((g) => !code(g.code) || !String(g.name).trim() || !g.members?.length || g.members.some((m) => !m.interface)).length,
    rules: form.rules.filter((r) => !code(r.code) || !String(r.name).trim() || !r.group).length,
  };
  const tabs = EDIT_TABS.map((key) => ({ key, count: key === "review" ? 0 : serverCount(key) + local[key] }));
  const ready = SECTIONS.every((s) => !local[s]);
  const ifaceChoices = form.interfaces.filter((x) => code(x.code)).map((x) => ({ value: code(x.code), label: `${x.name || x.code} (${code(x.code)})` }));
  const sectionMessages = (s) => (error?.problemKeys ?? []).map((k, i) => k.section === s && String(error.message).split("\n")[i + 1]).filter(Boolean);

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToSetups")}
      </button>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-800">{setup ? t("setupOf", { name: setup.inst_profile_name }) : t("setUp")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(drafting ? "draftHint" : "proposeHint")}</p>
      <Tabs tabs={tabs} value={tab} onChange={setTab} labelOf={(k) => (k === "review" ? t("review") : t(`section_${k}`))} />
      {tab !== "review" && sectionMessages(tab).length > 0 && (
        <ul className="mb-3 grid gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-800">
          {sectionMessages(tab).map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      {tab === "interfaces" && (
        <Section title={t("section_interfaces")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("interfacesHint")}</p>
          <RowsEditor
            rows={form.interfaces}
            onChange={set("interfaces")}
            blank={blank.interfaces}
            addLabel={t("addInterface")}
            columns="lg:grid-cols-4"
            fields={[
              { key: "code", label: t("fees:code"), type: "code", placeholder: "VODACOM_DIRECT" },
              { key: "name", label: t("fees:name"), placeholder: "Vodacom" },
              { key: "kind", label: t("kind"), type: "select", options: (options.kinds ?? []).map((k) => ({ value: k, label: t(`kind_${k}`, { defaultValue: k }) })) },
              { key: "provider", label: t("provider"), type: "select", blank: t("choose"), showIf: (x) => x.kind === "PROVIDER", options: (options.providers ?? []).map((p) => ({ value: p.code, label: `${p.name}${p.connection_only ? ` · ${t("connection")}` : ""}${p.active ? "" : ` · ${t("off")}`}` })) },
              { key: "network", label: t("network"), type: "select", blank: t("choose"), showIf: (x) => x.kind === "CARD_NETWORK", options: (options.networks ?? []).map((n) => ({ value: n, label: n })) },
              { key: "acquirer_id", label: t("acquirerId"), showIf: (x) => x.kind === "CARD_NETWORK", placeholder: "123456" },
              { key: "failure_threshold", label: t("failureThreshold"), type: "int" },
              { key: "cooldown_seconds", label: t("cooldownSeconds"), type: "int" },
              { key: "active", label: t("active"), type: "bool" },
              { key: "cost_note", label: t("costNote"), span: "sm:col-span-2 lg:col-span-4", placeholder: t("costNoteHint") },
              { key: "txn_types", label: t("takesTypes"), type: "multi", span: "sm:col-span-2 lg:col-span-4", options: (options.txn_types ?? []).map((x) => ({ value: x.code, label: x.name })) },
            ]}
            renderExtra={(x, patch) => (
              <label className={cn(labelClass, "mt-3 block border-t border-dashed border-border pt-3")}>
                {t("failoverCodes")} <span className="font-normal text-muted-foreground">· {t("failoverCodesHint")}</span>
                <DigitChips className="mt-1.5" letters value={x.failover_codes ?? []} onChange={(failover_codes) => patch({ failover_codes })} placeholder="E05" />
              </label>
            )}
          />
        </Section>
      )}

      {tab === "issuers" && (
        <div className="grid gap-4">
          <OurBins bins={options.our_bins} />
          <Section title={t("section_issuers")}>
            <p className="mb-3 text-xs text-muted-foreground">{t("issuersHint")}</p>
            <RowsEditor
              rows={form.issuers}
              onChange={set("issuers")}
              blank={blank.issuers}
              addLabel={t("addIssuer")}
              columns="lg:grid-cols-5"
              fields={[
                { key: "code", label: t("fees:code"), type: "code", placeholder: "BANK_X" },
                { key: "name", label: t("fees:name"), placeholder: "Bank X" },
                { key: "network", label: t("network"), type: "select", blank: t("choose"), options: (options.card_networks ?? []).map((n) => ({ value: n.code, label: n.name })) },
                { key: "country", label: t("country"), placeholder: "Mozambique" },
                { key: "active", label: t("active"), type: "bool" },
              ]}
            />
          </Section>
          <Section title={t("section_bin_ranges")}>
            <p className="mb-3 text-xs text-muted-foreground">{t("binRangesHint")}</p>
            <RowsEditor
              rows={form.bin_ranges}
              onChange={set("bin_ranges")}
              blank={blank.bin_ranges}
              addLabel={t("addRange")}
              columns="lg:grid-cols-5"
              invalid={[]}
              fields={[
                { key: "issuer", label: t("issuer"), type: "select", blank: t("choose"), options: form.issuers.filter((x) => code(x.code)).map((x) => ({ value: code(x.code), label: x.name || code(x.code) })) },
                { key: "low", label: t("binLow"), type: "int", placeholder: "541333" },
                { key: "high", label: t("binHigh"), type: "int", placeholder: t("sameAsLow") },
                { key: "product_class", label: t("productClass"), type: "select", blank: t("any"), options: (options.product_classes ?? []).map((v) => ({ value: v, label: t(`class_${v}`, { defaultValue: v }) })) },
                { key: "active", label: t("active"), type: "bool" },
              ]}
              renderExtra={(r) => r.low && rangeProblem(r) && <p className="mt-2 text-[11px] font-semibold text-red-600">{t(`range_${rangeProblem(r)}`)}</p>}
            />
          </Section>
        </div>
      )}

      {tab === "route_groups" && (
        <Section title={t("section_route_groups")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("groupsHint")}</p>
          <RowsEditor
            rows={form.route_groups}
            onChange={set("route_groups")}
            blank={() => ({ code: "", name: "", active: true, members: [] })}
            addLabel={t("addGroup")}
            columns="lg:grid-cols-3"
            fields={[
              { key: "code", label: t("fees:code"), type: "code", placeholder: "AIRTIME_VODACOM" },
              { key: "name", label: t("fees:name"), placeholder: "Vodacom airtime" },
              { key: "active", label: t("active"), type: "bool" },
            ]}
            renderExtra={(g, patch) => <MembersEditor members={g.members ?? []} choices={ifaceChoices} onChange={(members) => patch({ members })} />}
          />
        </Section>
      )}

      {tab === "rules" && (
        <Section title={t("section_rules")}>
          <p className="mb-3 text-xs text-muted-foreground">{t("rulesHint")}</p>
          <RowsEditor
            rows={form.rules}
            onChange={set("rules")}
            blank={blank.rules}
            addLabel={t("addRule")}
            columns="lg:grid-cols-4"
            fields={[
              { key: "code", label: t("fees:code"), type: "code", placeholder: "VODACOM_AIRTIME" },
              { key: "name", label: t("fees:name"), placeholder: "Vodacom airtime" },
              { key: "direction", label: t("direction"), type: "select", options: (options.directions ?? []).map((d) => ({ value: d, label: t(`direction_${d}`, { defaultValue: d }) })) },
              { key: "priority", label: t("priorityLabel"), type: "int" },
              { key: "txn_type", label: t("txnType"), type: "select", blank: t("any"), options: (options.txn_types ?? []).map((x) => ({ value: x.code, label: x.name })) },
              { key: "channel", label: t("channel"), type: "select", blank: t("any"), options: (options.channels ?? []).map((c) => ({ value: c, label: c })) },
              { key: "service", label: t("service"), type: "select", blank: t("any"), showIf: (r) => r.direction === "SERVICE", options: (options.providers ?? []).filter((p) => !p.connection_only).map((p) => ({ value: p.code, label: p.name })) },
              { key: "on_us", label: t("onUs"), type: "select", showIf: (r) => CARD_DIRECTIONS.includes(r.direction), options: ["", "OURS", "OTHERS"].map((v) => ({ value: v, label: t(v ? `onUs_${v}` : "any") })) },
              { key: "network", label: t("cardNetwork"), type: "select", blank: t("any"), showIf: (r) => CARD_DIRECTIONS.includes(r.direction), options: (options.card_networks ?? []).map((n) => ({ value: n.code, label: n.name })) },
              { key: "issuer", label: t("issuer"), type: "select", blank: t("any"), showIf: (r) => CARD_DIRECTIONS.includes(r.direction), options: form.issuers.filter((x) => code(x.code)).map((x) => ({ value: code(x.code), label: x.name || code(x.code) })) },
              { key: "product_class", label: t("productClass"), type: "select", blank: t("any"), showIf: (r) => CARD_DIRECTIONS.includes(r.direction), options: (options.product_classes ?? []).map((v) => ({ value: v, label: t(`class_${v}`, { defaultValue: v }) })) },
              { key: "currency", label: t("currency"), type: "select", blank: t("any"), options: (options.currencies ?? []).map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` })) },
              { key: "min_amount", label: t("minAmount"), type: "amount", placeholder: t("noLimit") },
              { key: "max_amount", label: t("maxAmount"), type: "amount", placeholder: t("noLimit") },
              { key: "active", label: t("active"), type: "bool" },
            ]}
            renderExtra={(r, patch) => {
              const groups = form.route_groups.filter((g) => code(g.code) && groupFits(g, r.direction, form.interfaces));
              return (
                <div className="mt-3 flex flex-wrap items-end gap-3 border-t border-dashed border-border pt-3">
                  <label className={cn(labelClass, "min-w-56")}>
                    {t("sendTo")} <span className="text-red-500">*</span>
                    <Field field={{ type: "select", blank: t("chooseGroup"), options: groups.map((g) => ({ value: code(g.code), label: g.name || code(g.code) })) }} value={r.group} onChange={(group) => patch({ group })} />
                  </label>
                  <span className="pb-2 text-xs">
                    {t("specificity")} <Badge>{specificity(r)}</Badge>
                  </span>
                  {r.group && !groups.some((g) => code(g.code) === r.group) && <span className="pb-2 text-[11px] font-semibold text-red-600">{t("groupWrongKind")}</span>}
                </div>
              );
            }}
          />
          <p className="mt-3 text-[11px] text-muted-foreground">{t("specificityHint")}</p>
        </Section>
      )}

      {tab === "review" && (
        <div className="grid gap-4">
          <Section title={t("review")}>
            <p className="mb-3 text-xs text-muted-foreground">{t("reviewHint")}</p>
            <ValidateResult id={id} body={toBody(form)} scope={scope} />
            <div className="mt-3">
              <ConfigTables config={toBody(form)} other={setup?.config} options={options} />
            </div>
          </Section>
          <Section title={t("simulate")} action={<Button size="sm" variant="secondary" onClick={onSimulate}>{t("openSimulator")}</Button>}>
            <p className="text-xs text-muted-foreground">{t("simulateLiveHint")}</p>
          </Section>
        </div>
      )}

      {!ready && <p className="mt-4 text-xs font-semibold text-amber-800">{t("unfinished")}</p>}
      {error && (
        <div className="mt-4">
          <Problems message={error.message} />
        </div>
      )}
      <div className="sticky bottom-0 mt-4 flex flex-wrap justify-end gap-2 border-t border-border bg-[var(--background)] py-3">
        <Button variant="ghost" onClick={onClose}>
          {t("fees:cancel")}
        </Button>
        {drafting && (
          <Button variant="secondary" icon={Save} loading={busy} disabled={!ready} onClick={() => save(false)}>
            {t("deposits:saveDraft")}
          </Button>
        )}
        <Button icon={Send} loading={busy} disabled={!ready} onClick={() => save(true)}>
          {drafting ? t("deposits:submitForApproval") : t("fees:proposeChanges")}
        </Button>
      </div>
    </div>
  );
}

// A group's interfaces in rank order: drag (or the arrows) to reorder.
function MembersEditor({ members, choices, onChange }) {
  const { t } = useTranslation("routing");
  const dnd = useDragReorder((from, to) => onChange(moveItem(members, from, to)));
  const set = (i, patch) => onChange(members.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className="mt-3 grid gap-1.5 border-t border-dashed border-border pt-3">
      <p className={labelClass}>
        {t("membersInOrder")} <span className="font-normal text-muted-foreground">· {t("membersHint")}</span>
      </p>
      {members.map((m, i) => (
        <div key={i} {...dnd.rowProps(i)} className={cn("flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/30 p-2", dnd.rowClass(i))}>
          <DragGrip label={t("dragToReorder")} {...dnd.gripProps(i)} />
          <span className="w-6 text-center text-xs font-black">{i + 1}</span>
          <FilterSelect className="w-56" value={m.interface ?? ""} onChange={(v) => set(i, { interface: v })} options={[{ value: "", label: t("chooseInterface") }, ...choices]} />
          <input className={cn(inputClass, "w-28")} inputMode="decimal" placeholder={t("minAmount")} value={m.min_amount ?? ""} onChange={(e) => set(i, { min_amount: e.target.value.replace(/[^\d.]/g, "") })} />
          <input className={cn(inputClass, "w-28")} inputMode="decimal" placeholder={t("maxAmount")} value={m.max_amount ?? ""} onChange={(e) => set(i, { max_amount: e.target.value.replace(/[^\d.]/g, "") })} />
          <Toggle checked={Boolean(m.active)} onChange={(active) => set(i, { active })} label={t("active")} />
          <span className="ms-auto flex gap-0.5">
            <button type="button" aria-label={t("moveUp")} disabled={i === 0} onClick={() => onChange(moveItem(members, i, i - 1))} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30">
              <ArrowUp size={13} />
            </button>
            <button type="button" aria-label={t("moveDown")} disabled={i === members.length - 1} onClick={() => onChange(moveItem(members, i, i + 1))} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30">
              <ArrowDown size={13} />
            </button>
            <button type="button" aria-label={t("remove")} onClick={() => onChange(members.filter((_, j) => j !== i))} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600">
              <Trash2 size={13} />
            </button>
          </span>
        </div>
      ))}
      <Button variant="outline" size="sm" icon={Plus} className="w-fit" onClick={() => onChange([...members, { interface: "", min_amount: "", max_amount: "", active: true }])}>
        {t("addMember")}
      </Button>
    </div>
  );
}
