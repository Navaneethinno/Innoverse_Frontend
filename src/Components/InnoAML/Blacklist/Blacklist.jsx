import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ban, Clock3, FileUp, ListChecks, Plus, ShieldCheck, ShieldOff, Trash2, X, XCircle } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { ListPanel } from "@/Components/Common/ListPanel";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { NarrationDialog } from "@/Components/Finance/Deposits/depositShared";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { amlBlacklistApi } from "@/Services/InnoAML/aml.api";
import { formatDay } from "@/Utils/Lib/dateFormat";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { NameText, when } from "../Shared/amlShared";
import { usePagedList } from "../Shared/usePagedList";
import { BlacklistDetail } from "./BlacklistDetail";
import { BlacklistForm } from "./BlacklistForm";
import { BlacklistImport } from "./BlacklistImport";
import { CountryList, ENTITY_TYPES, EntryStatus, REASONS } from "./blacklistShared";

// "" = the server's default: ACTIVE and PENDING.
const STATUS_TABS = [
  ["", "aml:blTabCurrent", ListChecks],
  ["ACTIVE", "aml:blStatus_ACTIVE", Ban],
  ["PENDING", "aml:blStatus_PENDING", Clock3],
  ["EXPIRED", "aml:blStatus_EXPIRED", Clock3],
  ["REMOVED", "aml:blStatus_REMOVED", Trash2],
  ["REJECTED", "aml:blStatus_REJECTED", XCircle],
];

