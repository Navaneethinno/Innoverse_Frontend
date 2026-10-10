import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown, ChevronRight, Download, Eye, FolderTree, Plus, Save, Send, Upload } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Spinner } from "@/Components/Common/Spinner";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { useListSearch } from "@/Hooks/useListSearch";
import { glAccountsApi, glUploadsApi } from "@/Services/Accounting/accounting.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { Tabs } from "../Loans/loanShared";
import { ActionButtons, AuditTimeline, Problems, Section, inputClass, labelClass } from "../TermDeposits/depositShared";
import { ProductStatus } from "../TermDeposits/DepositProducts/productShared";
import { Balances, GL_TYPES, GlType, useRecordActions } from "./accountingShared";
import { GlUploads, UploadDialog } from "./GlUploads";

// ACCOUNTING > Chart of Accounts (menu 213): the institution's GL tree.
// Parents group, accounts receive postings. Each GL is added, changed,
// deactivated or deleted on its own and waits for a checker; a whole chart
// can also be uploaded from a file (Uploads tab).
export function ChartOfAccounts() {
  const { t } = useTranslation("accounting");
  const can = usePagePermission();
  const [tab, setTab] = useState("tree");
  const [options, setOptions] = useState(null);
  const [form, setForm] = useState(null); // { gl } to edit, or { parent } to add under
  const [viewing, setViewing] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState(0);
  const refresh = () => setVersion((v) => v + 1);

  useEffect(() => {
    glAccountsApi
      .options({})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => notifications.error(e.message));
  }, [version]);

  const template = async (format) => {
    try {
      const { blob, fileName } = await glUploadsApi.template(format);
      saveBlob(blob, fileName);
    } catch (e) {
      notifications.error(e.message);
    }
  };

  return (
    <div className="pb-8 pt-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <PageTitle>{t("coaTitle")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("coaSubtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" icon={Download} onClick={() => template("XLSX")}>
            {t("template")}
          </Button>
          {can("Add") && (
            <>
              <Button variant="secondary" size="sm" icon={Upload} onClick={() => setUploading(true)}>
                {t("upload")}
              </Button>
              <Button size="sm" icon={Plus} onClick={() => setForm({ parent: null })}>
                {t("addGl")}
              </Button>
            </>
          )}
        </div>
      </div>
      <Tabs tabs={[{ key: "tree" }, { key: "pending" }, { key: "uploads" }]} value={tab} onChange={setTab} labelOf={(k) => t(`coaTab_${k}`)} />
      {tab === "tree" && <GlTree version={version} onView={setViewing} onAdd={can("Add") ? (parent) => setForm({ parent }) : null} />}
      {tab === "pending" && <GlFlatList pending version={version} onView={setViewing} />}
      {tab === "uploads" && <GlUploads version={version} onChanged={refresh} />}

      {form && options && (
        <GlForm
          options={options}
          gl={form.gl}
          parent={form.parent}
          onClose={() => setForm(null)}
          onSaved={(saved) => {
            setForm(null);
            refresh();
            if (saved?.id) setViewing(saved.id);
          }}
        />
      )}
      {viewing && (
        <GlDetail
          id={viewing}
          onClose={() => setViewing(null)}
          onEdit={(gl) => {
            setViewing(null);
            setForm({ gl });
          }}
          onChanged={refresh}
        />
      )}
      {uploading && options && (
        <UploadDialog
          options={options}
          onClose={() => setUploading(false)}
          onSubmitted={() => {
            setUploading(false);
            setTab("uploads");
            refresh();
          }}
        />
      )}
    </div>
  );
}

