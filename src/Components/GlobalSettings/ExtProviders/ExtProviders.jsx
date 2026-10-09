import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, CheckCircle2, Pencil, Plus, Power, RefreshCw, RotateCcw, Save, Send, Smartphone, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { ListPanel } from "@/Components/Common/ListPanel";
import { PENDING_TABS } from "@/Components/Common/listTabs";
import { DigitChips } from "@/Components/Common/DigitChips";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { RowActions } from "@/Components/Common/RowActions";
import { InstitutionField } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { ActionButtons, AuditTimeline, NarrationDialog, Problems, Section, labelClass } from "@/Components/TermDeposits/depositShared";
import { ProductStatus } from "@/Components/TermDeposits/DepositProducts/productShared";
import { MiniTable, RowsEditor, useInstitutionScope } from "@/Components/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { extProvidersApi } from "@/Services/Transactions/transactions.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

const str = (v, d = "0") => String(v ?? "").trim() || d;
const code = (v) => String(v ?? "").toUpperCase().replace(/[^A-Z0-9_]/g, "");

// The setup as the server takes it: whole lists, providers matched by code.
const toBody = (c) => ({
  providers: (c.providers ?? []).map((p, i) => ({
    code: code(p.code),
    name: str(p.name, ""),
    kind: p.kind,
    adapter: p.adapter,
    currency_code: p.currency_code,
    min_amount: str(p.min_amount),
    max_amount: str(p.max_amount),
    allow_push: Boolean(p.allow_push),
    allow_pull: Boolean(p.allow_pull),
    prefixes: p.prefixes ?? [],
    priority: Number(p.priority) || i + 1,
    active: Boolean(p.active),
  })),
  groups: (c.groups ?? []).map((g) => ({ code: code(g.code), name: str(g.name, ""), providers: g.providers ?? [], active: Boolean(g.active) })),
});

function useProviderOptions(instProfileId) {
  const [options, setOptions] = useState(null);
  useEffect(() => {
    extProvidersApi
      .options(instProfileId ? { inst_profile_id: instProfileId } : {})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setOptions({});
      });
  }, [instProfileId]);
  return options;
}

