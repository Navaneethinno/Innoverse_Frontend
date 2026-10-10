import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, FlaskConical, Plus, Save, Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { glMappingApi } from "@/Services/Accounting/accounting.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { MiniTable, RowsEditor, Tabs } from "../Loans/loanShared";
import { ActionButtons, AuditTimeline, Problems, Section, inputClass, labelClass } from "../TermDeposits/depositShared";
import { ProductStatus } from "../TermDeposits/DepositProducts/productShared";
import { glLabel, useRecordActions } from "./accountingShared";

const LIMITS = ["txn_type", "ext_provider_id", "channel_id", "digital_product_id", "currency_id"];
const isSet = (v) => v !== "" && v != null && v !== 0 && v !== "0";
const specificity = (r) => LIMITS.filter((k) => isSet(r[k])).length;
const blankRule = () => ({ leg: "", txn_type: "", ext_provider_id: "", channel_id: "", digital_product_id: "", currency_id: "", gl_account_id: "", note: "" });

// The rules as the server takes them: "" / 0 is "any".
const toRules = (rules) =>
  rules.map((r) => ({
    leg: r.leg,
    txn_type: r.txn_type || "",
    ext_provider_id: Number(r.ext_provider_id) || 0,
    channel_id: Number(r.channel_id) || 0,
    digital_product_id: Number(r.digital_product_id) || 0,
    currency_id: Number(r.currency_id) || 0,
    gl_account_id: Number(r.gl_account_id) || 0,
    note: String(r.note ?? "").trim(),
  }));
const sig = (r) => JSON.stringify(toRules([r])[0]);

