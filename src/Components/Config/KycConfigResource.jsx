import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { useSelector } from "react-redux";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { describeConfirmAction } from "@/Components/MakerChecker/confirmActionText";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { configKycApi } from "@/Services/Config/config.api";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { reconcileSetter } from "@/Utils/Lib/liveReconcile";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { useKycDataFields, useKycDocumentTypes, useKycProcesses } from "@/Hooks/Master/masterHooks";
import { matchesAction } from "@/Utils/Lib/actionAliases";
import { blockNegativeKeyDown, blurOnWheel, clampNonNegative } from "@/Utils/Lib/numberInput";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

const CONFIGS = {
  kyc_group: {
    title: "KYC Group",
    menuName: "Group",
    fields: [
      ["code", "Code", "text"],
      ["name", "Name", "text"],
      ["description", "Description", "textarea"],
      ["maximum_level", "Maximum level", "number"],
      ["inst_profile_id", "Institution profile", "number"],
    ],
  },
  kyc_group_level: {
    title: "Group Level",
    menuName: "Group Level",
    readOnlyOnEdit: ["kyc_group_id"],
    fields: [
      ["kyc_group_id", "KYC Group", "number"],
      ["level_no", "Level number", "number"],
      ["level_name", "Level name", "text"],
      ["description", "Description", "textarea"],
    ],
  },
  kyc_group_level_data: {
    title: "Group Level Data",
    menuName: "Group Level Data",
    readOnlyOnEdit: ["kyc_group_level_id"],
    fields: [
      ["kyc_group_level_id", "Group Level", "number"],
      ["kyc_data_field_id", "Data Field", "number"],
      ["mandatory", "Mandatory", "boolean"],
      ["sequence_no", "Sequence", "number"],
    ],
  },
  kyc_group_level_process: {
    title: "Group Level Process",
    menuName: "Group Level Process",
    readOnlyOnEdit: ["kyc_group_level_id"],
    fields: [
      ["kyc_group_level_id", "Group Level", "number"],
      ["kyc_process_id", "Process", "number"],
      ["mandatory", "Mandatory", "boolean"],
      ["sequence_no", "Sequence", "number"],
    ],
  },
  kyc_group_level_document: {
    title: "Group Level Document",
    menuName: "Group Level Document",
    readOnlyOnEdit: ["kyc_group_level_id"],
    fields: [
      ["kyc_group_level_id", "Group Level", "number"],
      ["kyc_document_type_id", "Document Type", "number"],
      ["mandatory", "Mandatory", "boolean"],
      ["sequence_no", "Sequence", "number"],
      ["document_front_required", "Front required", "boolean"],
      ["document_back_required", "Back required", "boolean"],
      ["verification_required", "Verification required", "boolean"],
    ],
  },
};
const idOf = (row) => row?.id;
const rowsOf = (response) =>
  Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []);
const allowed = (menus, action, menuName) =>
  (menus ?? []).some(
    (m) =>
      new RegExp(`^${menuName}$`, "i").test(String(m?.menu_name).trim()) &&
      (m.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action)),
  );
const api = (entity) => configKycApi(entity);