// The tree, collapsed below the top level until opened; a search shows the
// matching GLs as a flat list instead.
function GlTree({ version, onView, onAdd }) {
  const { t } = useTranslation("accounting");
  const { term, bind } = useListSearch();
  const [tree, setTree] = useState(null);
  const [inactive, setInactive] = useState(false);
  const [open, setOpen] = useState(() => new Set());

  useEffect(() => {
    let cancelled = false;
    setTree(null);
    glAccountsApi
      .tree({ include_inactive: inactive })
      .then((r) => !cancelled && setTree(rowsOf(r)))
      .catch((e) => {
        if (!cancelled) {
          notifications.error(e.message);
          setTree([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [inactive, version]);

  const parentIds = useMemo(() => {
    const ids = [];
    const walk = (nodes) => nodes.forEach((n) => n.children?.length && (ids.push(n.id), walk(n.children)));
    walk(tree ?? []);
    return ids;
  }, [tree]);

  const toggle = (id) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const rows = [];
  const walk = (nodes, depth) =>
    nodes.forEach((n) => {
      rows.push({ n, depth });
      if (open.has(n.id)) walk(n.children ?? [], depth + 1);
    });
  walk(tree ?? [], 0);

  return (
    <ListPanel
      tabs={[]}
      {...bind}
      searchPlaceholder={t("searchGl")}
      filters={
        <>
          <Toggle showLabel label={t("showInactive")} checked={inactive} onChange={setInactive} />
          {!term && (
            <Button size="sm" variant="ghost" onClick={() => setOpen(open.size ? new Set() : new Set(parentIds))}>
              {t(open.size ? "collapseAll" : "expandAll")}
            </Button>
          )}
        </>
      }
    >
      {term ? (
        <GlFlatList search={term} version={version} onView={onView} bare />
      ) : !tree ? (
        <div className="flex justify-center p-6">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5">{t("gl")}</th>
                <th className="px-3 py-2.5">{t("glCode")}</th>
                <th className="px-3 py-2.5">{t("accountNumber")}</th>
                <th className="px-3 py-2.5">{t("glType")}</th>
                <th className="px-3 py-2.5 text-right">{t("balance")}</th>
                <th className="px-3 py-2.5">{t("status")}</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {rows.map(({ n, depth }) => (
                <tr key={n.id} className="border-b border-border/60 hover:bg-muted/40">
                  <td className="px-4 py-2">
                    <span className="flex items-center gap-1.5" style={{ paddingLeft: depth * 18 }}>
                      {n.children?.length ? (
                        <button type="button" aria-label={t(open.has(n.id) ? "collapse" : "expand")} onClick={() => toggle(n.id)} className="rounded p-0.5 text-muted-foreground hover:bg-muted">
                          {open.has(n.id) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      ) : (
                        <span className="w-[18px]" />
                      )}
                      <button type="button" onClick={() => onView(n.id)} className={cn("text-left hover:text-primary hover:underline", n.is_account ? "text-xs" : "text-xs font-bold")}>
                        {n.name}
                      </button>
                      {!n.is_account && <span className="text-[10px] text-muted-foreground">({n.children?.length ?? 0})</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-xs">{n.gl_code || "—"}</td>
                  <td className="px-3 py-2 font-mono text-xs">{n.account_number || "—"}</td>
                  <td className="px-3 py-2">
                    <GlType value={n.gl_type} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Balances balances={n.balances} />
                  </td>
                  <td className="px-3 py-2">
                    <ProductStatus product={n} />
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex justify-end gap-1">
                      {!n.is_account && onAdd && <ActionIconButton label={t("addUnder")} intent="edit" icon={Plus} onClick={() => onAdd(n)} />}
                      <ActionIconButton label={t("view")} intent="view" icon={Eye} onClick={() => onView(n.id)} />
                    </span>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-sm text-muted-foreground">
                    {t("noGls")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </ListPanel>
  );
}

// GLs as a paged table: a search's matches, or those waiting for a checker.
function GlFlatList({ search = "", pending = false, version, onView, bare = false }) {
  const { t } = useTranslation("accounting");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);

  useEffect(() => setPage(1), [search]);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const body = { page, page_size: limit, ...(search ? { search } : {}) };
    (pending ? glAccountsApi.pending(body) : glAccountsApi.list(body))
      .then((r) => {
        const row = rowsOf(r)[0];
        if (!cancelled) setData({ items: row?.items ?? [], total: row?.total ?? 0 });
      })
      .catch((e) => !cancelled && notifications.error(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [search, pending, page, limit, version]);

  const columns = [
    {
      key: "name",
      label: t("gl"),
      align: "left",
      render: (g) => (
        <button type="button" onClick={() => onView(g.id)} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{g.name}</p>
          <p className="text-[10px] text-muted-foreground">{g.parent_name || t("topLevel")}</p>
        </button>
      ),
    },
    { key: "gl_code", label: t("glCode"), render: (g) => <span className="font-mono text-xs">{g.gl_code || "—"}</span> },
    { key: "account_number", label: t("accountNumber"), render: (g) => <span className="font-mono text-xs">{g.account_number || (g.is_account ? "—" : t("parent"))}</span> },
    { key: "gl_type", label: t("glType"), render: (g) => <GlType value={g.gl_type} /> },
    { key: "balances", label: t("balance"), sortable: false, render: (g) => <Balances balances={g.balances} /> },
    { key: "status", label: t("status"), render: (g) => <ProductStatus product={g} /> },
    { key: "updated_time", label: t("updated"), render: (g) => <span className="whitespace-nowrap text-xs">{accountDate(g.updated_time ?? g.created_time)}</span> },
  ];
  const table = (
    <DataTable
      bare
      columns={columns}
      rows={data.items}
      rowKey={(g) => g.id}
      isLoading={loading}
      title={t(pending ? "coaTab_pending" : "searchResults")}
      emptyTitle={t(pending ? "noPendingGls" : "noGls")}
      serverSorted
      serverPagination={{
        page,
        totalPages: Math.max(1, Math.ceil(data.total / limit)),
        totalRecords: data.total,
        onPageChange: setPage,
        limit,
        onLimitChange: (n) => {
          setLimit(Math.min(n, 500));
          setPage(1);
        },
      }}
    />
  );
  return bare ? table : <ListPanel tabs={[]}>{table}</ListPanel>;
}

const FIELDS = ["parent_id", "is_account", "name", "description", "gl_code", "gl_type", "posting_type", "fsa", "sub_fsa", "remarks", "currency_id", "multi_currency"];
const formOf = (gl, parent, options) => {
  const base = currencyDefault(options);
  if (gl) {
    const source = { ...gl, ...(gl.draft ?? {}), ...(gl.pending?.fields ?? {}) };
    return Object.fromEntries(FIELDS.map((k) => [k, source[k] ?? ""]));
  }
  return { parent_id: parent?.id ?? 0, is_account: true, name: "", description: "", gl_code: "", gl_type: parent?.gl_type ?? "", posting_type: "", fsa: "", sub_fsa: "", remarks: "", currency_id: base, multi_currency: false };
};
const currencyDefault = (options) => (options.currencies ?? []).find((c) => c.is_base_currency)?.id ?? options.currencies?.[0]?.id ?? "";

// Add a GL (under `parent`), or change one. A new one can be saved as a
// draft; a change of a live GL waits for a checker with the live values
// kept until then. Only the fields that changed are sent on edit.
function GlForm({ options, gl, parent, onClose, onSaved }) {
  const { t } = useTranslation("accounting");
  const [values, setValues] = useState(() => formOf(gl, parent, options));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [narration, setNarration] = useState("");
  const set = (key) => (value) => setValues((v) => ({ ...v, [key]: value?.target ? value.target.value : value }));
  const parentRow = (options.parents ?? []).find((p) => String(p.id) === String(values.parent_id));
  const draftable = !gl || [9, 5].includes(Number(gl.status));
  const defaultPosting = (options.types ?? []).find((x) => x.code === values.gl_type)?.posting_type;

  const body = () => {
    const clean = {
      ...values,
      parent_id: Number(values.parent_id) || 0,
      name: values.name.trim(),
      description: values.description.trim(),
      gl_code: values.gl_code.trim(),
      fsa: values.fsa.trim(),
      sub_fsa: values.sub_fsa.trim(),
      remarks: values.remarks.trim(),
      currency_id: values.is_account && !values.multi_currency ? Number(values.currency_id) || 0 : 0,
      multi_currency: Boolean(values.is_account && values.multi_currency),
    };
    if (!gl) return clean;
    const before = formOf(gl, null, options);
    return Object.fromEntries(Object.entries(clean).filter(([k, v]) => JSON.stringify(v) !== JSON.stringify(k === "parent_id" ? Number(before[k]) || 0 : before[k])));
  };

  const save = async (draft) => {
    setBusy(draft ? "draft" : "submit");
    setError("");
    try {
      const fields = body();
      const extra = { ...(narration.trim() ? { narration: narration.trim() } : {}) };
      const r = gl ? await glAccountsApi.edit({ id: gl.id, ...fields, ...extra }) : await glAccountsApi.add({ ...fields, ...extra, is_draft: draft });
      notifications.success(r?.message ?? t("saved"));
      onSaved(rowsOf(r)[0]);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy("");
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={gl ? t("editGlX", { name: gl.name }) : t("addGl")}
      icon={<FolderTree size={15} />}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t("cancel")}
          </Button>
          {!gl && draftable && (
            <Button variant="secondary" size="sm" icon={Save} loading={busy === "draft"} disabled={!values.name.trim()} onClick={() => save(true)}>
              {t("saveDraft")}
            </Button>
          )}
          <Button size="sm" icon={Send} loading={busy === "submit"} disabled={!values.name.trim()} onClick={() => save(false)}>
            {t(gl && !draftable ? "proposeChange" : "submitForApproval")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <SegmentedSwitch
            value={values.is_account ? "account" : "parent"}
            onChange={(k) => set("is_account")(k === "account")}
            options={[
              { value: "account", label: t("kindAccount") },
              { value: "parent", label: t("kindParent") },
            ]}
          />
          <p className="mt-1 text-[11px] text-muted-foreground">{t(values.is_account ? "kindAccountHint" : "kindParentHint")}</p>
        </div>
        <label className={cn(labelClass, "sm:col-span-2")}>
          {t("parentGl")}
          <FilterSelect
            className="mt-1.5"
            value={String(values.parent_id || 0)}
            onChange={(v) => {
              const p = (options.parents ?? []).find((x) => String(x.id) === v);
              setValues((x) => ({ ...x, parent_id: Number(v), ...(p ? { gl_type: p.gl_type } : {}) }));
            }}
            options={[{ value: "0", label: t("topLevel") }, ...(options.parents ?? []).filter((p) => p.id !== gl?.id).map((p) => ({ value: String(p.id), label: p.path }))]}
          />
        </label>
        <label className={labelClass}>
          {t("name")} <span className="text-red-600">*</span>
          <input className={cn(inputClass, "mt-1.5")} maxLength={150} value={values.name} onChange={set("name")} />
        </label>
        <label className={labelClass}>
          {t("glCode")}
          <input className={cn(inputClass, "mt-1.5 font-mono")} maxLength={30} value={values.gl_code} onChange={set("gl_code")} placeholder="210101" />
        </label>
        <label className={labelClass}>
          {t("glType")}
          <FilterSelect className="mt-1.5" disabled={Boolean(parentRow)} value={values.gl_type} onChange={set("gl_type")} options={[{ value: "", label: t("choose") }, ...GL_TYPES.map((x) => ({ value: x, label: t(`type_${x}`) }))]} />
          {parentRow && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("typeFromParent")}</span>}
        </label>
        <label className={labelClass}>
          {t("postingType")}
          <FilterSelect className="mt-1.5" value={values.posting_type} onChange={set("posting_type")} options={[{ value: "", label: defaultPosting ? t("followsType", { value: defaultPosting }) : t("choose") }, ...(options.posting_types ?? []).map((x) => ({ value: x, label: x }))]} />
        </label>
        {values.is_account && (
          <>
            <label className={labelClass}>
              {t("currency")}
              <FilterSelect className="mt-1.5" disabled={values.multi_currency} value={String(values.currency_id || "")} onChange={set("currency_id")} options={(options.currencies ?? []).map((c) => ({ value: String(c.id), label: `${c.alpha_code} · ${c.name}` }))} />
            </label>
            <div className="flex items-end">
              <Toggle showLabel label={t("multiCurrency")} checked={Boolean(values.multi_currency)} onChange={set("multi_currency")} />
            </div>
          </>
        )}
        <label className={labelClass}>
          {t("fsa")}
          <input className={cn(inputClass, "mt-1.5")} value={values.fsa} onChange={set("fsa")} />
        </label>
        <label className={labelClass}>
          {t("subFsa")}
          <input className={cn(inputClass, "mt-1.5")} value={values.sub_fsa} onChange={set("sub_fsa")} />
        </label>
        <label className={cn(labelClass, "sm:col-span-2")}>
          {t("description")}
          <input className={cn(inputClass, "mt-1.5")} value={values.description} onChange={set("description")} />
        </label>
        <label className={cn(labelClass, "sm:col-span-2")}>
          {t("remarks")}
          <input className={cn(inputClass, "mt-1.5")} value={values.remarks} onChange={set("remarks")} />
        </label>
        <label className={cn(labelClass, "sm:col-span-2")}>
          {t("narration")}
          <input className={cn(inputClass, "mt-1.5")} value={narration} onChange={(e) => setNarration(e.target.value)} />
        </label>
      </div>
      {error && (
        <div className="mt-3">
          <Problems message={error} />
        </div>
      )}
    </Modal>
  );
}

const DETAIL_FIELDS = ["gl_code", "gl_type", "normal_balance", "posting_type", "fsa", "sub_fsa", "currency", "purpose", "source", "description", "remarks"];
const shown = (g, key, t) => {
  if (key === "currency") return g.is_account ? (g.multi_currency ? t("multiCurrency") : g.currency_code || g.currency_name || "—") : "—";
  if (key === "gl_type") return g.gl_type ? t(`type_${g.gl_type}`) : "—";
  return g[key] === "" || g[key] == null ? "—" : String(g[key]);
};

// One GL: its fields and path, balances, the change waiting for a checker,
// the actions the caller may take, and its history.
function GlDetail({ id, onClose, onEdit, onChanged }) {
  const { t } = useTranslation("accounting");
  const [gl, setGl] = useState(null);
  const [audit, setAudit] = useState([]);

  const reload = useCallback(async () => {
    const [got, history] = await Promise.all([glAccountsApi.get({ id }), glAccountsApi.audit({ id }).catch(() => null)]);
    setGl(rowsOf(got)[0] ?? null);
    setAudit(history ? rowsOf(history) : []);
  }, [id]);
  useEffect(() => {
    reload().catch((e) => notifications.error(e.message));
  }, [reload]);

  const { buttons, busy, dialog } = useRecordActions({
    actions: gl?.actions,
    labels: { edit: () => onEdit(gl) },
    run: async (verb, narration) => {
      const r = await glAccountsApi[verb]({ id, ...(narration ? { narration } : {}) });
      notifications.success(r?.message ?? t("done"));
      onChanged();
      if (verb === "delete" && !rowsOf(r)[0]) return onClose();
      await reload();
    },
  });

  const pendingFields = gl?.pending?.fields ?? {};
  return (
    <Modal open onClose={onClose} size="xl" title={gl?.name ?? t("gl")} icon={<FolderTree size={15} />}>
      {!gl ? (
        <div className="flex justify-center p-6">
          <Spinner size={18} />
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <GlType value={gl.gl_type} />
                <ProductStatus product={gl} />
                <span className="font-mono text-xs text-muted-foreground">{gl.account_number || (gl.is_account ? t("numberOnApproval") : t("parent"))}</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{[...(gl.path ?? []).map((p) => p.name), gl.name].join(" › ")}</p>
            </div>
            <ActionButtons buttons={buttons} busy={busy} />
          </div>
          {gl.pending && (
            <Section title={t("pendingChange", { action: gl.pending.action, name: gl.pending.proposed_by?.name ?? gl.pending.proposed_by ?? "—", date: accountDate(gl.pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
              {Object.keys(pendingFields).length ? (
                <dl className="grid gap-2 text-xs sm:grid-cols-2">
                  {Object.entries(pendingFields).map(([k, v]) => (
                    <div key={k}>
                      <dt className="font-bold text-muted-foreground">{t(`field_${k}`, { defaultValue: k })}</dt>
                      <dd>
                        <span className="text-muted-foreground line-through">{String(gl[k] ?? "—") || "—"}</span> → <b>{String(v ?? "—") || "—"}</b>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-xs text-muted-foreground">{t("pendingNoFields")}</p>
              )}
            </Section>
          )}
          <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
            <Section title={t("details")}>
              <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
                {DETAIL_FIELDS.map((k) => (
                  <div key={k}>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t(`field_${k}`)}</dt>
                    <dd className="mt-0.5 font-medium">{shown(gl, k, t)}</dd>
                  </div>
                ))}
              </dl>
            </Section>
            <Section title={t("balance")}>
              <Balances balances={gl.balances} className="items-start" />
              {!gl.is_account && <p className="mt-2 text-[11px] text-muted-foreground">{t("parentBalanceHint", { count: gl.children ?? 0 })}</p>}
            </Section>
          </div>
          <Section title={t("history")}>
            <AuditTimeline audit={audit} empty={t("nothingYet")} />
          </Section>
        </div>
      )}
      {dialog}
    </Modal>
  );
}

