import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, ArrowLeft, CheckCircle2, FileText, Pencil, Plus, Power, RefreshCw, RotateCcw, Save, Send, Trash2, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { ListPanel } from "@/Components/Common/ListPanel";
import { PENDING_TABS } from "@/Components/Common/listTabs";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { Modal } from "@/Components/Common/Modal";
import { InstitutionField } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { ActionButtons, AuditTimeline, NarrationDialog, Problems, Section, inputClass, labelClass } from "@/Components/TermDeposits/depositShared";
import { ProductStatus } from "@/Components/TermDeposits/DepositProducts/productShared";
import { Field, MiniTable, Tabs, useInstitutionScope } from "@/Components/Loans/loanShared";
import { useListSearch } from "@/Hooks/useListSearch";
import { usePagePermission } from "@/Hooks/usePermission";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { institutionDocumentsApi as api } from "@/Services/Institution/institutionDocuments.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

const STATUSES = [
  [1, "Active"],
  [9, "Draft"],
  [2, "PendingAdd"],
  [5, "RejectedAdd"],
  [13, "Inactive"],
];
const CODE = /^[A-Z0-9_]{1,64}$/;
const blankText = () => ({ channel: "ALL", language: "", title: "", content: "", content_format: "MARKDOWN" });
const pairOf = (x) => `${x.channel}|${x.language ?? ""}`;

// The fields and texts as the server takes them.
const toBody = (c) => ({
  name: String(c.name ?? "").trim(),
  description: String(c.description ?? "").trim(),
  audience: c.audience,
  requires_acceptance: Boolean(c.requires_acceptance),
  texts: (c.texts ?? []).map((x) => ({ channel: x.channel, language: x.language ?? "", title: String(x.title ?? "").trim(), content: x.content ?? "", content_format: x.content_format || "MARKDOWN" })),
});

function useDocumentOptions(instProfileId) {
  const [options, setOptions] = useState(null);
  useEffect(() => {
    api
      .options(instProfileId ? { inst_profile_id: instProfileId } : {})
      .then((r) => setOptions(rowsOf(r)[0] ?? {}))
      .catch((e) => {
        notifications.error(e.message);
        setOptions({});
      });
  }, [instProfileId]);
  return options;
}

const nameIn = (list, code) => (list ?? []).find((x) => x.code === (code ?? ""))?.name ?? (code || "—");