export function KycConfigResource({ entity }) {
  const config = CONFIGS[entity];
  const tr = useConfigLabel();
  const menus = useSelector((state) => state.menu.menuArray);
  const service = useMemo(() => api(entity), [entity]);
  const { data: institutions = [] } = useActiveInstitutionsQuery();
  const { dataFields = [] } = useKycDataFields(entity === "kyc_group_level_data");
  const { processes = [] } = useKycProcesses(entity === "kyc_group_level_process");
  const { documentTypes = [] } = useKycDocumentTypes(entity === "kyc_group_level_document");
  const [kycGroups, setKycGroups] = useState([]);
  const [kycGroupLevels, setKycGroupLevels] = useState([]);
  useEffect(() => {
    if (entity === "kyc_group_level") {
      configKycApi("kyc_group")
        .getActive()
        .then((response) => setKycGroups(rowsOf(response)))
        .catch((error) => notifications.error(error.message));
    }
    if (entity === "kyc_group_level_data" || entity === "kyc_group_level_process" || entity === "kyc_group_level_document") {
      configKycApi("kyc_group_level")
        .getActive()
        .then((response) => setKycGroupLevels(rowsOf(response)))
        .catch((error) => notifications.error(error.message));
    }
  }, [entity]);
  const [rows, setRows] = useState([]),
    [pagination, setPagination] = useState({}),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(10),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("all"),
    [form, setForm] = useState({}),
    [editing, setEditing] = useState(null),
    [view, setView] = useState(null),
    [audit, setAudit] = useState(null),
    [action, setAction] = useState(null),
    [saving, setSaving] = useState(false);
  // Shows the maker's proposed changes inside the Authorize/Reject confirm
  // dialog, same pattern as InstitutionBrandingPage.jsx — fetched only
  // while that dialog is actually open, via the entity's own /pending
  // endpoint (payload {id}).
  const pendingInfo = usePendingChanges(
    service.pending,
    action ? idOf(action.row) : null,
    Boolean(action) && ["auth", "deauth", "deleteAuth"].includes(action?.type),
  );
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await service.list({ page, limit });
      setRows(rowsOf(response));
      setPagination(response?.pagination ?? response?.data?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [service, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  // Reconcile in place instead of refetching (Live Updates guide §3) — see
  // AcctConfigResource.jsx's identical comment for why inserts are skipped
  // on this server-paginated list.
  useLiveChannel(
    API_ENDPOINTS.CONFIG_KYC[entity.toUpperCase()].LIST,
    reconcileSetter(setRows, { insertNew: false }),
  );
  // Resolves a lookup field (e.g. kyc_group_level_id, kyc_process_id) to a
  // readable name instead of the raw numeric id — both in the table columns
  // and the View modal, matching how AcctConfigResource/DigitalProductResource
  // already resolve their own lookup fields. Confirmed live: the backend
  // already returns a companion "<field-without-_id>_name" alongside every
  // one of these ids (e.g. kyc_process_id + kyc_process_name on the very
  // same row), so that's tried first — far more reliable than a separate
  // active-list lookup, which previously produced a broken "- 1" for
  // kyc_group_level_id whenever the fetched list didn't carry level_no.
  // Only institution profile has no such companion field on the row, so it
  // still falls back to the active institutions list fetched above.
  const resolveField = useCallback(
    (row, key) => {
      const raw = row?.[key];
      if (raw == null || raw === "") return "-";
      if (key.endsWith("_id")) {
        const companion = row[`${key.slice(0, -3)}_name`];
        if (companion != null && companion !== "") return companion;
      }
      if (key === "inst_profile_id") {
        return institutions.find((inst) => String(inst.id) === String(raw))?.name ?? String(raw);
      }
      if (key === "kyc_group_id") {
        return kycGroups.find((group) => String(idOf(group)) === String(raw))?.name ?? String(raw);
      }
      if (key === "kyc_group_level_id") {
        const level = kycGroupLevels.find((item) => String(idOf(item)) === String(raw));
        return level ? `${[level.level_no, level.level_name].filter(Boolean).join(" - ")}` || String(raw) : String(raw);
      }
      if (key === "kyc_process_id") {
        return processes.find((process) => String(idOf(process)) === String(raw))?.name ?? String(raw);
      }
      if (key === "kyc_data_field_id") {
        return dataFields.find((field) => String(idOf(field)) === String(raw))?.name ?? String(raw);
      }
      if (key === "kyc_document_type_id") {
        return documentTypes.find((docType) => String(idOf(docType)) === String(raw))?.name ?? String(raw);
      }
      return String(raw);
    },
    [institutions, kycGroups, kycGroupLevels, processes, dataFields, documentTypes],
  );
  // Human-readable identity for a row in confirm dialogs — same idea as
  // Institution's own confirm dialogs, which show the institution's name
  // instead of its raw id. Uses the entity's own first configured field
  // (resolved via resolveField, so a lookup id still shows its name) since
  // every KYC entity's first field is its most identifying one (code/name
  // for kyc_group, the parent group/level's name for every child entity).
  const describeActionRow = (row) => {
    if (!row) return "";
    const [firstKey, , firstType] = config.fields[0];
    const resolved = firstType === "boolean" ? (row[firstKey] ? tr("Yes") : tr("No")) : resolveField(row, firstKey);
    return resolved && resolved !== "-" ? resolved : String(idOf(row));
  };
  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (tab === "all" || statusBucket(row) === tab) &&
          JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, tab, search],
  );
  const save = async (draft) => {
    // Same fix as DigitalProductResource.jsx: "_id" fields rendered via
    // FilterSelect (inst_profile_id, kyc_document_type_id, kyc_process_id,
    // kyc_data_field_id, kyc_group_level_id, kyc_group_id) have no native
    // form control, so nothing stops a submit while one is still empty
    // (""). The backend then rejects the malformed number field with a
    // misleading "request body is not valid JSON" 400 instead of a clear
    // validation message — caught here before it reaches the API.
    const missingField = config.fields.find(
      ([key]) => key.endsWith("_id") && (form[key] === "" || form[key] == null),
    );
    if (missingField) {
      const label = tr(missingField[1]).toLowerCase();
      notifications.error(`Please select ${/^[aeiou]/.test(label) ? "an" : "a"} ${label}`);
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...Object.fromEntries(
          config.fields
            .filter(([key]) => !editing || !config.readOnlyOnEdit?.includes(key))
            .map(([key]) => [key, form[key]]),
        ),
        is_draft: draft,
        ...(editing ? { id: idOf(editing), expected_updated_time: editing.updated_time } : {}),
      };
      const response = await (editing ? service.edit(payload) : service.add(payload));
      notifications.success(apiMessage(response, `${tr(config.title)} saved`));
      setEditing(null);
      setForm({});
      void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };
  const run = async () => {
    try {
      const { row, type } = action;
      // Every action in this lifecycle takes {id, narration} per the API
      // reference — narration was previously only sent for deauth,
      // silently dropping it everywhere else.
      const narration = action.reason || "";
      const payload = { id: idOf(row), narration };
      const response =
        type === "submit"
          ? await service.submit(payload)
          : type === "auth"
            ? await service.auth(payload)
            : type === "deleteAuth"
              ? await service.deleteAuth(payload)
              : type === "deauth"
                ? await service.deauth(payload)
                : type === "deactivate"
                  ? await service.deactivate(payload)
                  : type === "reactivate"
                    ? await service.reactivate(payload)
                    : await service.delete(payload);
      notifications.success(apiMessage(response, `${tr(config.title)} action completed`));
      setAction(null);
      void load();
    } catch (error) {
      notifications.error(error.message);
    }
  };
  const columns = [
    ...config.fields
      .slice(0, 4)
      .map(([key, label, type]) => ({
        key,
        label: tr(label),
        render: (row) => (type === "boolean" ? (row[key] ? tr("Yes") : tr("No")) : resolveField(row, key)),
      })),
    {
      key: "status",
      label: tr("Status"),
      render: (row) => (
        <StatusBadge status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : row.status === 0 ? "INACTIVE" : "-"))} variant="solid" />
      ),
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      render: (row) => (
        <StatusBadge status={String(row.process_status_name ?? "-")} />
      ),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      render: (row) => <StatusBadge status={String(row.auth_status ?? "-")} />,
    },
    {
      key: "actions",
      label: tr("Actions"),
      render: (row) => {
        const buttons = getMakerCheckerButtons(row, {
          canAdd: allowed(menus, "Add", config.menuName),
          canEdit: allowed(menus, "Edit", config.menuName),
          canAuthorize: allowed(menus, "Authorize", config.menuName),
          canDelete: allowed(menus, "Delete", config.menuName),
          canChangeStatus: allowed(menus, "Deactivate", config.menuName) || allowed(menus, "Reactivate", config.menuName),
        });
        const pendingType = buttons.isPendingDelete ? "deleteAuth" : "auth";
        return (
          <RowActions
            buttons={buttons}
            onView={() => setView(row)}
            onEdit={() => {
              setEditing(row);
              setForm({ ...row });
            }}
            onAudit={() => setAudit(row)}
            onSubmit={() => setAction({ row, type: "submit", label: "Submit" })}
            onAuthorize={() => setAction({ row, type: pendingType, label: "Authorize" })}
            onDeauthorize={() => setAction({ row, type: "deauth", label: "Reject", reason: "" })}
            onDeactivate={() => setAction({ row, type: "deactivate", label: "Deactivate" })}
            onReactivate={() => setAction({ row, type: "reactivate", label: "Reactivate" })}
            onDelete={() => setAction({ row, type: "delete", label: "Delete" })}
          />
        );
      },
    },
  ];
  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">{tr(config.title)}</h1>
      </div>
      <div className="mb-4 overflow-hidden rounded-2xl" style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}><StatusFilterTabs
        actions={allowed(menus, "Add", config.menuName) && (
          <button
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
            onClick={() => {
              setForm(
                Object.fromEntries(
                  config.fields.map(([key, , type]) => [key, type === "boolean" ? false : ""]),
                ),
              );
              setEditing(null);
            }}
          >
            <Plus size={14} /> {tr("Add")} {tr(config.title)}
          </button>
        )}
        rows={rows}
        value={tab}
        onChange={setTab}
        search={search}
        onSearch={setSearch}
        searchPlaceholder={`${tr("Search")} ${tr(config.title).toLowerCase()}...`}
      bare /><DataTable
        columns={columns}
        rows={visible}
        rowKey={idOf}
        isLoading={loading}
        title={tr(config.title)}
        serverPagination={{
          page,
          limit,
          totalPages: pagination.totalPages ?? 1,
          totalRecords: pagination.totalRecords ?? rows.length,
          onPageChange: setPage,
          onLimitChange: (next) => {
            setLimit(next);
            setPage(1);
          },
        }}
      bare /></div>{(editing || form) && (
        <Modal
          open={Boolean(editing || Object.keys(form).length)}
          title={`${editing ? tr("Edit") : tr("Add")} ${tr(config.title)}`}
          onClose={() => {
            setEditing(null);
            setForm({});
          }}
        >
          <div className="grid gap-3">
            {config.fields.map(([key, label, type]) => (
              <label
                key={key}
                className={
                  type === "boolean"
                    ? "flex items-center gap-2 text-sm font-semibold"
                    : "text-sm font-semibold"
                }
              >
                {type === "boolean" ? <span>{tr(label)}</span> : tr(label)}
                {key === "inst_profile_id" ? (
                  <FilterSelect
                    className="mt-1.5"
                    value={form[key] ?? ""}
                    onChange={(value) => setForm({ ...form, [key]: value })}
                    options={[
                      { value: "", label: tr("Select institution") },
                      ...institutions.map((inst) => ({
                        value: inst.id,
                        label: inst.name ?? String(inst.id),
                      })),
                    ]}
                  />
                ) : key === "kyc_document_type_id" ? (
                  <FilterSelect
                    className="mt-1.5"
                    value={form[key] ?? ""}
                    onChange={(value) => setForm({ ...form, [key]: value })}
                    options={[
                      { value: "", label: tr("Select document type") },
                      ...documentTypes.map((documentType) => ({
                        value: idOf(documentType),
                        label: documentType.name ?? documentType.code ?? String(idOf(documentType)),
                      })),
                    ]}
                  />
                ) : key === "kyc_process_id" ? (
                  <FilterSelect
                    className="mt-1.5"
                    value={form[key] ?? ""}
                    onChange={(value) => setForm({ ...form, [key]: value })}
                    options={[
                      { value: "", label: tr("Select process") },
                      ...processes.map((process) => ({
                        value: idOf(process),
                        label: process.name ?? process.code ?? String(idOf(process)),
                      })),
                    ]}
                  />
                ) : key === "kyc_data_field_id" ? (
                  <FilterSelect
                    className="mt-1.5"
                    value={form[key] ?? ""}
                    onChange={(value) => setForm({ ...form, [key]: value })}
                    disabled={Boolean(editing && config.readOnlyOnEdit?.includes(key))}
                    options={[
                      { value: "", label: tr("Select data field") },
                      ...dataFields.map((field) => ({
                        value: idOf(field),
                        label: field.name ?? field.code ?? String(idOf(field)),
                      })),
                    ]}
                  />
                ) : key === "kyc_group_level_id" ? (
                  <FilterSelect
                    className="mt-1.5"
                    value={form[key] ?? ""}
                    onChange={(value) => setForm({ ...form, [key]: value })}
                    disabled={Boolean(editing && config.readOnlyOnEdit?.includes(key))}
                    options={[
                      { value: "", label: tr("Select group level") },
                      ...kycGroupLevels.map((level) => ({
                        value: idOf(level),
                        label: level.level_name
                          ? `${level.level_no ?? ""} - ${level.level_name}`
                          : String(idOf(level)),
                      })),
                    ]}
                  />
                ) : key === "kyc_group_id" ? (
                  <FilterSelect
                    className="mt-1.5"
                    value={form[key] ?? ""}
                    onChange={(value) => setForm({ ...form, [key]: value })}
                    disabled={Boolean(editing && config.readOnlyOnEdit?.includes(key))}
                    options={[
                      { value: "", label: tr("Select KYC group") },
                      ...kycGroups.map((group) => ({
                        value: idOf(group),
                        label: group.name ?? String(idOf(group)),
                      })),
                    ]}
                  />
                ) : (
                  <input
                    type={type === "number" ? "number" : type === "boolean" ? "checkbox" : "text"}
                    min={type === "number" ? 0 : undefined}
                    checked={type === "boolean" ? Boolean(form[key]) : undefined}
                    value={type !== "boolean" ? (form[key] ?? "") : undefined}
                    disabled={Boolean(editing && config.readOnlyOnEdit?.includes(key))}
                    onKeyDown={type === "number" ? blockNegativeKeyDown : undefined}
                    onWheel={type === "number" ? blurOnWheel : undefined}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        [key]:
                          type === "boolean"
                            ? event.target.checked
                            : type === "number"
                              ? clampNonNegative(event.target.value)
                              : event.target.value,
                      })
                    }
                    className={
                      type === "boolean"
                        ? "h-4 w-4 rounded border"
                        : "mt-1.5 w-full rounded-xl border px-3 py-2.5"
                    }
                  />
                )}
              </label>
            ))}
            <div className="flex justify-end gap-2">
              <button onClick={() => void save(true)} disabled={saving}>
                {tr("Save draft")}
              </button>
              <button
                onClick={() => void save(false)}
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 font-bold text-white"
              >
                {tr("Save")}
              </button>
            </div>
          </div>
        </Modal>
      )}
      {view && (
        <Modal open title={`${tr("View")} ${tr(config.title)}`} onClose={() => setView(null)} size="md">
          <dl className="grid gap-3">
            {config.fields.map(([key, label, type]) => (
              <div key={key} className="rounded-xl border p-3">
                <dt className="text-xs text-slate-400">{tr(label)}</dt>
                <dd className="text-sm font-semibold">
                  {type === "boolean" ? (view[key] ? tr("Yes") : tr("No")) : resolveField(view, key)}
                </dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {audit && (
        <AuditModal
          title={tr(config.title)}
          onClose={() => setAudit(null)}
          fields={config.fields.map(([key, label]) => [key, tr(label)])}
          fetchAudit={(p, value) =>
            service.audit({ id: idOf(audit), page: p, limit: value }).then(mapAuditResponse)
          }
        />
      )}
      {action && (
        <ConfirmDialog
          open
          title={`${tr(action.label)} ${tr(config.title)}`}
          description={describeConfirmAction(action.type, describeActionRow(action.row), tr)}
          confirmLabel={tr(action.label)}
          destructive={["deauth", "delete", "deleteAuth"].includes(action.type)}
          confirmDisabled={action.type === "deauth" && !action.reason?.trim()}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {["auth", "deauth", "deleteAuth"].includes(action.type) && <PendingChangesDiff {...pendingInfo} />}
          <textarea
            value={action.reason ?? ""}
            onChange={(event) => setAction({ ...action, reason: event.target.value })}
            placeholder={tr("Narration")}
            className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm"
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
