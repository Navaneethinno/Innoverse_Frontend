import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Pencil, Plus, Power, RefreshCw, RotateCcw, Save, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { ListPanel } from "@/Components/Common/ListPanel";
import { PENDING_TABS } from "@/Components/Common/listTabs";
import { useListSearch } from "@/Hooks/useListSearch";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { InstitutionField } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, NarrationDialog, Problems, Section } from "../TermDeposits/depositShared";
import { ProductStatus } from "../TermDeposits/DepositProducts/productShared";
import { useInstitutionScope } from "../Loans/loanShared";

// The three CARDS screens (Card BINs, Card Products, Issuance Groups) are one
// maker-checker pattern: All / Pending list, a view with what is in effect
// next to what waits for a checker, the history, and one form that saves a
// draft, submits, or proposes a change. Each screen passes a `kind` (see
// cardKinds.jsx) with its api, columns, facts and form.

const STATUSES = [
  [1, "Active"],
  [9, "Draft"],
  [2, "PendingAdd"],
  [5, "RejectedAdd"],
  [13, "Inactive"],
];
const DRAFTING = [9, 5]; // Draft, Deauthorized add: the form keeps saving drafts

export function CardSetupPage({ kind }) {
  const { t } = useTranslation(["cards", "deposits", "common"]);
  const can = usePagePermission();
  const { chooser, institution, setInstitution, scope } = useInstitutionScope();
  const [tab, setTab] = useState("all");
  const [filters, setFilters] = useState({ status: "", ...(kind.filter ? { [kind.filter.key]: "" } : {}) });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term, bind: searchBind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState(null);
  const [screen, setScreen] = useState(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const body = scope({
          page,
          page_size: limit,
          search: term,
          ...(filters.status ? { status: Number(filters.status) } : {}),
          ...(kind.filter && filters[kind.filter.key] ? { [kind.filter.key]: Number(filters[kind.filter.key]) } : {}),
        });
        const row = rowsOf(await (tab === "pending" ? kind.api.pending(body) : kind.api.list(body)))[0];
        setData({ items: row?.items ?? [], total: row?.total ?? 0 });
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [kind, tab, term, filters, page, limit, scope],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(kind.api.listPath, () => void load({ silent: true }));

  // The parent filter (a BIN's products, a product's groups) lists what the
  // form would offer.
  useEffect(() => {
    if (!kind.filter) return;
    kind.api
      .options(scope())
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch(() => setOptions({}));
  }, [kind, scope]);

  const back = () => {
    setScreen(null);
    void load();
  };
  if (screen?.kind === "form") {
    return <CardForm kind={kind} record={screen.record} scope={scope} onClose={() => (screen.record ? setScreen({ kind: "view", id: screen.record.id }) : back())} onSaved={(id) => setScreen({ kind: "view", id })} />;
  }
  if (screen?.kind === "view") return <CardRecordView kind={kind} id={screen.id} onBack={back} onEdit={(record) => setScreen({ kind: "form", record })} />;

  const set = (key) => (value) => {
    setFilters((f) => ({ ...f, [key]: value }));
    setPage(1);
  };
  const open = (r) => setScreen({ kind: "view", id: r.id });
  const columns = [
    {
      key: "code",
      label: t(kind.nameLabel),
      align: "left",
      render: (r) => (
        <button type="button" onClick={() => open(r)} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{r.name || r.code}</p>
          {r.name && <p className="font-mono text-[10px] text-muted-foreground">{r.code}</p>}
        </button>
      ),
    },
    ...kind.columns(t),
    { key: "status", label: t("status"), render: (r) => <ProductStatus product={r} /> },
    { key: "inst_profile_name", label: t("institution"), render: (r) => <span className="text-xs">{r.inst_profile_name}</span> },
    { key: "updated_time", label: t("updated"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.updated_time ?? r.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (r) => <RowActions buttons={{ view: true }} onView={() => open(r)} /> },
  ];
  const Icon = kind.icon;

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Icon size={22} className="text-primary" /> {t(kind.title)}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t(kind.subtitle)}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} disabled={chooser && !institution} onClick={() => setScreen({ kind: "form", record: null })}>
              {t(kind.newLabel)}
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
        {...searchBind}
        searchPlaceholder={t(kind.searchHint)}
        filters={
          <>
            {kind.filter && <FilterSelect value={filters[kind.filter.key]} onChange={set(kind.filter.key)} options={[{ value: "", label: t(kind.filter.any) }, ...pickOptions(options?.[kind.filter.from])]} />}
            <FilterSelect value={filters.status} onChange={set("status")} options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map(([v, k]) => ({ value: String(v), label: t(`deposits:pstatus_${k}`) }))]} />
          </>
        }
      >
      <DataTable
        bare
        columns={columns}
        rows={data.items}
        rowKey={(r) => r.id}
        isLoading={loading}
        title={t(`deposits:tab_${tab}`)}
        emptyTitle={t(kind.noneTitle)}
        emptyDescription={t(kind.noneHint)}
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