// INSTITUTION > Institution Documents (menu 217): terms, privacy and other
// texts for customers and merchants, each text per channel and language.
export function InstitutionDocuments() {
  const { t } = useTranslation(["documents", "deposits", "common"]);
  const can = usePagePermission();
  const { chooser, institution, setInstitution, scope } = useInstitutionScope();
  const [tab, setTab] = useState("all");
  const [status, setStatus] = useState("");
  const [audience, setAudience] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term, bind: searchBind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0 });
  const [loading, setLoading] = useState(false);
  const [screen, setScreen] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const body = scope({ page, page_size: limit, ...(term ? { search: term } : {}), ...(status ? { status: Number(status) } : {}), ...(audience ? { audience } : {}) });
      const row = rowsOf(await (tab === "pending" ? api.pending(body) : api.list(body)))[0];
      setData({ items: row?.items ?? [], total: row?.total ?? 0 });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [tab, term, status, audience, page, limit, scope]);
  useEffect(() => {
    void load();
  }, [load]);

  const back = () => {
    setScreen(null);
    void load();
  };
  if (screen?.kind === "edit") return <DocumentEditor doc={screen.doc} scope={scope} onClose={() => (screen.doc ? setScreen({ kind: "view", id: screen.doc.id }) : back())} onSaved={(id) => setScreen({ kind: "view", id })} />;
  if (screen?.kind === "view") return <DocumentView id={screen.id} onBack={back} onEdit={(doc) => setScreen({ kind: "edit", doc })} />;

  const columns = [
    {
      key: "name",
      label: t("document"),
      align: "left",
      render: (d) => (
        <button type="button" onClick={() => setScreen({ kind: "view", id: d.id })} className="text-left">
          <p className="text-xs font-bold text-primary hover:underline">{d.name || d.code}</p>
          <p className="text-[10px] text-muted-foreground">{d.code}</p>
        </button>
      ),
    },
    { key: "audience", label: t("audience"), render: (d) => <span className="text-xs font-semibold">{t(`audience_${d.audience}`, { defaultValue: d.audience })}</span> },
    { key: "text_count", label: t("texts"), render: (d) => <span className="text-xs tabular-nums">{d.text_count ?? "—"}</span> },
    { key: "requires_acceptance", label: t("acceptance"), render: (d) => <span className="text-xs">{d.requires_acceptance ? t("mustAccept") : t("infoOnly")}</span> },
    { key: "status", label: t("status"), render: (d) => <ProductStatus product={d} /> },
    { key: "inst_profile_name", label: t("institution"), render: (d) => <span className="text-xs">{d.inst_profile_name}</span> },
    { key: "updated_time", label: t("updated"), render: (d) => <span className="whitespace-nowrap text-xs">{accountDate(d.updated_time ?? d.created_time)}</span> },
    { key: "actions", label: t("common:actions"), sortable: false, render: (d) => <RowActions buttons={{ view: true }} onView={() => setScreen({ kind: "view", id: d.id })} /> },
  ];

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <FileText size={22} className="text-primary" /> {t("title")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" icon={RefreshCw} onClick={() => void load()} disabled={loading}>
            {t("refresh")}
          </Button>
          {can("Add") && (
            <Button size="sm" icon={Plus} disabled={chooser && !institution} onClick={() => setScreen({ kind: "edit", doc: null })}>
              {t("newDocument")}
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
        searchPlaceholder={t("searchDocuments")}
        filters={
          <>
            <FilterSelect value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "", label: t("anyStatus") }, ...STATUSES.map(([v, k]) => ({ value: String(v), label: t(`deposits:pstatus_${k}`) }))]} />
            <FilterSelect value={audience} onChange={(v) => { setAudience(v); setPage(1); }} options={[{ value: "", label: t("anyAudience") }, ...["ALL", "CUSTOMER", "MERCHANT"].map((a) => ({ value: a, label: t(`audience_${a}`) }))]} />
          </>
        }
      >
        <DataTable
          bare
          columns={columns}
          rows={data.items}
          rowKey={(d) => d.id}
          isLoading={loading}
          title={t(`deposits:tab_${tab}`)}
          emptyTitle={t("noDocuments")}
          emptyDescription={t("noDocumentsHint")}
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

// A text's content as written (Markdown and HTML shown as source, never run).
function TextContent({ text }) {
  return <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-muted/30 p-3 font-sans text-sm">{text.content}</pre>;
}

// The texts of a configuration; with `other`, texts new or changed are marked.
function TextsTable({ texts, options, other, onOpen }) {
  const { t } = useTranslation("documents");
  const before = other ? new Map(other.map((x) => [pairOf(x), JSON.stringify(x)])) : null;
  return (
    <MiniTable
      rows={texts ?? []}
      rowKey={pairOf}
      empty={t("noTexts")}
      rowClass={(x) => (before && before.get(pairOf(x)) !== JSON.stringify(x) ? "bg-amber-50" : undefined)}
      columns={[
        { key: "channel", label: t("channel"), render: (x) => nameIn(options?.channels, x.channel) },
        { key: "language", label: t("language"), render: (x) => nameIn(options?.languages, x.language) },
        { key: "title", label: t("textTitle"), render: (x) => <b>{x.title}</b> },
        { key: "content_format", label: t("format"), render: (x) => t(`format_${x.content_format}`, { defaultValue: x.content_format }) },
        { key: "size", label: t("length"), render: (x) => <span className="tabular-nums">{t("chars", { count: (x.content ?? "").length })}</span> },
        { key: "open", label: "", render: (x) => <RowActions buttons={{ view: true }} onView={() => onOpen(x)} /> },
      ]}
    />
  );
}