// GLOBAL SETTINGS > External Providers (menu 210): each institution's one
// setup of mobile-wallet providers (M-Pesa, e-Mola, mKesh...), the number
// prefixes that route to each, and groups that fees and limits can name.
export function ExtProviders() {
  const { t } = useTranslation(["providers", "fees", "deposits", "common"]);
  const can = usePagePermission();
  const { chooser, institution, setInstitution, scope } = useInstitutionScope();
  const [tab, setTab] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [opening, setOpening] = useState(false);
  const [screen, setScreen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = scope({ page, page_size: limit });
      const row = rowsOf(await (tab === "pending" ? extProvidersApi.pending(body) : extProvidersApi.list(body)))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [tab, page, limit, scope]);
  useEffect(() => {
    void load();
  }, [load]);

  // One setup per institution: Add opens the existing one when there is one.
  const add = async () => {
    setOpening(true);
    try {
      const id = rowsOf(await extProvidersApi.options(scope()))[0]?.provider_setup_id;
      setScreen(id ? { kind: "view", id } : { kind: "edit", setup: null });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setOpening(false);
    }
  };

  const back = () => {
    setScreen(null);
    void load();
  };
  if (screen?.kind === "edit") return <SetupEditor setup={screen.setup} scope={scope} onClose={() => (screen.setup ? setScreen({ kind: "view", id: screen.setup.id }) : back())} onSaved={(id) => setScreen({ kind: "view", id })} />;
  if (screen?.kind === "view") return <SetupView id={screen.id} onBack={back} onEdit={(setup) => setScreen({ kind: "edit", setup })} />;

  const columns = [
    {
      key: "inst_profile_name",
      label: t("fees:institution"),
      align: "left",
      render: (s) => (
        <button type="button" onClick={() => setScreen({ kind: "view", id: s.id })} className="text-left text-xs font-bold text-primary hover:underline">
          {s.inst_profile_name}
        </button>
      ),
    },
    { key: "provider_count", label: t("providerCount"), render: (s) => <span className="text-xs tabular-nums">{s.provider_count ?? "—"}</span> },
    { key: "status", label: t("fees:status"), render: (s) => <ProductStatus product={s} /> },
    { key: "updated_time", label: t("fees:updated"), render: (s) => <span className="whitespace-nowrap text-xs">{accountDate(s.updated_time ?? s.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (s) => <RowActions buttons={{ view: true }} onView={() => setScreen({ kind: "view", id: s.id })} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Smartphone size={22} className="text-primary" /> {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("fees:refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} loading={opening} disabled={chooser && !institution} onClick={add}>
              {t("setUp")}
            </Button>
          )}
        </div>
      </div>
      {chooser && (
        <div className="mb-4 max-w-sm">
          <InstitutionField value={institution} onChange={setInstitution} />
        </div>
      )}
      <ListPanel
        tabs={PENDING_TABS}
        value={tab}
        onChange={(key) => {
          setTab(key);
          setPage(1);
        }}
        serverFiltered
        rows={data.items}
        total={data.total}
      >
      <DataTable
        bare
        columns={columns}
        rows={data.items}
        rowKey={(s) => s.id}
        isLoading={loading}
        title={t(`deposits:tab_${tab}`)}
        emptyTitle={t("noSetups")}
        emptyDescription={t("noSetupsHint")}
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
      </ListPanel>
    </div>
  );
}

const Prefixes = ({ list }) => (
  <span className="flex flex-wrap gap-1">
    {(list ?? []).map((p) => (
      <span key={p} className="rounded-full bg-muted px-2 py-0.5 font-mono text-[11px] font-bold">
        {p}
      </span>
    ))}
  </span>
);
const yesNo = (t, on) => <span className={on ? "font-bold text-emerald-700" : "text-muted-foreground"}>{t(on ? "yes" : "no")}</span>;

// Providers and groups as tables; with `other`, rows new or changed are marked.
function SetupTables({ config, other }) {
  const { t } = useTranslation("providers");
  const changed = (key) => {
    if (!other) return () => undefined;
    const before = new Set((other[key] ?? []).map((x) => JSON.stringify(toBody({ [key]: [x] })[key][0])));
    return (r) => (before.has(JSON.stringify(toBody({ [key]: [r] })[key][0])) ? undefined : "bg-amber-50");
  };
  const providers = config?.providers ?? [];
  const nameOf = (c) => providers.find((p) => p.code === c)?.name ?? c;
  return (
    <div className="grid gap-4">
      <MiniTable
        rows={providers}
        rowKey={(p) => p.code}
        empty={t("noProviders")}
        rowClass={changed("providers")}
        columns={[
          { key: "name", label: t("provider"), render: (p) => <span><b>{p.name}</b> <span className="text-muted-foreground">{p.code}</span></span> },
          { key: "prefixes", label: t("prefixes"), render: (p) => <Prefixes list={p.prefixes} /> },
          { key: "amounts", label: t("amounts"), render: (p) => `${money(p.min_amount, p.currency_code)} – ${Number(p.max_amount) > 0 ? money(p.max_amount, p.currency_code) : t("noLimit")}` },
          { key: "allow_push", label: t("send"), render: (p) => yesNo(t, p.allow_push) },
          { key: "allow_pull", label: t("topUp"), render: (p) => yesNo(t, p.allow_pull) },
          { key: "how", label: t("adapter"), render: (p) => `${t(`kind_${p.kind}`, { defaultValue: p.kind })} · ${p.adapter}` },
          { key: "active", label: t("active"), render: (p) => yesNo(t, p.active) },
        ]}
      />
      <MiniTable
        rows={config?.groups ?? []}
        rowKey={(g) => g.code}
        empty={t("noGroups")}
        rowClass={changed("groups")}
        columns={[
          { key: "name", label: t("group"), render: (g) => <span><b>{g.name}</b> <span className="text-muted-foreground">{g.code}</span></span> },
          { key: "providers", label: t("members"), render: (g) => (g.providers ?? []).map(nameOf).join(", ") || "—" },
          { key: "active", label: t("active"), render: (g) => yesNo(t, g.active) },
        ]}
      />
    </div>
  );
}

// One setup: in effect, what waits for a checker, warnings and history.
function SetupView({ id, onBack, onEdit }) {
  const { t } = useTranslation(["providers", "fees", "deposits"]);
  const can = usePagePermission();
  const [s, setS] = useState(null);
  const [audit, setAudit] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([extProvidersApi.get({ id }), extProvidersApi.audit({ id }).catch(() => null)]);
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
      const response = await extProvidersApi[verb]({ id, ...(narration ? { narration } : {}) });
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
    a.deactivate && can("Deactivate") && { key: "deactivate", label: t("fees:deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Reactivate") && { key: "reactivate", label: t("fees:reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("fees:delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("fees:reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("fees:approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
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
        {s.warnings?.length > 0 && (
          <ul className="mt-3 grid gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {s.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      {s.pending ? (
        <div className="mb-4 grid gap-4">
          <Section title={t("fees:inEffect")}>
            <SetupTables config={s.config} />
          </Section>
          <Section title={t("deposits:proposedBy", { action: t(`deposits:pending_${s.pending.action}`, { defaultValue: s.pending.action }), name: s.pending.proposed_by?.name ?? s.pending.proposed_by ?? "—", date: accountDate(s.pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
            {s.pending.config ? <SetupTables config={s.pending.config} other={s.config} /> : <p className="text-sm text-muted-foreground">{t(`deposits:pendingHint_${s.pending.action}`, { defaultValue: "" })}</p>}
          </Section>
        </div>
      ) : (
        <Section title={s.draft ? t("fees:draft") : t("fees:inEffect")} className="mb-4">
          <SetupTables config={s.draft ?? s.config} />
        </Section>
      )}

      <Section title={t("fees:history")}>
        <AuditTimeline audit={audit} empty={t("fees:nothingYet")} />
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

// Add or edit the setup: providers (with their prefixes) and groups. A new
// one or a Draft / Rejected Add saves drafts and is submitted; an approved
// one proposes its changes in one edit (the whole lists).
function SetupEditor({ setup, scope, onClose, onSaved }) {
  const { t } = useTranslation(["providers", "fees", "deposits"]);
  const options = useProviderOptions(setup?.inst_profile_id ?? scope().inst_profile_id);
  const [config, setConfig] = useState(null);
  const [id, setId] = useState(setup?.id ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const drafting = !setup || [9, 5].includes(Number(setup.status));
  const started = useRef(false);

  useEffect(() => {
    if (!options || started.current) return;
    started.current = true;
    const source = setup ? (setup.draft ?? setup.pending?.config ?? setup.config) : null;
    setConfig(structuredClone(source ?? { providers: [], groups: [] }));
  }, [options, setup]);

  const blankProvider = () => ({
    code: "",
    name: "",
    kind: options?.kinds?.[0] ?? "",
    adapter: options?.adapters?.[0] ?? "",
    currency_code: options?.currencies?.find((c) => c.is_base_currency)?.alpha_code ?? options?.currencies?.[0]?.alpha_code ?? "",
    min_amount: "0",
    max_amount: "0",
    allow_push: true,
    allow_pull: true,
    prefixes: [],
    priority: String((config?.providers?.length ?? 0) + 1),
    active: true,
  });
  const providerCodes = (config?.providers ?? []).map((p) => code(p.code)).filter(Boolean);
  const ready = config && config.providers?.every((p) => code(p.code) && str(p.name, "") && p.currency_code && p.prefixes?.length) && config.groups?.every((g) => code(g.code) && str(g.name, "") && g.providers?.length);

  const save = async (submit) => {
    setBusy(true);
    setError("");
    try {
      let savedId = id;
      if (drafting) {
        const body = { ...toBody(config), is_draft: true };
        const response = id ? await extProvidersApi.edit({ id, ...body }) : await extProvidersApi.add(scope(body));
        savedId = rowsOf(response)[0]?.id ?? id;
        setId(savedId);
        if (!submit) {
          notifications.success(t("deposits:draftSaved"));
          return;
        }
      }
      const response = drafting ? await extProvidersApi.submit({ id: savedId }) : await extProvidersApi.edit({ id: savedId, ...toBody(config) });
      notifications.success(response?.message ?? t("deposits:submitted"));
      onSaved(savedId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!config || !options) return <PageSkeleton />;
  const codes = (list) => ({ type: "select", options: (list ?? []).map((v) => ({ value: v, label: t(`kind_${v}`, { defaultValue: v }) })) });
  const dial = (options.phone_codes ?? []).join(" / ");

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToSetups")}
      </button>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-800">{setup ? t("setupOf", { name: setup.inst_profile_name }) : t("setUp")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{t(drafting ? "draftHint" : "proposeHint")}</p>

      <Section title={t("providers")} className="mb-4">
        <p className="mb-3 text-xs text-muted-foreground">{t("providersHint")}</p>
        <RowsEditor
          rows={config.providers ?? []}
          onChange={(providers) => setConfig((c) => ({ ...c, providers }))}
          blank={blankProvider}
          addLabel={t("addProvider")}
          decimals={options.currencies?.find((c) => c.is_base_currency)?.amount_decimals ?? 2}
          columns="lg:grid-cols-4"
          fields={[
            { key: "code", label: t("fees:code"), placeholder: "MPESA" },
            { key: "name", label: t("fees:name"), placeholder: "M-Pesa" },
            { key: "kind", label: t("kind"), ...codes(options.kinds) },
            { key: "adapter", label: t("adapter"), ...codes(options.adapters) },
            { key: "currency_code", label: t("fees:currency"), type: "select", options: (options.currencies ?? []).map((c) => ({ value: c.alpha_code, label: `${c.alpha_code} · ${c.name}` })) },
            { key: "min_amount", label: t("minAmount"), type: "amount" },
            { key: "max_amount", label: t("maxAmount"), type: "amount" },
            { key: "priority", label: t("priority"), type: "int" },
            { key: "allow_push", label: t("send"), type: "bool" },
            { key: "allow_pull", label: t("topUp"), type: "bool" },
            { key: "active", label: t("active"), type: "bool" },
          ]}
          renderExtra={(provider, patch) => (
            <label className={cn(labelClass, "mt-3 block border-t border-dashed border-border pt-3")}>
              {t("prefixes")} <span className="font-normal text-muted-foreground">· {t("prefixesHint", { dial: dial || "+…" })}</span>
              <DigitChips className="mt-1.5" value={provider.prefixes ?? []} onChange={(prefixes) => patch({ prefixes })} placeholder="84" />
            </label>
          )}
        />
      </Section>

      <Section title={t("groups")}>
        <p className="mb-3 text-xs text-muted-foreground">{t("groupsHint")}</p>
        <RowsEditor
          rows={config.groups ?? []}
          onChange={(groups) => setConfig((c) => ({ ...c, groups }))}
          blank={() => ({ code: "", name: "", providers: [], active: true })}
          addLabel={t("addGroup")}
          columns="lg:grid-cols-3"
          fields={[
            { key: "code", label: t("fees:code"), placeholder: "MOBILE_WALLETS" },
            { key: "name", label: t("fees:name"), placeholder: "M-Pesa and e-Mola" },
            { key: "active", label: t("active"), type: "bool" },
            { key: "providers", label: t("members"), type: "multi", span: "sm:col-span-2 lg:col-span-3", options: providerCodes.map((c) => ({ value: c, label: config.providers.find((p) => code(p.code) === c)?.name || c })) },
          ]}
        />
      </Section>

      {error && (
        <div className="mt-4">
          <Problems message={error} />
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