// A list of records from options ({ id, code, name, status, status_name })
// as select options; one that is not active says so.
export function pickOptions(list, extra) {
  return (list ?? []).map((o) => ({
    value: String(o.id),
    label: [[o.code, o.name].filter(Boolean).join(" · "), extra?.(o), Number(o.status) !== 1 && o.status_name].filter(Boolean).join(" · "),
  }));
}

// One record: status and actions, what is in effect next to what waits for
// a checker (changes marked), and the history.
function CardRecordView({ kind, id, onBack, onEdit }) {
  const { t } = useTranslation(["cards", "deposits"]);
  const can = usePagePermission();
  const [record, setRecord] = useState(null);
  const [audit, setAudit] = useState([]);
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([kind.api.get({ id }), kind.api.audit({ id }).catch(() => null)]);
      setRecord(rowsOf(got)[0] ?? null);
      setAudit(history ? rowsOf(history) : []);
    } catch (error) {
      notifications.error(error.message);
    }
  }, [kind, id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  useLiveChannel(kind.api.listPath, (_action, records) => (!records.length || records.some((r) => String(r.id) === String(id))) && void reload());

  const act = async (verb, narration) => {
    setBusy(true);
    try {
      const response = await kind.api[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      if (verb === "delete" && Number(record.status) === 9) return onBack();
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!record) {
    return (
      <PageSkeleton />
    );
  }

  const a = record.actions ?? {};
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: () => onEdit(record) },
    a.submit && can("Add") && { key: "submit", label: t("submit"), icon: Send, variant: "outline", run: ask("submit") },
    a.deactivate && can("Deactivate") && { key: "deactivate", label: t("deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Reactivate") && { key: "reactivate", label: t("reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorize") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  const pending = record.pending;
  const refs = record.refs ?? {};

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={15} /> {t(kind.backLabel)}
      </button>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black text-foreground">{record.name || record.code}</h1>
              <ProductStatus product={record} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">{[record.name && record.code, ...kind.headline(t, record.summary ?? {}), record.inst_profile_name].filter(Boolean).join(" · ")}</p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{t("deposits:lastChange", { name: record.updated_by ?? record.created_by ?? "—", date: accountDate(record.updated_time ?? record.created_time) })}</p>
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
      </div>

      {pending ? (
        <div className="mb-4 grid gap-4 xl:grid-cols-2">
          <Section title={t("inEffect")}>
            <CompareFacts groups={record.config && kind.facts(t, record.config, refs)} />
          </Section>
          <Section title={t("deposits:proposedBy", { action: t(`deposits:pending_${pending.action}`, { defaultValue: pending.action }), name: pending.proposed_by?.name ?? "—", date: accountDate(pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
            {pending.config ? <CompareFacts groups={kind.facts(t, pending.config, refs)} before={record.config && kind.facts(t, record.config, refs)} /> : <p className="text-sm text-muted-foreground">{t(`pendingHint_${pending.action}`, { defaultValue: "" })}</p>}
          </Section>
        </div>
      ) : (
        <Section title={record.draft ? t("draft") : t("inEffect")} className="mb-4">
          <CompareFacts groups={(record.draft ?? record.config) && kind.facts(t, record.draft ?? record.config, refs)} />
        </Section>
      )}

      <Section title={t("history")}>
        <ol className="relative grid gap-3 border-l border-border pl-4">
          {audit.map((entry, i) => (
            <li key={`${entry.at}-${i}`} className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
              <p className="text-xs font-bold text-foreground">{t(`audit_${entry.action}`, { defaultValue: entry.action })}</p>
              <p className="text-[11px] text-muted-foreground">
                {entry.actor} · {accountDate(entry.at)}
              </p>
              {entry.narration?.trim() && <p className="mt-0.5 text-xs italic">“{entry.narration}”</p>}
            </li>
          ))}
          {!audit.length && <li className="text-sm text-muted-foreground">{t("nothingYet")}</li>}
        </ol>
      </Section>

      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "approve" : dialog === "deauth" ? "reject" : dialog)}
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

// Groups of label / value facts. With `before` (what is in effect), a value
// that changes is marked with the old one under it.
function CompareFacts({ groups, before }) {
  const { t } = useTranslation("cards");
  const old = useMemo(() => (before ? Object.fromEntries(before.flatMap(([, rows]) => rows)) : null), [before]);
  if (!groups) return <p className="text-sm text-muted-foreground">{t("nothingInEffect")}</p>;
  return (
    <div className="grid gap-4">
      {groups.map(([group, rows]) => (
        <div key={group}>
          <p className="mb-1.5 text-[10px] font-black uppercase tracking-wider text-muted-foreground">{t(group)}</p>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {rows.map(([label, value]) => {
              const changed = old && String(old[label]) !== String(value);
              return (
                <div key={label} className={cn("min-w-0 rounded-xl border px-3 py-2", changed ? "border-amber-300 bg-amber-50" : "border-border bg-card")}>
                  <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
                  <dd className="amount-fit mt-0.5 text-sm font-semibold text-foreground">{value === "" || value == null ? "—" : value}</dd>
                  {changed && <dd className="amount-fit text-[10px] text-amber-900 line-through">{old[label] === "" || old[label] == null ? "—" : old[label]}</dd>}
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}

// Add or edit, on one page. A new record or a Draft / Rejected add saves
// drafts and is then submitted; an approved one proposes the fields that
// changed (fixed fields are read-only once added).
function CardForm({ kind, record, scope, onClose, onSaved }) {
  const { t } = useTranslation(["cards", "deposits", "common"]);
  const [options, setOptions] = useState(null);
  const [values, setValues] = useState(null);
  const [id, setId] = useState(record?.id ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const drafting = !record || DRAFTING.includes(Number(record.status));
  const added = Boolean(id);

  useEffect(() => {
    let cancelled = false;
    kind.api
      .options(record?.inst_profile_id ? { inst_profile_id: record.inst_profile_id } : scope())
      .then((r) => {
        if (cancelled) return;
        const o = rowsOf(r)[0] ?? {};
        setOptions(o);
        setValues(kind.initial(o, record ? (record.draft ?? record.pending?.config ?? record.config) : null));
      })
      .catch((e) => {
        notifications.error(e.message);
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, record, scope]);

  const body = () => kind.toBody(values, options);
  // Fixed fields go only with the add; an edit of an approved record sends
  // only what changed (lists whole).
  const editable = (all) => Object.fromEntries(Object.entries(all).filter(([k]) => !kind.fixed.includes(k)));
  const changes = (all) => {
    const before = record?.config ? kind.toBody(record.config, options) : {};
    return Object.fromEntries(Object.entries(editable(all)).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(before[k])));
  };

  const saveDraft = async () => {
    const response = added ? await kind.api.edit({ id, ...editable(body()), is_draft: true }) : await kind.api.add(scope({ ...body(), is_draft: true }));
    const savedId = rowsOf(response)[0]?.id ?? id;
    setId(savedId);
    return savedId;
  };
  const run = (which) => async () => {
    setBusy(which);
    setError("");
    try {
      if (which === "draft") {
        const savedId = await saveDraft();
        notifications.success(t("draftSaved"));
        onSaved(savedId);
        return;
      }
      if (drafting) {
        const savedId = await saveDraft();
        const response = await kind.api.submit({ id: savedId });
        notifications.success(response?.message ?? t("submitted"));
        onSaved(savedId);
        return;
      }
      const diff = changes(body());
      if (!Object.keys(diff).length) {
        setError(t("nothingChanged"));
        return;
      }
      const response = await kind.api.edit({ id, ...diff });
      notifications.success(response?.message ?? t("submitted"));
      onSaved(id);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  if (!values || !options) {
    return (
      <div className="flex items-center gap-2 pt-10 text-sm text-muted-foreground">
        {error ? <Problems message={error} /> : <Spinner size={16} />}
        {!error && t("loading")}
      </div>
    );
  }

  const Form = kind.Form;
  const set = (patch) => setValues((v) => ({ ...v, ...patch }));
  const missing = kind.missing(values, { added });

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary">
        <ArrowLeft size={15} /> {t(kind.backLabel)}
      </button>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-800">{record ? t("editX", { name: record.name || record.code }) : t(kind.newLabel)}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{drafting ? t("formDraftHint") : t("formProposeHint")}</p>

      <div className="grid gap-4">
        <Form values={values} set={set} options={options} locked={added} record={record} />
        <Problems message={error} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        {missing ? <p className="text-xs font-semibold text-amber-700">{t(missing)}</p> : <span />}
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={onClose} disabled={Boolean(busy)}>
            {t("cancel")}
          </Button>
          {drafting && (
            <Button variant="secondary" icon={Save} loading={busy === "draft"} disabled={Boolean(busy) || Boolean(kind.missing(values, { added, draft: true }))} onClick={run("draft")}>
              {t("saveDraft")}
            </Button>
          )}
          <Button icon={Send} loading={busy === "save"} disabled={Boolean(busy) || Boolean(missing)} onClick={run("save")}>
            {drafting ? t("submitForApproval") : t("proposeChanges")}
          </Button>
        </div>
      </div>
    </div>
  );
}