// One document: what is in effect, what waits for a checker, and its
// versions, acceptances and history.
function DocumentView({ id, onBack, onEdit }) {
  const { t } = useTranslation(["documents", "deposits"]);
  const can = usePagePermission();
  const [d, setD] = useState(null);
  const [audit, setAudit] = useState([]);
  const [tab, setTab] = useState("texts");
  const [dialog, setDialog] = useState(null);
  const [reading, setReading] = useState(null);
  const [busy, setBusy] = useState(false);
  const options = useDocumentOptions(d?.inst_profile_id);

  const reload = useCallback(async () => {
    try {
      const [got, history] = await Promise.all([api.get({ id }), api.audit({ id }).catch(() => null)]);
      setD(rowsOf(got)[0] ?? null);
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
      const response = await api[verb]({ id, ...(narration ? { narration } : {}) });
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      if (verb === "delete" && Number(d.status) === 9) return onBack();
      await reload();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  if (!d) return <PageSkeleton />;

  const a = d.actions ?? {};
  const ask = (verb) => () => setDialog(verb);
  const buttons = [
    a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: () => onEdit(d) },
    a.submit && can("Add") && { key: "submit", label: t("submit"), icon: Send, variant: "outline", run: ask("submit") },
    a.deactivate && can("Change Status") && { key: "deactivate", label: t("deactivate"), icon: Power, run: ask("deactivate") },
    a.reactivate && can("Change Status") && { key: "reactivate", label: t("reactivate"), icon: RotateCcw, run: ask("reactivate") },
    a.delete && can("Delete") && { key: "delete", label: t("delete"), icon: Trash2, variant: "danger", run: ask("delete") },
    a.deauth && can("Authorise") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: ask("deauth") },
    a.auth && can("Authorise") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: ask("auth") },
  ];
  const shown = d.draft ?? d.config;
  const version = (x) => d.published?.find((p) => pairOf(p) === pairOf(x));

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToDocuments")}
      </button>
      <div className="mb-4 rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-black">{d.name || d.code}</h1>
              <ProductStatus product={d} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {d.code} · {t(`audience_${shown?.audience ?? d.audience}`, { defaultValue: shown?.audience ?? d.audience })} · {(shown?.requires_acceptance ?? d.requires_acceptance) ? t("mustAccept") : t("infoOnly")} · {d.inst_profile_name}
            </p>
            {shown?.description && <p className="mt-2 text-sm">{shown.description}</p>}
          </div>
          <ActionButtons buttons={buttons} busy={busy} />
        </div>
        {d.warnings?.length > 0 && (
          <ul className="mt-3 grid gap-1 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
            {d.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <AlertTriangle size={13} className="mt-0.5 shrink-0" /> {w}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Tabs tabs={["texts", "versions", "acceptances", "history"].map((key) => ({ key }))} value={tab} onChange={setTab} labelOf={(key) => t(`tab_${key}`)} />

      {tab === "texts" &&
        (d.pending ? (
          <div className="grid gap-4">
            {d.config && (
              <Section title={t("inEffect")}>
                <TextsTable texts={d.config.texts} options={options} onOpen={setReading} />
              </Section>
            )}
            <Section title={t("deposits:proposedBy", { action: t(`deposits:pending_${d.pending.action}`, { defaultValue: d.pending.action }), name: d.pending.proposed_by?.name ?? d.pending.proposed_by ?? "—", date: accountDate(d.pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
              {d.pending.config ? <TextsTable texts={d.pending.config.texts} options={options} other={d.config?.texts} onOpen={setReading} /> : <p className="text-sm text-muted-foreground">{t(`pendingHint_${d.pending.action}`, { defaultValue: "" })}</p>}
            </Section>
          </div>
        ) : (
          <Section title={d.draft ? t("draft") : t("inEffect")}>
            <TextsTable texts={shown?.texts} options={options} onOpen={(x) => setReading({ ...x, version: version(x) })} />
          </Section>
        ))}
      {tab === "versions" && <VersionsTab id={id} options={options} />}
      {tab === "acceptances" && <AcceptancesTab id={id} options={options} />}
      {tab === "history" && (
        <Section title={t("tab_history")}>
          <AuditTimeline audit={audit} empty={t("nothingYet")} />
        </Section>
      )}

      {reading && (
        <Modal open onClose={() => setReading(null)} size="lg" title={reading.title} subtitle={`${nameIn(options?.channels, reading.channel)} · ${nameIn(options?.languages, reading.language)} · ${t(`format_${reading.content_format}`, { defaultValue: reading.content_format })}${reading.version ? ` · ${t("versionX", { n: reading.version.version_no })}` : ""}`}>
          <TextContent text={reading} />
        </Modal>
      )}
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

const VERSION_TONE = { CURRENT: "bg-emerald-50 text-emerald-800", SUPERSEDED: "bg-muted text-muted-foreground", WITHDRAWN: "bg-red-50 text-red-700" };
const VersionStatus = ({ status }) => {
  const { t } = useTranslation("documents");
  return <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-bold", VERSION_TONE[status] ?? "bg-muted")}>{t(`vstatus_${status}`, { defaultValue: status })}</span>;
};

// Every version of every text; an old text opens with its content.
function VersionsTab({ id, options }) {
  const { t } = useTranslation("documents");
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    api
      .versions({ id })
      .then((r) => setRows(rowsOf(r)))
      .catch((e) => {
        notifications.error(e.message);
        setRows([]);
      });
  }, [id]);
  const read = async (versionId) => {
    try {
      setOpen(rowsOf(await api.version_get({ version_id: versionId }))[0] ?? null);
    } catch (e) {
      notifications.error(e.message);
    }
  };
  if (!rows) return <PageSkeleton />;
  return (
    <Section title={t("tab_versions")}>
      <MiniTable
        rows={rows}
        rowKey={(v) => v.version_id}
        empty={t("noVersions")}
        columns={[
          { key: "pair", label: t("text"), render: (v) => `${nameIn(options?.channels, v.channel)} · ${nameIn(options?.languages, v.language)}` },
          { key: "version_no", label: t("version"), render: (v) => <b className="tabular-nums">v{v.version_no}</b> },
          { key: "title", label: t("textTitle"), render: (v) => v.title },
          { key: "status", label: t("status"), render: (v) => <VersionStatus status={v.status} /> },
          { key: "published_at", label: t("published"), render: (v) => `${accountDate(v.published_at)} · ${v.published_by ?? "—"}` },
          { key: "ended_at", label: t("ended"), render: (v) => (v.ended_at ? accountDate(v.ended_at) : "—") },
          { key: "open", label: "", render: (v) => <RowActions buttons={{ view: true }} onView={() => void read(v.version_id)} /> },
        ]}
      />
      {open && (
        <Modal open onClose={() => setOpen(null)} size="lg" title={open.title} subtitle={`${nameIn(options?.channels, open.channel)} · ${nameIn(options?.languages, open.language)} · ${t("versionX", { n: open.version_no })} · ${t(`vstatus_${open.status}`, { defaultValue: open.status })}`}>
          <TextContent text={open} />
        </Modal>
      )}
    </Section>
  );
}

// Who accepted which version, with the count per version.
function AcceptancesTab({ id, options }) {
  const { t } = useTranslation("documents");
  const [versionId, setVersionId] = useState("");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { term, bind } = useListSearch(() => setPage(1));
  const [data, setData] = useState({ items: [], total: 0, by_version: [] });
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    setLoading(true);
    api
      .acceptances({ id, page, page_size: limit, ...(versionId ? { version_id: Number(versionId) } : {}), ...(term ? { search: term } : {}) })
      .then((r) => {
        const row = rowsOf(r)[0] ?? {};
        setData((prev) => ({ items: row.items ?? [], total: row.total ?? 0, by_version: row.by_version ?? prev.by_version }));
      })
      .catch((e) => notifications.error(e.message))
      .finally(() => setLoading(false));
  }, [id, page, limit, versionId, term]);
  const pairName = (v) => `${nameIn(options?.channels, v.channel)} · ${nameIn(options?.languages, v.language)} · v${v.version_no}`;
  return (
    <div className="grid gap-4">
      {data.by_version.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {data.by_version.map((v) => (
            <button
              key={v.version_id}
              type="button"
              onClick={() => {
                setVersionId(String(v.version_id) === versionId ? "" : String(v.version_id));
                setPage(1);
              }}
              className={cn("rounded-2xl border bg-card p-3 text-left transition-colors hover:border-primary", String(v.version_id) === versionId ? "border-primary ring-1 ring-primary" : "border-border")}
            >
              <p className="text-[11px] font-semibold text-muted-foreground">{pairName(v)}</p>
              <p className="mt-1 flex items-center justify-between gap-2">
                <span className="text-2xl font-black tabular-nums">{v.accepted}</span>
                <VersionStatus status={v.status} />
              </p>
            </button>
          ))}
        </div>
      )}
      <ListPanel tabs={[]} rows={data.items} total={data.total} serverFiltered {...bind} searchPlaceholder={t("searchAcceptances")}>
        <DataTable
          bare
          rows={data.items}
          rowKey={(r, i) => `${r.version_id}-${r.login_id}-${i}`}
          isLoading={loading}
          title={t("tab_acceptances")}
          emptyTitle={t("noAcceptances")}
          emptyDescription={t("noAcceptancesHint")}
          serverSorted
          columns={[
            { key: "name", label: t("acceptedBy"), align: "left", render: (r) => <span className="text-xs"><b>{r.name}</b> <span className="text-muted-foreground">{r.login_id}</span></span> },
            { key: "party", label: t("party"), render: (r) => <span className="text-xs">{t(`audience_${r.party}`, { defaultValue: r.party })}</span> },
            { key: "version", label: t("text"), render: (r) => <span className="text-xs">{pairName(r)}</span> },
            { key: "accepted_on", label: t("acceptedOn"), render: (r) => <span className="text-xs">{r.accepted_on}</span> },
            { key: "accepted_at", label: t("when"), render: (r) => <span className="whitespace-nowrap text-xs">{accountDate(r.accepted_at)}</span> },
          ]}
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

// Add or edit a document. A new one or a Draft / Rejected Add saves drafts
// and is submitted; a live one proposes its change in one edit.
function DocumentEditor({ doc, scope, onClose, onSaved }) {
  const { t } = useTranslation(["documents", "deposits"]);
  const options = useDocumentOptions(doc?.inst_profile_id ?? scope().inst_profile_id);
  const [code, setCode] = useState("");
  const [config, setConfig] = useState(null);
  const [id, setId] = useState(doc?.id ?? null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const drafting = !doc || [9, 5].includes(Number(doc.status));
  const started = useRef(false);

  useEffect(() => {
    if (!options || started.current) return;
    started.current = true;
    const source = doc ? (doc.draft ?? doc.pending?.config ?? doc.config) : options.defaults;
    setConfig(structuredClone(source ?? { audience: "ALL", requires_acceptance: false, texts: [] }));
  }, [options, doc]);

  if (!config || !options) return <PageSkeleton />;

  const max = options.max_content_length ?? 200000;
  const texts = config.texts ?? [];
  const pairs = texts.map(pairOf);
  const duplicate = pairs.some((p, i) => pairs.indexOf(p) !== i);
  const textsOk = texts.every((x) => x.channel && String(x.title ?? "").trim() && String(x.content ?? "").trim() && x.title.length <= 255 && x.content.length <= max) && !duplicate;
  const codeOk = doc || CODE.test(code);
  // A draft needs only the code; a submit needs a name and at least one text.
  const draftReady = codeOk && !duplicate;
  const submitReady = codeOk && String(config.name ?? "").trim() && texts.length > 0 && textsOk;
  const setText = (i, patch) => setConfig((c) => ({ ...c, texts: c.texts.map((x, k) => (k === i ? { ...x, ...patch } : x)) }));
  const listOf = (rows) => ({ type: "select", options: (rows ?? []).map((x) => ({ value: x.code, label: x.name })) });

  const save = async (submit) => {
    setBusy(true);
    setError("");
    try {
      let savedId = id;
      if (drafting) {
        const body = { ...toBody(config), is_draft: true };
        const response = id ? await api.edit({ id, ...body }) : await api.add(scope({ code, ...body }));
        savedId = rowsOf(response)[0]?.id ?? id;
        setId(savedId);
        if (!submit) {
          notifications.success(t("deposits:draftSaved"));
          return;
        }
      }
      const response = drafting ? await api.submit({ id: savedId }) : await api.edit({ id: savedId, ...toBody(config) });
      notifications.success(response?.message ?? t("deposits:submitted"));
      onSaved(savedId);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onClose} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToDocuments")}
      </button>
      <h1 className="mb-1 text-2xl font-black tracking-tight text-slate-800">{doc ? t("editX", { name: doc.name || doc.code }) : t("newDocument")}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{drafting ? t("draftHint") : t("proposeHint")}</p>

      <Section title={t("document")} className="mb-4">
        {!doc && Object.keys(options.suggested_codes ?? {}).length > 0 && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">{t("suggested")}</span>
            {Object.entries(options.suggested_codes).map(([c, name]) => (
              <button
                key={c}
                type="button"
                onClick={() => {
                  setCode(c);
                  setConfig((x) => ({ ...x, name: x.name || name }));
                }}
                className={cn("rounded-full border px-2.5 py-1 text-[11px] font-bold transition-colors", code === c ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:border-primary hover:text-primary")}
              >
                {name}
              </button>
            ))}
          </div>
        )}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <label className={labelClass}>
            {t("code")}
            <Field field={{ placeholder: "TERMS" }} disabled={Boolean(doc)} value={doc?.code ?? code} onChange={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9_]/g, "").slice(0, 64))} />
            {!doc && <span className="mt-1 block text-[10px] font-normal text-muted-foreground">{t("codeHint")}</span>}
          </label>
          <label className={labelClass}>
            {t("name")}
            <Field field={{ placeholder: "Terms and Conditions" }} value={config.name} onChange={(v) => setConfig((c) => ({ ...c, name: v }))} />
          </label>
          <label className={labelClass}>
            {t("audience")}
            <Field field={{ type: "select", options: (options.audiences ?? ["ALL", "CUSTOMER", "MERCHANT"]).map((a) => ({ value: a, label: t(`audience_${a}`, { defaultValue: a }) })) }} value={config.audience} onChange={(v) => setConfig((c) => ({ ...c, audience: v }))} />
          </label>
          <label className={cn(labelClass, "md:col-span-2 lg:col-span-2")}>
            {t("description")}
            <Field field={{ placeholder: "What the customer agrees to" }} value={config.description} onChange={(v) => setConfig((c) => ({ ...c, description: v }))} />
          </label>
          <div className={cn(labelClass, "self-end")}>
            <Field field={{ type: "bool", label: t("mustAcceptLabel") }} value={config.requires_acceptance} onChange={(v) => setConfig((c) => ({ ...c, requires_acceptance: v }))} />
          </div>
        </div>
      </Section>

      <Section
        title={t("texts")}
        action={
          <Button size="sm" variant="secondary" icon={Plus} onClick={() => setConfig((c) => ({ ...c, texts: [...(c.texts ?? []), blankText()] }))}>
            {t("addText")}
          </Button>
        }
      >
        <p className="mb-3 text-xs text-muted-foreground">{t("textsHint")}</p>
        {texts.length === 0 && <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">{t("noTexts")}</p>}
        <div className="grid gap-3">
          {texts.map((x, i) => {
            const clash = pairs.indexOf(pairOf(x)) !== i;
            return (
              <div key={i} className={cn("rounded-2xl border p-3", clash ? "border-red-300 bg-red-50/40" : "border-border")}>
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-[1fr_1fr_2fr_1fr_auto]">
                  <label className={labelClass}>
                    {t("channel")}
                    <Field field={listOf(options.channels)} value={x.channel} onChange={(v) => setText(i, { channel: v })} />
                  </label>
                  <label className={labelClass}>
                    {t("language")}
                    <Field field={listOf(options.languages)} value={x.language ?? ""} onChange={(v) => setText(i, { language: v })} />
                  </label>
                  <label className={labelClass}>
                    {t("textTitle")}
                    <Field field={{ placeholder: "Terms and Conditions" }} value={x.title} onChange={(v) => setText(i, { title: v.slice(0, 255) })} />
                  </label>
                  <label className={labelClass}>
                    {t("format")}
                    <Field field={{ type: "select", options: (options.content_formats ?? ["MARKDOWN", "PLAIN", "HTML"]).map((f) => ({ value: f, label: t(`format_${f}`, { defaultValue: f }) })) }} value={x.content_format} onChange={(v) => setText(i, { content_format: v })} />
                  </label>
                  <button type="button" onClick={() => setConfig((c) => ({ ...c, texts: c.texts.filter((_, k) => k !== i) }))} className="self-end rounded-lg p-2 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label={t("removeText")}>
                    <Trash2 size={15} />
                  </button>
                </div>
                <label className={cn(labelClass, "mt-3 block")}>
                  {t("content")}
                  <textarea
                    className={cn(inputClass, "mt-1 min-h-40 resize-y font-mono text-xs leading-relaxed")}
                    value={x.content}
                    maxLength={max}
                    placeholder={x.content_format === "MARKDOWN" ? "# Terms\n\n1. Use the wallet lawfully.\n2. Keep your PIN secret." : x.content_format === "HTML" ? "<h1>Terms</h1>\n<p>Use the wallet lawfully.</p>" : "Use the wallet lawfully. Keep your PIN secret."}
                    onChange={(e) => setText(i, { content: e.target.value })}
                  />
                </label>
                <div className="mt-1 flex justify-between gap-2 text-[10px] text-muted-foreground">
                  <span className="font-semibold text-red-700">{clash ? t("duplicatePair") : ""}</span>
                  <span className="tabular-nums">{t("charsOf", { count: (x.content ?? "").length, max: max.toLocaleString() })}</span>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

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
          <Button variant="secondary" icon={Save} loading={busy} disabled={!draftReady} onClick={() => save(false)}>
            {t("deposits:saveDraft")}
          </Button>
        )}
        <Button icon={Send} loading={busy} disabled={!submitReady} onClick={() => save(true)}>
          {drafting ? t("deposits:submitForApproval") : t("proposeChanges")}
        </Button>
      </div>
    </div>
  );
}
