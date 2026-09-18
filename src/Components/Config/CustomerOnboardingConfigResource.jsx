import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { RowActions } from "@/Components/Common/RowActions";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { Spinner } from "@/Components/Common/Spinner";
import { describeConfirmAction } from "@/Components/MakerChecker/confirmActionText";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { matchesAction } from "@/Utils/Lib/actionAliases";
import { splitFieldsIntoColumns, orderedFields } from "@/Utils/Lib/formFieldColumns";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { useKycDocumentTypes } from "@/Hooks/Master/masterHooks";
import { configCustomerApi } from "@/Services/Config/config.api";
import { addressTypeApi, employmentApi, ownershipSubTypeApi, documentTypeApi } from "@/Services/MasterConfig/district.api";

// The 7 Individual Customer Onboarding Configuration entities (2026-09) —
// 6 institution-scoped config/customer/* entities (menu-wise, separated,
// no composite tree) plus the 1 global master_config/document_type they
// feed from. Fields-driven, same CONFIGS[entity] pattern as
// AcctConfigResource.jsx — [key, label, type, lookupKey?, staticOptions?].
// `type` "select" with no lookupKey renders staticOptions directly instead
// of a lookups-map-backed FilterSelect, for the two plain enum fields
// (document_category, requirement_type) that aren't a foreign key.
const DOCUMENT_CATEGORIES_CONFIG = ["TAX", "ADDRESS_PROOF", "FINANCIAL", "NOMINEE_DOCUMENT", "GUARDIAN_DOCUMENT", "VISA", "REFUGEE_CERTIFICATE", "SIGNATURE"];
const REQUIREMENT_TYPES = ["MANDATORY", "OPTIONAL", "CONDITIONAL"];
const DOCUMENT_CATEGORIES_MASTER = ["TAX", "ADDRESS", "FINANCIAL"];

const CONFIGS = {
  indv_type_config: {
    title: "Individual Type Config",
    menuName: "Individual Type Config",
    api: (entity) => configCustomerApi(entity),
    readOnlyOnEdit: ["inst_profile_id", "ownership_sub_type_id"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["ownership_sub_type_id", "Ownership sub type", "number", "ownershipSubTypes"],
      ["is_enabled", "Enabled", "boolean"],
    ],
  },
  indv_identification_type: {
    title: "Identification Type Config",
    menuName: "Identification Type Config",
    api: (entity) => configCustomerApi(entity),
    readOnlyOnEdit: ["inst_profile_id", "ownership_sub_type_id", "kyc_document_type_id"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["ownership_sub_type_id", "Ownership sub type", "number", "ownershipSubTypes"],
      ["kyc_document_type_id", "Document type", "number", "kycDocumentTypes"],
      ["front_required", "Front required", "boolean"],
      ["back_required", "Back required", "boolean"],
      ["verification_required", "Verification required", "boolean"],
    ],
  },
  indv_address_type: {
    title: "Address Type Config",
    menuName: "Address Type Config",
    api: (entity) => configCustomerApi(entity),
    readOnlyOnEdit: ["inst_profile_id", "ownership_sub_type_id", "address_type_id"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["ownership_sub_type_id", "Ownership sub type", "number", "ownershipSubTypes"],
      ["address_type_id", "Address type", "number", "addressTypes"],
      ["mandatory", "Mandatory", "boolean"],
      ["allow_same_as", "Allow same as", "boolean"],
      ["same_as_address_type_id", "Same as address type", "number", "addressTypes"],
    ],
  },
  indv_employment_config: {
    title: "Employment Config",
    menuName: "Employment Config",
    api: (entity) => configCustomerApi(entity),
    readOnlyOnEdit: ["inst_profile_id", "employment_id"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["employment_id", "Employment", "number", "employments"],
      ["is_enabled", "Enabled", "boolean"],
      ["is_employer_details_required", "Employer details required", "boolean"],
    ],
  },
  indv_document_requirement_config: {
    title: "Document Requirement Config",
    menuName: "Document Requirement Config",
    api: (entity) => configCustomerApi(entity),
    readOnlyOnEdit: ["inst_profile_id", "document_category"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["document_category", "Document category", "select", null, DOCUMENT_CATEGORIES_CONFIG],
      ["requirement_type", "Requirement type", "select", null, REQUIREMENT_TYPES],
      ["condition_rule", "Condition rule", "text"],
    ],
  },
  indv_document_type_config: {
    title: "Document Type Config",
    menuName: "Document Type Config",
    api: (entity) => configCustomerApi(entity),
    readOnlyOnEdit: ["inst_profile_id", "document_type_id"],
    fields: [
      ["inst_profile_id", "Institution profile", "number", "institutions"],
      ["document_type_id", "Document type", "number", "documentTypes"],
      ["is_enabled", "Enabled", "boolean"],
    ],
  },
  document_type: {
    title: "Document Type (Master)",
    menuName: "Document Type",
    api: () => documentTypeApi,
    readOnlyOnEdit: ["category"],
    fields: [
      ["category", "Category", "select", null, DOCUMENT_CATEGORIES_MASTER],
      ["name", "Name", "text"],
      ["description", "Description", "textarea"],
    ],
  },
};