// ACCOUNTING > GL Mapping (menu 214): which GL each posting leg goes to.
// A rule limits a leg by type, provider, channel, product and currency; the
// most specific rule that fits wins, and the fallback GL takes the rest.
// One mapping per institution, approved as a whole.
export function GlMapping() {
  const { t } = useTranslation("accounting");
  const can = usePagePermission();
  const [tab, setTab] = useState("rules");
  const [setup, setSetup] = useState(undefined);
  const [options, setOptions] = useState(null);
  const [audit, setAudit] = useState([]);
  const [editing, setEditing] = useState(false);

  const load = useCallback(async () => {
    const [got, opts] = await Promise.all([glMappingApi.get({}), glMappingApi.options({})]);
    const s = rowsOf(got)[0] ?? null;
    setSetup(s);
    setOptions(rowsOf(opts)[0] ?? {});
    setAudit(s?.id ? rowsOf(await glMappingApi.audit({ id: s.id }).catch(() => null)) : []);
  }, []);
  useEffect(() => {
    load().catch((e) => {
      notifications.error(e.message);
      setSetup(null);
    });
  }, [load]);

  const { buttons, busy, dialog } = useRecordActions({
    actions: setup?.actions,
    labels: { edit: () => setEditing(true) },
    run: async (verb, narration) => {
      const r = await glMappingApi[verb]({ id: setup.id, ...(narration ? { narration } : {}) });
      notifications.success(r?.message ?? t("done"));
      await load();
    },
  });

  if (setup === undefined || !options) return <PageSkeleton />;
  if (editing)
    return (
      <MappingEditor
        setup={setup}
        options={options}
        onClose={() => setEditing(false)}
        onSaved={async () => {
          setEditing(false);
          await load();
        }}
      />
    );

  const shownMapping = setup?.draft ?? setup?.mapping;
  return (
    <div className="pb-8 pt-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle>{t("mapTitle")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("mapSubtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {setup && <ProductStatus product={setup} />}
          {setup ? (
            <ActionButtons buttons={buttons} busy={busy} />
          ) : (
            can("Add") && (
              <Button size="sm" icon={Plus} onClick={() => setEditing(true)}>
                {t("setUpMapping")}
              </Button>
            )
          )}
        </div>
      </div>
      {setup?.warnings?.length > 0 && (
        <ul className="mb-4 grid gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
          {setup.warnings.map((w) => (
            <li key={w} className="flex items-start gap-1.5">
              <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
            </li>
          ))}
        </ul>
      )}
      <Tabs tabs={[{ key: "rules" }, { key: "test" }, { key: "unmapped" }, { key: "history" }]} value={tab} onChange={setTab} labelOf={(k) => t(`mapTab_${k}`)} />

      {tab === "rules" &&
        (!setup ? (
          <p className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{t("noMapping")}</p>
        ) : setup.pending ? (
          <div className="grid gap-4 xl:grid-cols-2">
            <Section title={t("inEffect")}>
              <MappingView mapping={setup.mapping} options={options} />
            </Section>
            <Section title={t("proposedBy", { name: setup.pending.proposed_by?.name ?? setup.pending.proposed_by ?? "—", date: accountDate(setup.pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
              <MappingView mapping={setup.pending.mapping ?? setup.pending.config} options={options} other={setup.mapping} />
            </Section>
          </div>
        ) : (
          <MappingView mapping={shownMapping} options={options} />
        ))}
      {tab === "test" && <ResolvePanel options={options} />}
      {tab === "unmapped" && <Unmapped />}
      {tab === "history" && (
        <Section title={t("history")}>
          <AuditTimeline audit={audit} empty={t("nothingYet")} />
        </Section>
      )}
      {dialog}
    </div>
  );
}

// Labels for a rule's limits, from options when the rule has no names (a
// proposed or edited rule).
function useNames(options) {
  return useMemo(() => {
    const by = (list, key = "id") => Object.fromEntries((list ?? []).map((x) => [String(x[key]), x]));
    return { legs: by(options.legs, "code"), types: by(options.txn_types, "code"), providers: by(options.providers), channels: by(options.channels), products: by(options.products), currencies: by(options.currencies), gls: by(options.gl_accounts) };
  }, [options]);
}

// The fallback GL and the rules grouped by leg, the most specific first;
// with `other`, rules new or changed are marked.
function MappingView({ mapping, options, other }) {
  const { t } = useTranslation("accounting");
  const names = useNames(options);
  const before = other ? new Set((other.rules ?? []).map(sig)) : null;
  const rules = mapping?.rules ?? [];
  const legs = [...new Set(rules.map((r) => r.leg))].sort((a, b) => (options.legs ?? []).findIndex((l) => l.code === a) - (options.legs ?? []).findIndex((l) => l.code === b));
  const any = <span className="text-muted-foreground">{t("any")}</span>;
  const fallback = names.gls[String(mapping?.fallback_gl_account_id)];
  return (
    <div className="grid gap-4">
      <div className="rounded-xl border border-border bg-card p-3 text-xs">
        <span className="font-bold text-muted-foreground">{t("fallbackGl")}: </span>
        {mapping?.fallback_gl_account_id ? <b>{mapping.fallback_gl_name || (fallback ? glLabel(fallback) : `#${mapping.fallback_gl_account_id}`)}</b> : <span className="text-muted-foreground">{t("noFallback")}</span>}
        <p className="mt-0.5 text-[11px] text-muted-foreground">{t("fallbackHint")}</p>
      </div>
      {legs.map((leg) => (
        <div key={leg}>
          <p className="mb-1.5 text-xs font-black">{names.legs[leg]?.name ?? leg}</p>
          <p className="mb-2 text-[11px] text-muted-foreground">{names.legs[leg]?.description}</p>
          <MiniTable
            rows={rules.filter((r) => r.leg === leg).sort((a, b) => specificity(b) - specificity(a))}
            rowKey={(r, i) => `${sig(r)}-${i}`}
            rowClass={(r) => (before && !before.has(sig(r)) ? "bg-amber-50" : r.gl_status && Number(r.gl_status) !== 1 ? "bg-red-50" : undefined)}
            columns={[
              { key: "txn_type", label: t("txnType"), render: (r) => (isSet(r.txn_type) ? r.txn_type_name || names.types[r.txn_type]?.name || r.txn_type : any) },
              { key: "provider", label: t("provider"), render: (r) => (isSet(r.ext_provider_id) ? r.ext_provider_name || names.providers[String(r.ext_provider_id)]?.name : any) },
              { key: "channel", label: t("channel"), render: (r) => (isSet(r.channel_id) ? r.channel_name || names.channels[String(r.channel_id)]?.name : any) },
              { key: "product", label: t("product"), render: (r) => (isSet(r.digital_product_id) ? r.digital_product_name || names.products[String(r.digital_product_id)]?.name : any) },
              { key: "currency", label: t("currency"), render: (r) => (isSet(r.currency_id) ? r.currency_code || names.currencies[String(r.currency_id)]?.code : any) },
              {
                key: "gl",
                label: t("gl"),
                render: (r) => {
                  const g = names.gls[String(r.gl_account_id)];
                  return (
                    <span>
                      <b>{r.gl_name || g?.name || `#${r.gl_account_id}`}</b> <span className="font-mono text-muted-foreground">{[r.gl_code ?? g?.gl_code, r.gl_account_number ?? g?.account_number].filter(Boolean).join(" · ")}</span>
                    </span>
                  );
                },
              },
              { key: "note", label: t("note"), render: (r) => <span className="text-muted-foreground">{r.note || "—"}</span> },
            ]}
          />
        </div>
      ))}
      {!legs.length && <p className="text-sm text-muted-foreground">{t("noRules")}</p>}
    </div>
  );
}

// The whole rule table, edited and submitted at once (or saved as a draft
// for a new mapping). The rules in effect stay until a checker approves.
function MappingEditor({ setup, options, onClose, onSaved }) {
  const { t } = useTranslation("accounting");
  const source = setup?.draft ?? setup?.pending?.mapping ?? setup?.mapping;
  const [rules, setRules] = useState(() => (source?.rules ?? []).map((r) => ({ ...r, txn_type: r.txn_type ?? "", ...Object.fromEntries(["ext_provider_id", "channel_id", "digital_product_id", "currency_id", "gl_account_id"].map((k) => [k, isSet(r[k]) ? String(r[k]) : ""])) })));
  const [fallback, setFallback] = useState(source?.fallback_gl_account_id ? String(source.fallback_gl_account_id) : "");
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const drafting = !setup || [9, 5].includes(Number(setup.status));
  const sel = (list, value, label, blank = t("any")) => ({ type: "select", blank, options: (list ?? []).map((x) => ({ value: String(x[value]), label: label(x) })) });
  const glOptions = (options.gl_accounts ?? []).map((g) => ({ value: String(g.id), label: `${g.name} · ${[g.gl_code, g.account_number, g.multi_currency ? t("multi") : g.currency_code].filter(Boolean).join(" · ")}` }));
  const ready = rules.every((r) => r.leg && r.gl_account_id);

  const save = async (submit) => {
    setBusy(submit ? "submit" : "draft");
    setError("");
    try {
      const body = { rules: toRules(rules), fallback_gl_account_id: Number(fallback) || 0, ...(narration.trim() ? { narration: narration.trim() } : {}) };
      let id = setup?.id;
      if (!id) {
        const r = await glMappingApi.add({ ...body, is_draft: !submit });
        id = rowsOf(r)[0]?.id;
        notifications.success(r?.message ?? t("saved"));
      } else {
        const r = await glMappingApi.edit({ id, ...body, ...(drafting ? { is_draft: true } : {}) });
        if (drafting && submit) await glMappingApi.submit({ id });
        notifications.success(r?.message ?? t("saved"));
      }
      onSaved();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToMapping")}
      </button>
      <PageTitle>{t(setup ? "editMapping" : "setUpMapping")}</PageTitle>
      <p className="mb-4 mt-1 text-sm text-muted-foreground">{t("editMappingHint")}</p>
      <Section title={t("fallbackGl")} className="mb-4">
        <FilterSelect value={fallback} onChange={setFallback} options={[{ value: "", label: t("noFallback") }, ...glOptions]} />
        <p className="mt-1 text-[11px] text-muted-foreground">{t("fallbackHint")}</p>
      </Section>
      <Section title={t("rules")}>
        <RowsEditor
          rows={rules}
          onChange={setRules}
          blank={blankRule}
          addLabel={t("addRule")}
          columns="lg:grid-cols-4"
          fields={[
            { key: "leg", label: t("leg"), ...sel(options.legs, "code", (x) => x.name, t("choose")) },
            { key: "txn_type", label: t("txnType"), ...sel(options.txn_types, "code", (x) => x.name) },
            { key: "ext_provider_id", label: t("provider"), ...sel(options.providers, "id", (x) => x.name) },
            { key: "channel_id", label: t("channel"), ...sel(options.channels, "id", (x) => x.name) },
            { key: "digital_product_id", label: t("product"), ...sel(options.products, "id", (x) => x.name) },
            { key: "currency_id", label: t("currency"), ...sel(options.currencies, "id", (x) => x.code) },
            { key: "gl_account_id", label: t("gl"), type: "select", blank: t("choose"), options: glOptions, span: "sm:col-span-2" },
            { key: "note", label: t("note"), span: "sm:col-span-2 lg:col-span-4" },
          ]}
        />
      </Section>
      <label className={cn(labelClass, "mt-4 block")}>
        {t("narration")}
        <input className={cn(inputClass, "mt-1.5")} value={narration} onChange={(e) => setNarration(e.target.value)} />
      </label>
      {error && (
        <div className="mt-4">
          <Problems message={error} />
        </div>
      )}
      <div className="sticky bottom-0 mt-4 flex flex-wrap justify-end gap-2 border-t border-border bg-[var(--background)] py-3">
        <Button variant="ghost" onClick={onClose}>
          {t("cancel")}
        </Button>
        {drafting && (
          <Button variant="secondary" icon={Save} loading={busy === "draft"} disabled={!ready} onClick={() => save(false)}>
            {t("saveDraft")}
          </Button>
        )}
        <Button icon={Send} loading={busy === "submit"} disabled={!ready} onClick={() => save(true)}>
          {t(drafting ? "submitForApproval" : "proposeChange")}
        </Button>
      </div>
    </div>
  );
}

// "Test": where a posting with these details would go now, and why.
function ResolvePanel({ options }) {
  const { t } = useTranslation("accounting");
  const [q, setQ] = useState({ leg: "", currency_id: String(options.currencies?.[0]?.id ?? ""), txn_type: "", ext_provider_id: "", channel_id: "", digital_product_id: "" });
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setQ((x) => ({ ...x, [key]: value }));
  const pick = (key, list, value, label, blank = t("any")) => (
    <label className={labelClass}>
      {t(key === "currency_id" ? "currency" : key === "ext_provider_id" ? "provider" : key === "channel_id" ? "channel" : key === "digital_product_id" ? "product" : key === "txn_type" ? "txnType" : "leg")}
      <FilterSelect className="mt-1.5" value={q[key]} onChange={set(key)} options={[...(blank ? [{ value: "", label: blank }] : []), ...(list ?? []).map((x) => ({ value: String(x[value]), label: label(x) }))]} />
    </label>
  );
  const run = async () => {
    setBusy(true);
    setError("");
    try {
      const body = { leg: q.leg, currency_id: Number(q.currency_id), ...(q.txn_type ? { txn_type: q.txn_type } : {}), ...Object.fromEntries(["ext_provider_id", "channel_id", "digital_product_id"].filter((k) => q[k]).map((k) => [k, Number(q[k])])) };
      setResult(rowsOf(await glMappingApi.resolve(body))[0] ?? null);
    } catch (e) {
      setResult(null);
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Section title={t("testTitle")}>
      <p className="mb-3 text-xs text-muted-foreground">{t("testHint")}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pick("leg", options.legs, "code", (x) => x.name, t("choose"))}
        {pick("currency_id", options.currencies, "id", (x) => x.code, null)}
        {pick("txn_type", options.txn_types, "code", (x) => x.name)}
        {pick("ext_provider_id", options.providers, "id", (x) => x.name)}
        {pick("channel_id", options.channels, "id", (x) => x.name)}
        {pick("digital_product_id", options.products, "id", (x) => x.name)}
      </div>
      <Button className="mt-3" icon={FlaskConical} loading={busy} disabled={!q.leg || !q.currency_id} onClick={run}>
        {t("test")}
      </Button>
      {error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}
      {result && (
        <div className="mt-3 rounded-xl border border-border bg-card p-3 text-sm">
          <span className={cn("mr-2 rounded-full px-2 py-0.5 text-[10px] font-black", result.by === "RULE" ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900")}>{t(`by_${result.by}`, { defaultValue: result.by })}</span>
          <b>{result.gl_name ?? result.gl_account_name}</b> <span className="font-mono text-xs text-muted-foreground">{[result.gl_code, result.account_number].filter(Boolean).join(" · ")}</span>
        </div>
      )}
    </Section>
  );
}

// Kinds of posting no rule fitted: where they went and how often.
function Unmapped() {
  const { t } = useTranslation("accounting");
  const [rows, setRows] = useState(null);
  useEffect(() => {
    glMappingApi
      .unmapped({})
      .then((r) => setRows(rowsOf(r)))
      .catch((e) => {
        notifications.error(e.message);
        setRows([]);
      });
  }, []);
  return (
    <ListPanel tabs={[]}>
      <DataTable
        bare
        isLoading={rows === null}
        rows={rows ?? []}
        rowKey={(r, i) => `${r.leg}-${r.txn_type}-${r.provider}-${r.channel}-${r.product}-${r.currency}-${i}`}
        title={t("mapTab_unmapped")}
        emptyTitle={t("noUnmapped")}
        emptyDescription={t("noUnmappedHint")}
        columns={[
          { key: "leg", label: t("leg"), render: (r) => <span className="text-xs font-semibold">{r.leg_name ?? r.leg}</span> },
          { key: "txn_type", label: t("txnType"), render: (r) => <span className="text-xs">{r.txn_type_name ?? r.txn_type ?? "—"}</span> },
          { key: "provider", label: t("provider"), render: (r) => <span className="text-xs">{r.provider_name ?? r.provider ?? "—"}</span> },
          { key: "channel", label: t("channel"), render: (r) => <span className="text-xs">{r.channel_name ?? r.channel ?? "—"}</span> },
          { key: "product", label: t("product"), render: (r) => <span className="text-xs">{r.product_name ?? r.product ?? "—"}</span> },
          { key: "currency", label: t("currency"), render: (r) => <span className="text-xs">{r.currency_code ?? r.currency ?? "—"}</span> },
          { key: "gl_name", label: t("wentTo"), render: (r) => <span className="text-xs font-bold">{r.gl_name}</span> },
          { key: "uses", label: t("uses"), render: (r) => <span className="text-xs tabular-nums">{r.uses}</span> },
          { key: "last_at", label: t("lastSeen"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.last_at)}</span> },
        ]}
      />
    </ListPanel>
  );
}

