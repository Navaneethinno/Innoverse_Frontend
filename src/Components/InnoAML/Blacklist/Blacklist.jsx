import { useState } from "react";
import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useTranslation } from "react-i18next";
import { FileUp, Plus } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
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
import { BatchBar, BatchChip } from "../Shared/BatchBar";
import { BlacklistDetail } from "./BlacklistDetail";
import { BlacklistForm } from "./BlacklistForm";
import { BlacklistImport } from "./BlacklistImport";
import { CountryList, EntryStatus } from "./blacklistShared";
import { actorText } from "@/Utils/Lib/actor";

// "" = the server's default: ACTIVE and PENDING.

// InnoAML > Settings > Blacklist (menu 182): the institution's own list of
// people and companies it won't deal with, screened with every name next to
// the watchlists. Every add, edit and removal waits for a checker; a bulk
// import waits as one batch.
export function Blacklist() {
  const { t } = useTranslation(["aml", "common"]);
  const can = usePagePermission();
  const [view, setView] = useState("entries");
  const [batch, setBatch] = useState("");
  const [form, setForm] = useState(null); // { editing }
  const [importing, setImporting] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [action, setAction] = useState(null); // { type: auth | deauth | remove, id?, batch_id?, label }
  const [working, setWorking] = useState(false);

  const entries = useServerList({ api: amlBlacklistApi.listPath, call: amlBlacklistApi.list, extra: batch ? { batch_id: batch } : null });
  const pending = usePagedList(amlBlacklistApi.pending, { batch_id: batch }, view === "pending");
  const reloadAll = () => {
    entries.reload();
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
  const batchChip = (id) => <BatchChip batchId={id} onPick={setBatch} />;

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
    { key: "proposed_by", label: t("aml:maker"), render: (row) => actorText(row, "proposed_by", "-") },
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

      <BatchBar batchId={batch} canDecide={can("Authorize")} onDecide={(type) => setAction({ type, batch_id: batch, label: batch })} onClear={() => setBatch("")} />

      {view === "entries" ? (
        <ListTable list={entries} actions={
          can("Add") && (
            <span className="flex gap-2">
              <button type="button" onClick={() => setImporting(true)} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border px-3 py-1.5 text-xs font-bold text-primary">
                <FileUp size={14} /> {t("aml:importBlacklist")}
              </button>
              <button type="button" onClick={() => setForm({ editing: null })} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                <Plus size={14} /> {t("aml:addBlacklistEntry")}
              </button>
            </span>
          )
        }
        columns={entryColumns} rowKey={(row) => row.id} title={t("aml:blacklistTitle")} emptyTitle={t("aml:noBlacklistEntries")} />
      ) : (
        <ListPanel tabs={[]} {...pending.searchBind} searchPlaceholder={t("aml:searchBlacklist")}>
          <DataTable columns={pendingColumns} rows={pending.rows} rowKey={(row) => row.id} isLoading={pending.loading} title={t("aml:blacklistTitle")} emptyTitle={t("aml:nothingWaiting")} serverPagination={pending.serverPagination} serverSorted bare />
        </ListPanel>
      )}

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
