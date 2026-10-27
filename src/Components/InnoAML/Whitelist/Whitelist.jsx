import { useState } from "react";
import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { useTranslation } from "react-i18next";
import { Ban, FileUp, History, Plus, RefreshCw } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { DataTable } from "@/Components/Common/DataTable";
import { DateInput } from "@/Components/Common/DateInput";
import { ListPanel } from "@/Components/Common/ListPanel";
import { Modal } from "@/Components/Common/Modal";
import { PageTitle } from "@/Components/Common/PageTitle";
import { RowActions } from "@/Components/Common/RowActions";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { NarrationDialog } from "@/Components/Finance/Deposits/depositShared";
import { InstitutionField, inputClass, labelClass } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { amlWhitelistApi } from "@/Services/InnoAML/aml.api";
import { formatDay } from "@/Utils/Lib/dateFormat";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { AlsoOnChips, NameText, ReviewStateBadge, ViaTag, WeightNote, matchScore, scoreTone, useInstitutionScope, when } from "../Shared/amlShared";
import { ReviewHistory, ScreeningDetailModal } from "../Shared/ScreeningDetail";
import { usePagedList } from "../Shared/usePagedList";
import { BatchBar, BatchChip } from "../Shared/BatchBar";
import { WhitelistImport } from "./WhitelistImport";
import { actorText } from "@/Utils/Lib/actor";
const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const daysLeft = (date) => Math.ceil((new Date(`${date}T00:00:00`) - new Date(new Date().toDateString())) / 864e5);

// Renew: the same false positive again with a new expiry (and evidence;
// empty keeps the old), for a checker to approve.
function RenewDialog({ row, busy, onClose, onSave }) {
  const { t } = useTranslation(["aml", "common"]);
  const [form, setForm] = useState({ comment: "", evidence: "", expires_on: "" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("aml:renewEntry")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button loading={busy} disabled={!form.comment.trim() || !form.expires_on} onClick={() => onSave({ id: row.id, comment: form.comment.trim(), evidence: form.evidence.trim(), expires_on: form.expires_on })}>
            {t("aml:submitForApproval")}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          <span dir="auto">{row.party_name}</span> ↔ <span dir="auto">{row.listed_name ?? row.matched_name}</span>
        </p>
        <label className={labelClass}>
          {t("aml:newExpiry")} <span className="text-red-500">*</span>
          <DateInput className={inputClass} value={form.expires_on} min={tomorrow()} onChange={set("expires_on")} />
        </label>
        <label className={labelClass}>
          {t("aml:evidence")}
          <textarea value={form.evidence} maxLength={2000} onChange={set("evidence")} className={`${inputClass} min-h-16`} placeholder={row.evidence ? t("aml:keepEvidence", { evidence: row.evidence }) : ""} />
        </label>
        <label className={labelClass}>
          {t("aml:commentRequiredLabel")} <span className="text-red-500">*</span>
          <textarea value={form.comment} maxLength={2000} onChange={set("comment")} className={`${inputClass} min-h-16`} />
        </label>
      </div>
    </Modal>
  );
}

// One entry by hand, the same fields as an upload row: the server finds the
// match in the customer's latest screening and proposes it as a false
// positive (Self applies it at once).
function AddEntryDialog({ busy, onClose, onSave }) {
  const { t } = useTranslation(["aml", "common"]);
  const canChoose = useCanChooseInstitution();
  const scope = useInstitutionScope();
  const [form, setForm] = useState({ inst_profile_id: "", customer: "", record: "", evidence: "", expires_on: "", comment: "" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const record = form.record.trim();
  const valid = form.customer.trim() && record && form.comment.trim() && (!canChoose || form.inst_profile_id);
  const save = () =>
    onSave({
      ...scope(form.inst_profile_id),
      customer: form.customer.trim(),
      // An entity id is "LIST:id" (e.g. OS_DEBARMENT:br-ceis-...); anything else is the listed name.
      ...(/^[A-Z0-9_]+:\S+$/.test(record) ? { entity_id: record } : { listed_name: record }),
      ...(form.evidence.trim() ? { evidence: form.evidence.trim() } : {}),
      ...(form.expires_on ? { expires_on: form.expires_on } : {}),
      comment: form.comment.trim(),
    });
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={t("aml:wlAddTitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button type="submit" form="wl-add-form" loading={busy} disabled={!valid}>
            {t("aml:submitForApproval")}
          </Button>
        </>
      }
    >
      <form
        id="wl-add-form"
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) save();
        }}
      >
        <InstitutionField value={form.inst_profile_id} onChange={(v) => setForm((f) => ({ ...f, inst_profile_id: v }))} />
        <label className={labelClass}>
          {t("aml:wlCustomer")} <span className="text-red-500">*</span>
          <input className={inputClass} value={form.customer} maxLength={200} onChange={set("customer")} placeholder={t("aml:wlCustomerHint")} />
        </label>
        <label className={labelClass}>
          {t("aml:wlRecord")} <span className="text-red-500">*</span>
          <input className={inputClass} value={form.record} maxLength={300} onChange={set("record")} placeholder={t("aml:wlRecordHint")} />
        </label>
        <label className={labelClass}>
          {t("aml:evidence")}
          <textarea value={form.evidence} maxLength={2000} onChange={set("evidence")} className={`${inputClass} min-h-16`} />
        </label>
        <label className={labelClass}>
          {t("aml:validUntil")}
          <DateInput className={inputClass} value={form.expires_on} min={tomorrow()} onChange={set("expires_on")} placeholder={t("aml:expiryDefault")} />
        </label>
        <label className={labelClass}>
          {t("aml:commentRequiredLabel")} <span className="text-red-500">*</span>
          <textarea value={form.comment} maxLength={2000} onChange={set("comment")} className={`${inputClass} min-h-16`} />
        </label>
      </form>
    </Modal>
  );
}