// InnoAML > Settings > Blacklist (menu 182): the institution's own list of
// people and companies it won't deal with, screened with every name next to
// the watchlists. Every add, edit and removal waits for a checker; a bulk
// import waits as one batch.
export function Blacklist() {
  const { t } = useTranslation(["aml", "common"]);
  const can = usePagePermission();
  const [view, setView] = useState("entries");
  const [filters, setFilters] = useState({ status: "", reason: "", entity_type: "" });
  const [batch, setBatch] = useState("");
  const [form, setForm] = useState(null); // { editing }
  const [importing, setImporting] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [action, setAction] = useState(null); // { type: auth | deauth | remove, id?, batch_id?, label }
  const [working, setWorking] = useState(false);

  const entries = usePagedList(amlBlacklistApi.list, { ...filters, batch_id: batch }, view === "entries");
  const pending = usePagedList(amlBlacklistApi.pending, { batch_id: batch }, view === "pending");
  const list = view === "entries" ? entries : pending;

  const setFilter = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const reloadAll = () => {
    void entries.reload();
    void pending.reload();
  };
  // Another user's change (and, for the whitelist, Match Review decisions).
  useLiveChannel(amlBlacklistApi.listPath, reloadAll);

  const decide = async (note) => {
    setWorking(true);
    try {
      const target = action.batch_id ? { batch_id: action.batch_id } : { id: action.id };
      const response =
        action.type === "remove"
          ? await amlBlacklistApi.remove({ id: action.id, comment: note })
          : await amlBlacklistApi[action.type]({ ...target, ...(note ? { narration: note } : {}) });
      notifications.success(apiMessage(response, t(action.type === "remove" ? "aml:blacklistSubmitted" : action.type === "auth" ? "aml:changeApproved" : "aml:changeRejected")));
      setAction(null);
      if (action.batch_id) setBatch("");
      reloadAll();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setWorking(false);
    }
  };

  const nameCell = (row) => (
    <span className="grid gap-0.5">
      <NameText name={row.name} latin={row.name_latin} className="font-semibold" />
      {row.aliases?.length > 0 && (
        <span dir="auto" className="line-clamp-1 max-w-72 text-[11px] text-muted-foreground" title={row.aliases.join(", ")}>
          {t("aml:aka")} {row.aliases.join(", ")}
        </span>
      )}
    </span>
  );
  const batchChip = (id) =>
    id ? (
      <button type="button" onClick={() => setBatch(id)} title={t("aml:showBatch")} className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground hover:text-primary">
        {t("aml:batchShort", { id: id.slice(0, 8) })}
      </button>
    ) : null;

  const entryColumns = [
    { key: "name", label: t("aml:name"), align: "left", render: nameCell },
    { key: "entity_type", label: t("aml:entityType"), render: (row) => t(`aml:entity_${row.entity_type}`, { defaultValue: row.entity_type }) },
    { key: "reason", label: t("aml:blReason"), render: (row) => t(`aml:blReason_${row.reason}`, { defaultValue: row.reason }) },
    {
      key: "identifiers",
      label: t("aml:identifiers"),
      render: (row) =>
        row.identifiers?.length ? (
          <span className="inline-flex flex-wrap justify-center gap-1">
            {row.identifiers.slice(0, 3).map((i, index) => (
              <span key={index} className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold" title={i.number}>
                {t(`aml:idType_${i.type}`, { defaultValue: i.type })}
              </span>
            ))}
            {row.identifiers.length > 3 && <span className="text-[10px] text-muted-foreground">+{row.identifiers.length - 3}</span>}
          </span>
        ) : (
          "-"
        ),
    },
    { key: "countries", label: t("aml:countries"), render: (row) => <span className="text-xs"><CountryList codes={row.countries} /></span> },
    { key: "expires_on", label: t("aml:blExpiresOn"), render: (row) => <span className="whitespace-nowrap text-xs">{row.expires_on ? formatDay(row.expires_on) : t("aml:never")}</span> },
    {
      key: "status",
      label: t("common:status"),
      render: (row) => (
        <span className="inline-grid justify-items-center gap-1">
          <EntryStatus entry={row} />
          {batchChip(row.batch_id)}
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => {
        const waiting = row.pending?.state === "PENDING";
        const editable = row.status === "ACTIVE" && !waiting;
        return (
          <RowActions
            buttons={{ view: true, edit: editable, delete: editable, authorize: waiting, deauthorize: waiting }}
            onView={() => setDetailId(row.id)}
            onEdit={() => setForm({ editing: row })}
            onDelete={() => setAction({ type: "remove", id: row.id, label: row.name })}
            onAuthorize={() => setAction({ type: "auth", id: row.pending.id, label: row.name })}
            onDeauthorize={() => setAction({ type: "deauth", id: row.pending.id, label: row.name })}
          />
        );
      },
    },
  ];

  const pendingColumns = [
    { key: "proposed_at", label: t("aml:proposedAt"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.proposed_at)}</span> },
    { key: "name", label: t("aml:name"), align: "left", render: (row) => <NameText name={row.data?.name ?? row.name ?? row.blacklist_name} className="font-semibold" /> },
    {
      key: "action",
      label: t("aml:change"),
      render: (row) => (
        <span className="inline-grid justify-items-center gap-1">
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${row.action === "REMOVE" ? "bg-muted text-muted-foreground" : "bg-amber-50 text-amber-700"}`}>{t(`aml:blAction_${row.action}`, { defaultValue: row.action })}</span>
          {batchChip(row.batch_id)}
        </span>
      ),
    },
    { key: "reason", label: t("aml:blReason"), render: (row) => (row.data?.reason ? t(`aml:blReason_${row.data.reason}`, { defaultValue: row.data.reason }) : "-") },
    { key: "comment", label: t("aml:comment"), align: "left", render: (row) => <span className="line-clamp-2 max-w-64 text-xs">{row.comment || "-"}</span> },
    { key: "proposed_by", label: t("aml:maker"), render: (row) => row.proposed_by ?? "-" },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => (
        <RowActions
          buttons={{ view: true, authorize: true, deauthorize: true }}
          onView={() => setDetailId(row.blacklist_id)}
          onAuthorize={() => setAction({ type: "auth", id: row.id, label: row.data?.name ?? row.name })}
          onDeauthorize={() => setAction({ type: "deauth", id: row.id, label: row.data?.name ?? row.name })}
        />
      ),
    },
  ];

  const actionTitle = action && (action.type === "remove" ? t("aml:removeEntry") : action.batch_id ? t(action.type === "auth" ? "aml:approveBatch" : "aml:rejectBatch") : t(action.type === "auth" ? "aml:approveChange" : "aml:rejectChange"));

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{t("aml:blacklistTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("aml:blacklistSubtitle")}</p>
      </div>
      <SegmentedSwitch
        className="mb-3"
        options={[
          { value: "entries", label: t("aml:blacklistEntries") },
          { value: "pending", label: t("aml:waitingForApproval") },
        ]}
        value={view}
        onChange={setView}
      />

      {batch && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/60 p-2.5 text-sm">
          <span className="font-semibold">
            {t("aml:importBatch")} <span className="font-mono text-xs">{batch}</span>
          </span>
          <span className="ml-auto flex flex-wrap gap-2">
            {can("Authorize") && (
              <>
                <button type="button" onClick={() => setAction({ type: "auth", batch_id: batch, label: batch })} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                  <ShieldCheck size={13} /> {t("aml:approveBatch")}
                </button>
                <button type="button" onClick={() => setAction({ type: "deauth", batch_id: batch, label: batch })} className="flex items-center gap-1 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-bold text-amber-800">
                  <ShieldOff size={13} /> {t("aml:rejectBatch")}
                </button>
              </>
            )}
            <button type="button" onClick={() => setBatch("")} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
              <X size={13} /> {t("aml:clearBatch")}
            </button>
          </span>
        </div>
      )}

      <ListPanel
        tabs={view === "entries" ? STATUS_TABS : []}
        value={filters.status}
        onChange={setFilter("status")}
        serverFiltered
        total={list.total}
        rows={list.rows}
        {...list.searchBind}
        searchPlaceholder={t("aml:searchBlacklist")}
        actions={
          view === "entries" && can("Add") ? (
            <span className="flex gap-2">
              <button type="button" onClick={() => setImporting(true)} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold text-primary">
                <FileUp size={14} /> {t("aml:importBlacklist")}
              </button>
              <button type="button" onClick={() => setForm({ editing: null })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                <Plus size={14} /> {t("aml:addBlacklistEntry")}
              </button>
            </span>
          ) : null
        }
        filters={
          view === "entries" && (
            <>
              <FilterSelect size="sm" className="w-44" value={filters.reason} onChange={setFilter("reason")} options={[{ value: "", label: t("aml:allReasons") }, ...REASONS.map((r) => ({ value: r, label: t(`aml:blReason_${r}`) }))]} />
              <FilterSelect size="sm" className="w-40" value={filters.entity_type} onChange={setFilter("entity_type")} options={[{ value: "", label: t("aml:allTypes") }, ...ENTITY_TYPES.map((v) => ({ value: v, label: t(`aml:entity_${v}`) }))]} />
            </>
          )
        }
      >
        <DataTable
          columns={view === "entries" ? entryColumns : pendingColumns}
          rows={list.rows}
          rowKey={(row) => row.id}
          isLoading={list.loading}
          title={t("aml:blacklistTitle")}
          emptyTitle={view === "entries" ? t("aml:noBlacklistEntries") : t("aml:nothingWaiting")}
          serverPagination={list.serverPagination}
          serverSorted
          bare
        />
      </ListPanel>

      {action && (
        <NarrationDialog
          title={actionTitle}
          hint={action.batch_id ? t("aml:batchDecisionHint") : action.label}
          confirmLabel={action.type === "auth" ? t("common:authorize") : action.type === "remove" ? t("aml:remove") : t("aml:reject")}
          variant={action.type === "auth" ? "primary" : "danger"}
          required={action.type !== "auth"}
          label={action.type === "remove" ? t("aml:commentRequiredLabel") : undefined}
          busy={working}
          onClose={() => setAction(null)}
          onSave={(note) => void decide(note)}
        />
      )}
      {form && (
        <BlacklistForm
          editing={form.editing}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null);
            reloadAll();
          }}
        />
      )}
      {importing && (
        <BlacklistImport
          onClose={() => setImporting(false)}
          onImported={(batchId, applied) => {
            setImporting(false);
            reloadAll();
            if (batchId) {
              setBatch(batchId);
              setView(applied ? "entries" : "pending");
            }
          }}
        />
      )}
      {detailId && <BlacklistDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  );
}