const idOf = (row) => row?.id;
const rowsOf = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []));
const allowed = (menus, action, menuName) =>
  (menus ?? []).some(
    (m) =>
      new RegExp(`^${menuName}$`, "i").test(String(m?.menu_name).trim()) &&
      (m.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action)),
  );
// Institution records use `institution_name`/`inst_name`, not a bare
// `name` — scanning for any *_name key (same fallback AcctConfigResource.jsx
// uses for its own lookups) instead of assuming a fixed field avoids
// silently showing raw ids in the Institution dropdown the way that file's
// own comments describe having happened before this pattern was adopted.
function firstMatchingKey(item, patterns) {
  const keys = Object.keys(item ?? {});
  for (const pattern of patterns) {
    const key = keys.find((k) => pattern.test(k));
    if (key && item[key] != null && item[key] !== "") return item[key];
  }
  return undefined;
}
const optionOf = (item) => ({
  value: idOf(item),
  label: firstMatchingKey(item, [/^name$/i, /_name$/i]) ?? String(idOf(item)),
});

export function CustomerOnboardingConfigResource({ entity }) {
  const config = CONFIGS[entity];
  const tr = useConfigLabel();
  const menus = useSelector((state) => state.menu.menuArray);
  const service = useMemo(() => config.api(entity), [config, entity]);

  const usesInstitutions = config.fields.some(([key]) => key === "inst_profile_id");
  const usesOwnershipSubTypes = config.fields.some(([, , , lookupKey]) => lookupKey === "ownershipSubTypes");
  const usesAddressTypes = config.fields.some(([, , , lookupKey]) => lookupKey === "addressTypes");
  const usesEmployments = config.fields.some(([, , , lookupKey]) => lookupKey === "employments");
  const usesKycDocumentTypes = config.fields.some(([, , , lookupKey]) => lookupKey === "kycDocumentTypes");
  const usesDocumentTypes = config.fields.some(([, , , lookupKey]) => lookupKey === "documentTypes");

  const { data: institutions = [] } = useActiveInstitutionsQuery(usesInstitutions);
  const { documentTypes: kycDocumentTypes = [] } = useKycDocumentTypes(usesKycDocumentTypes);
  const [ownershipSubTypes, setOwnershipSubTypes] = useState([]);
  const [addressTypes, setAddressTypes] = useState([]);
  const [employments, setEmployments] = useState([]);
  const [documentTypes, setDocumentTypes] = useState([]);
  useEffect(() => {
    if (usesOwnershipSubTypes) ownershipSubTypeApi.getActive().then((r) => setOwnershipSubTypes(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [usesOwnershipSubTypes]);
  useEffect(() => {
    if (usesAddressTypes) addressTypeApi.getActive().then((r) => setAddressTypes(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [usesAddressTypes]);
  useEffect(() => {
    if (usesEmployments) employmentApi.getActive().then((r) => setEmployments(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [usesEmployments]);
  useEffect(() => {
    if (usesDocumentTypes) documentTypeApi.getActive().then((r) => setDocumentTypes(rowsOf(r))).catch((e) => notifications.error(e.message));
  }, [usesDocumentTypes]);

  const lookups = useMemo(
    () => ({
      institutions: { items: institutions },
      ownershipSubTypes: { items: ownershipSubTypes },
      addressTypes: { items: addressTypes },
      employments: { items: employments },
      kycDocumentTypes: { items: kycDocumentTypes },
      documentTypes: { items: documentTypes },
    }),
    [institutions, ownershipSubTypes, addressTypes, employments, kycDocumentTypes, documentTypes],
  );
  const optionsFor = (lookupKey) => (lookups[lookupKey]?.items ?? []).map(optionOf);
  const labelFor = (lookupKey, value) => {
    const match = (lookups[lookupKey]?.items ?? []).find((item) => String(idOf(item)) === String(value));
    return match ? optionOf(match).label : String(value ?? "-");
  };

  const describeActionRow = (row) => (row ? `${config.title} #${idOf(row)}` : "");

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
    [saving, setSaving] = useState(false),
    [actionPending, setActionPending] = useState(false);

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
    const missingField = config.fields.find(
      ([key, , type, lookupKey]) => key !== "condition_rule" && key !== "same_as_address_type_id" && (lookupKey || type === "select") && (form[key] === "" || form[key] == null),
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
            .map(([key, , type, lookupKey]) => [key, !lookupKey && type === "number" && (form[key] === "" || form[key] == null) ? 0 : form[key]]),
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
    setActionPending(true);
    try {
      const { row, type } = action;
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
    } finally {
      setActionPending(false);
    }
  };

  const renderValue = (key, type, lookupKey, row) =>
    lookupKey ? labelFor(lookupKey, row[key]) : type === "boolean" ? (row[key] ? tr("Yes") : tr("No")) : String(row[key] ?? "-");

  const columns = [
    ...config.fields.slice(0, 4).map(([key, label, type, lookupKey]) => ({
      key,
      label: tr(label),
      render: (row) => renderValue(key, type, lookupKey, row),
    })),
    {
      key: "status",
      label: tr("Status"),
      render: (row) => <StatusBadge status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : row.status === 0 ? "INACTIVE" : "-"))} variant="solid" />,
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      render: (row) => <StatusBadge status={String(row.process_status_name ?? "-")} />,
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      render: (row) => <StatusBadge status={String(row.auth_status ?? "-")} />,
    },
    {
      key: "actions",
      label: tr("Actions"),
      sortable: false,
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
            onSubmit={() => setAction({ row, type: "submit", label: "Submit", reason: "" })}
            onAuthorize={() => setAction({ row, type: pendingType, label: "Authorize", reason: "" })}
            onDeauthorize={() => setAction({ row, type: "deauth", label: "Deauthorize", reason: "" })}
            onDeactivate={() => setAction({ row, type: "deactivate", label: "Deactivate", reason: "" })}
            onReactivate={() => setAction({ row, type: "reactivate", label: "Reactivate", reason: "" })}
            onDelete={() => setAction({ row, type: "delete", label: "Delete", reason: "" })}
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
      <div
        className="mb-4 overflow-hidden rounded-2xl"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <StatusFilterTabs
          actions={
            allowed(menus, "Add", config.menuName) && (
              <button
                className="flex h-8 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
                onClick={() => {
                  setForm(Object.fromEntries(config.fields.map(([key, , type]) => [key, type === "boolean" ? false : ""])));
                  setEditing(null);
                }}
              >
                <Plus size={14} /> {tr("Add")} {tr(config.title)}
              </button>
            )
          }
          rows={rows}
          value={tab}
          onChange={setTab}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={`${tr("Search")} ${tr(config.title).toLowerCase()}...`}
          bare
        />
        <DataTable
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
          bare
        />
      </div>
      {(editing || Object.keys(form).length > 0) && (
        <Modal
          open
          title={`${editing ? tr("Edit") : tr("Add")} ${tr(config.title)}`}
          size="lg"
          fixedHeight
          onClose={() => {
            setEditing(null);
            setForm({});
          }}
          footer={
            <>
              <button
                onClick={() => void save(true)}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold disabled:opacity-50"
              >
                {saving && <Spinner size={13} />}
                {tr("Save draft")}
              </button>
              <button
                onClick={() => void save(false)}
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {saving && <Spinner size={13} />}
                {tr("Save")}
              </button>
            </>
          }
        >
          <div className="grid gap-x-8 gap-y-3 md:grid-cols-2">
            {splitFieldsIntoColumns(orderedFields(config.fields)).map((columnFields, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-3">
                {columnFields.map(([key, label, type, lookupKey, staticOptions]) => {
                  const isReadOnly = Boolean(editing && config.readOnlyOnEdit?.includes(key));
                  if (type === "boolean") {
                    return (
                      <CheckboxPill
                        key={key}
                        checked={Boolean(form[key])}
                        onChange={(next) => setForm({ ...form, [key]: next })}
                        label={tr(label)}
                        disabled={isReadOnly}
                        className="self-start"
                      />
                    );
                  }
                  return (
                    <label key={key} className="text-sm font-semibold">
                      {tr(label)}
                      {lookupKey ? (
                        <FilterSelect
                          className="mt-1.5"
                          value={form[key] ?? ""}
                          onChange={(value) => setForm({ ...form, [key]: value })}
                          disabled={isReadOnly}
                          options={[{ value: "", label: `${tr("Select")} ${tr(label).toLowerCase()}` }, ...optionsFor(lookupKey)]}
                        />
                      ) : type === "select" ? (
                        <FilterSelect
                          className="mt-1.5"
                          value={form[key] ?? ""}
                          onChange={(value) => setForm({ ...form, [key]: value })}
                          disabled={isReadOnly}
                          options={[{ value: "", label: `${tr("Select")} ${tr(label).toLowerCase()}` }, ...staticOptions.map((v) => ({ value: v, label: v }))]}
                        />
                      ) : type === "textarea" ? (
                        <textarea
                          value={form[key] ?? ""}
                          disabled={isReadOnly}
                          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                          className="mt-1.5 min-h-24 w-full rounded-xl border px-3 py-2.5"
                        />
                      ) : (
                        <input
                          type={type === "number" ? "number" : "text"}
                          value={form[key] ?? ""}
                          disabled={isReadOnly}
                          onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                          className="mt-1.5 w-full rounded-xl border px-3 py-2.5"
                        />
                      )}
                    </label>
                  );
                })}
              </div>
            ))}
          </div>
        </Modal>
      )}
      {view && (
        <Modal open title={`${tr("View")} ${tr(config.title)}`} onClose={() => setView(null)} size="md">
          <dl className="grid gap-3">
            {config.fields.map(([key, label, type, lookupKey]) => (
              <div key={key} className="rounded-xl border p-3">
                <dt className="text-xs text-slate-400">{tr(label)}</dt>
                <dd className="text-sm font-semibold">{renderValue(key, type, lookupKey, view)}</dd>
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
          fetchAudit={(p, l) => service.audit({ id: idOf(audit), page: p, limit: l }).then(mapAuditResponse)}
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
          pending={actionPending}
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