// InnoAML > Settings > Whitelist (menu 183): the approved false positives (one party
// cleared against one listed record). Each expires, keeps its evidence and
// can be renewed or revoked, both waiting for a checker.
export function Whitelist() {
  const { t } = useTranslation(["aml", "common"]);
  const can = usePagePermission();
  const [view, setView] = useState("entries");
  const [screening, setScreening] = useState(null); // { id, lookup }
  const [historyFor, setHistoryFor] = useState(null);
  const [renewing, setRenewing] = useState(null);
  const [action, setAction] = useState(null); // { type: auth | deauth | revoke, row } or { type, batch_id }
  const [batch, setBatch] = useState("");
  const [importing, setImporting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [working, setWorking] = useState(false);

  const entries = useServerList({ api: amlWhitelistApi.listPath, call: amlWhitelistApi.list });
  const pending = usePagedList(amlWhitelistApi.pending, { batch_id: batch }, view === "pending");
  const reloadAll = () => {
    entries.reload();
    void pending.reload();
  };
  // Another user's change (and, for the whitelist, Match Review decisions).
  useLiveChannel(amlWhitelistApi.listPath, reloadAll);

  const run = async (call, body, fallback) => {
    setWorking(true);
    try {
      const response = await call(body);
      notifications.success(apiMessage(response, fallback));
      setAction(null);
      setRenewing(null);
      setAdding(false);
      reloadAll();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setWorking(false);
    }
  };
  const decide = (note) => {
    const { type, row } = action;
    if (type === "revoke") return run(amlWhitelistApi.revoke, { id: row.id, comment: note }, t("aml:whitelistChangeSubmitted"));
    // A whole import at once, or one row.
    const target = action.batch_id ? { batch_id: action.batch_id } : { id: row.id };
    if (action.batch_id) setBatch("");
    return run(amlWhitelistApi[type], { ...target, ...(note ? { narration: note } : {}) }, t(type === "auth" ? "aml:changeApproved" : "aml:changeRejected"));
  };

  // A Name Lookup's subject key starts "L:"; customers' are screenings.
  const openScreening = (row) => setScreening({ id: row.screening_id, lookup: String(row.subject_key ?? "").startsWith("L:") || row.customer_kind === "NONE" });

  const partyCell = (row) => (
    <span className="grid gap-0.5">
      <NameText name={row.party_name} latin={row.party_name_latin} className="font-semibold" />
      <span className="text-[11px] text-muted-foreground">{[row.party_role, row.reference_id, row.customer_kind !== "NONE" && row.customer_kind].filter(Boolean).join(" · ") || t("aml:nameLookup")}</span>
    </span>
  );
  const listedCell = (row) => (
    <span className="grid gap-0.5">
      <NameText name={row.listed_name ?? row.matched_name} latin={row.listed_name ? row.listed_name_latin : row.matched_name_latin} />
      <span className="flex flex-wrap items-center gap-1 text-[11px] text-muted-foreground">
        <span className="font-mono font-bold">{row.list}</span>
        <ViaTag via={row.matched_via} />
      </span>
      <AlsoOnChips alsoOn={row.also_on} />
    </span>
  );
  const scoreCell = (row) => (
    <span className="grid">
      <span className={`font-black tabular-nums ${scoreTone(matchScore(row))}`}>{matchScore(row)}</span>
      <WeightNote match={row} />
    </span>
  );
  const expiryCell = (row) => {
    if (!row.expires_on) return "-";
    const left = daysLeft(row.expires_on);
    const tone = left < 0 ? "text-destructive" : left <= 30 ? "text-amber-700" : "text-muted-foreground";
    return (
      <span className="grid whitespace-nowrap text-xs">
        <span className="font-semibold">{formatDay(row.expires_on)}</span>
        <span className={`text-[10px] font-semibold ${tone}`}>{left < 0 ? t("aml:expiredDaysAgo", { count: -left }) : t("aml:daysLeft", { count: left })}</span>
      </span>
    );
  };
  const commentCell = (row) => (
    <span className="grid max-w-64 gap-0.5 text-xs">
      <span className="line-clamp-2">{row.comment}</span>
      {row.evidence && (
        <span className="line-clamp-2 text-[11px] text-muted-foreground">
          {t("aml:evidence")}: {row.evidence}
        </span>
      )}
    </span>
  );

  const entryColumns = [
    { key: "party_name", label: t("aml:party"), align: "left", render: partyCell },
    { key: "listed_name", label: t("aml:listedName"), align: "left", render: listedCell },
    { key: "score", label: t("aml:score"), render: scoreCell },
    { key: "comment", label: t("aml:commentAndEvidence"), align: "left", render: commentCell },
    { key: "expires_on", label: t("aml:expires"), render: expiryCell },
    {
      key: "decided_by",
      label: t("aml:approvedBy"),
      render: (row) => (
        <span className="grid text-xs">
          {actorText(row, "decided_by", "-")}
          <span className="text-[10px] text-muted-foreground">{when(row.decided_at)}</span>
        </span>
      ),
    },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => (
        <span className="flex items-center justify-center gap-1">
          <RowActions buttons={{ view: true }} onView={() => openScreening(row)} />
          <ActionIconButton label={t("aml:reviewHistory")} intent="audit" icon={History} onClick={() => setHistoryFor(row.match_id)} />
          {can("Edit") && <ActionIconButton label={t("aml:renew")} intent="edit" icon={RefreshCw} onClick={() => setRenewing(row)} />}
          {can("Change Status") && row.status !== "EXPIRED" && <ActionIconButton label={t("aml:revoke")} intent="deactivate" icon={Ban} onClick={() => setAction({ type: "revoke", row })} />}
        </span>
      ),
    },
  ];

  const pendingColumns = [
    { key: "proposed_at", label: t("aml:proposedAt"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.proposed_at)}</span> },
    { key: "party_name", label: t("aml:party"), align: "left", render: partyCell },
    { key: "listed_name", label: t("aml:listedName"), align: "left", render: listedCell },
    {
      key: "decision",
      label: t("aml:change"),
      render: (row) => (
        <span className="grid justify-items-center gap-0.5">
          <ReviewStateBadge state={row.decision} />
          <BatchChip batchId={row.batch_id} onPick={setBatch} />
          {row.expires_on && <span className="whitespace-nowrap text-[10px] text-muted-foreground">{t("aml:expiresOn", { date: formatDay(row.expires_on) })}</span>}
        </span>
      ),
    },
    { key: "comment", label: t("aml:commentAndEvidence"), align: "left", render: commentCell },
    { key: "proposed_by", label: t("aml:maker"), render: (row) => actorText(row, "proposed_by", "-") },
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => (
        <RowActions
          buttons={{ view: true, authorize: true, deauthorize: true }}
          onView={() => openScreening(row)}
          onAuthorize={() => setAction({ type: "auth", row })}
          onDeauthorize={() => setAction({ type: "deauth", row })}
        />
      ),
    },
  ];

  const titles = { auth: "aml:approveChange", deauth: "aml:rejectChange", revoke: "aml:revokeEntry" };
  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{t("aml:whitelistTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("aml:whitelistSubtitle")}</p>
      </div>
      <SegmentedSwitch
        className="mb-3"
        options={[
          { value: "entries", label: t("aml:whitelistEntries") },
          { value: "pending", label: t("aml:waitingForApproval") },
        ]}
        value={view}
        onChange={setView}
      />
      {view === "pending" && <BatchBar batchId={batch} canDecide={can("Authorize")} onDecide={(type) => setAction({ type, batch_id: batch })} onClear={() => setBatch("")} />}
      {view === "entries" ? (
        <ListTable list={entries} actions={
          can("Add") && (
            <span className="flex gap-2">
              <button type="button" onClick={() => setAdding(true)} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-primary px-3 py-1.5 text-xs font-bold text-primary">
                <Plus size={14} /> {t("aml:wlAddTitle")}
              </button>
              <button type="button" onClick={() => setImporting(true)} className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-primary-foreground">
                <FileUp size={14} /> {t("aml:wlImportTitle")}
              </button>
            </span>
          )
        }
        columns={entryColumns} rowKey={(row) => row.id} title={t("aml:whitelistTitle")} emptyTitle={t("aml:noWhitelistEntries")} />
      ) : (
        <ListPanel tabs={[]} {...pending.searchBind} searchPlaceholder={t("aml:searchWhitelist")}>
          <DataTable columns={pendingColumns} rows={pending.rows} rowKey={(row) => row.id} isLoading={pending.loading} title={t("aml:whitelistTitle")} emptyTitle={t("aml:nothingWaiting")} serverPagination={pending.serverPagination} serverSorted bare />
        </ListPanel>
      )}

      {action && (
        <NarrationDialog
          title={action.batch_id ? t(action.type === "auth" ? "aml:approveBatch" : "aml:rejectBatch") : t(titles[action.type])}
          hint={action.batch_id ? t("aml:batchDecisionHint") : `${action.row.party_name} ↔ ${action.row.listed_name ?? action.row.matched_name}`}
          confirmLabel={action.type === "auth" ? t("common:authorize") : action.type === "revoke" ? t("aml:revoke") : t("aml:reject")}
          variant={action.type === "auth" ? "primary" : "danger"}
          required={action.type !== "auth"}
          label={action.type === "revoke" ? t("aml:commentRequiredLabel") : undefined}
          busy={working}
          onClose={() => setAction(null)}
          onSave={(note) => void decide(note)}
        >
          {action.type === "revoke" && <p className="mb-3 text-xs text-muted-foreground">{t("aml:revokeHint")}</p>}
        </NarrationDialog>
      )}
      {importing && (
        <WhitelistImport
          onClose={() => setImporting(false)}
          onImported={(batchId, applied) => {
            setImporting(false);
            reloadAll();
            if (batchId && !applied) {
              setBatch(batchId);
              setView("pending");
            }
          }}
        />
      )}
      {adding && <AddEntryDialog busy={working} onClose={() => setAdding(false)} onSave={(body) => void run(amlWhitelistApi.add, body, t("aml:whitelistChangeSubmitted"))} />}
      {renewing && <RenewDialog row={renewing} busy={working} onClose={() => setRenewing(null)} onSave={(body) => void run(amlWhitelistApi.renew, body, t("aml:whitelistChangeSubmitted"))} />}
      {historyFor && <ReviewHistory matchId={historyFor} load={amlWhitelistApi.history} onClose={() => setHistoryFor(null)} />}
      {screening && <ScreeningDetailModal id={screening.id} lookup={screening.lookup} onClose={() => setScreening(null)} onChanged={reloadAll} />}
    </div>
  );
}
