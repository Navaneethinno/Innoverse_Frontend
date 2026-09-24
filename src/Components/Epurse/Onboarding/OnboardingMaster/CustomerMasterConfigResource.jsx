import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
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
import { useOwnershipTypes } from "@/Hooks/Master/masterHooks";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { API_ENDPOINTS } from "@/Utils/Constant";
import {
  maritalStatusApi,
  visaTypeApi,
  immigrationStatusApi,
  addressTypeApi,
  relationshipTypeApi,
  indvVerificationStatusApi,
  indvVerificationMethodApi,
  indvTaxStatusApi,
  indvTaxClassificationApi,
  indvPepStatusApi,
  indvPepCategoryApi,
  ownershipSubTypeApi,
  documentTypeApi,
} from "@/Services/Epurse/district.api";

// document_type's only real static enum, per Individual Customer Onboarding
// Configuration reference (2026-09).
const DOCUMENT_TYPE_CATEGORIES = ["TAX", "ADDRESS", "FINANCIAL"];

// One generic resource for the 12 new Individual Customer domain masters
// (2026-09) instead of 12 near-duplicate hand-rolled files like
// Gender.jsx/Disability.jsx — same idea as DigitalProduct.jsx/
// AcctConfigResource.jsx's own CONFIGS-driven generic pattern, applied to
// this batch since every one of these 12 is the exact same plain
// name/description master (only ownership_sub_type adds one more field).
const CONFIGS = {
  marital_status: { title: "Marital Status", menuName: "Marital Status", api: maritalStatusApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.MARITAL_STATUS },
  visa_type: { title: "Visa Type", menuName: "Visa Type", api: visaTypeApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.VISA_TYPE },
  immigration_status: { title: "Immigration Status", menuName: "Immigration Status", api: immigrationStatusApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.IMMIGRATION_STATUS },
  address_type: { title: "Address Type", menuName: "Address Type", api: addressTypeApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.ADDRESS_TYPE },
  relationship_type: { title: "Relationship Type", menuName: "Relationship Type", api: relationshipTypeApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.RELATIONSHIP_TYPE },
  indv_verification_status: { title: "Verification Status", menuName: "Verification Status", api: indvVerificationStatusApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.INDV_VERIFICATION_STATUS },
  indv_verification_method: { title: "Verification Method", menuName: "Verification Method", api: indvVerificationMethodApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.INDV_VERIFICATION_METHOD },
  indv_tax_status: { title: "Tax Status", menuName: "Tax Status", api: indvTaxStatusApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.INDV_TAX_STATUS },
  indv_tax_classification: { title: "Tax Classification", menuName: "Tax Classification", api: indvTaxClassificationApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.INDV_TAX_CLASSIFICATION },
  indv_pep_status: { title: "PEP Status", menuName: "PEP Status", api: indvPepStatusApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.INDV_PEP_STATUS },
  indv_pep_category: { title: "PEP Category", menuName: "PEP Category", api: indvPepCategoryApi, endpoint: API_ENDPOINTS.MASTER_CONFIG.INDV_PEP_CATEGORY },
  // ownership_id is set once on add and never editable — same
  // readOnlyOnEdit convention every other CONFIGS-driven resource in the
  // app uses (see AcctConfigResource.jsx's own acct_product.readOnlyOnEdit).
  ownership_sub_type: {
    title: "Ownership Sub Type",
    menuName: "Ownership Sub Type",
    api: ownershipSubTypeApi,
    endpoint: API_ENDPOINTS.MASTER_CONFIG.OWNERSHIP_SUB_TYPE,
    hasOwnership: true,
    readOnlyOnEdit: ["ownership_id"],
  },
  // Global master of document names, grouped by category — entity F of the
  // Individual Customer Onboarding Configuration reference (2026-09). Not
  // institution-scoped, unlike the 6 config/customer/* entities that
  // reference it (see CustomerOnboardingConfigResource.jsx's own
  // document_type_id lookup).
  document_type: {
    title: "Document Type",
    menuName: "Document Type",
    api: documentTypeApi,
    endpoint: API_ENDPOINTS.MASTER_CONFIG.DOCUMENT_TYPE,
    hasCategory: true,
    readOnlyOnEdit: ["category"],
  },
};

const idOf = (row) => row?.id;
const rowsOf = (response) => (Array.isArray(response?.data) ? response.data : (response?.data?.data ?? []));

// While a Draft edit is staged, the live /list row is intentionally left
// untouched (the backend only writes the staged values into a new /audit
// row, so a checker can later diff current vs proposed) — reopening Edit
// straight off the /list row therefore always showed the pre-edit values,
// making a staged edit look lost. The newest audit row (audit is
// newest-first) holds what was actually staged; a plain Active row with no
// Draft in progress needs no extra call and keeps using the /list row as
// before.
async function draftAwareRow(api, row) {
  if (String(row?.process_status_name ?? "").trim().toUpperCase() !== "DRAFT") return row;
  try {
    const response = await api.audit({ id: idOf(row), page: 1, limit: 1 });
    const latest = rowsOf(response)[0];
    return latest ? { ...row, ...latest } : row;
  } catch {
    return row;
  }
}
const allowed = (menus, action, menuName) =>
  (menus ?? []).some(
    (m) =>
      new RegExp(`^${menuName}$`, "i").test(String(m?.menu_name).trim()) &&
      (m.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action)),
  );

export function CustomerMasterConfigResource({ entity }) {
  const { t } = useTranslation(["onboarding", "common"]);
  const config = CONFIGS[entity];
  // config.menuName (English) drives permissions; this is only what shows.
  const displayTitle = t(`onboarding:masterTitle_${entity}`, { defaultValue: config.title });
  const menus = useSelector((state) => state.menu.menuArray);
  const { ownershipTypes = [] } = useOwnershipTypes(Boolean(config.hasOwnership));

  const [rows, setRows] = useState([]),
    [pagination, setPagination] = useState({}),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(10),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("all"),
    [form, setForm] = useState({ code: "", name: "", description: "", ownership_id: "", category: "" }),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false),
    [view, setView] = useState(null),
    [audit, setAudit] = useState(null),
    [action, setAction] = useState(null),
    [saving, setSaving] = useState(false),
    [actionPending, setActionPending] = useState(false);

  const pendingInfo = usePendingChanges(
    config.api.pending,
    action ? idOf(action.row) : null,
    Boolean(action) && ["auth", "deauth", "deleteAuth"].includes(action?.type),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await config.api.list({ page, limit });
      setRows(rowsOf(response));
      setPagination(response?.pagination ?? response?.data?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [config, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(config.endpoint.LIST, () => void load());

  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (tab === "all" || statusBucket(row) === tab) &&
          JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, tab, search],
  );

  const describeActionRow = (row) => row?.name ?? String(idOf(row));

  const save = async (draft) => {
    if (!form.name.trim()) {
      notifications.error("Name is required");
      return;
    }
    if (!editing && !form.code.trim()) {
      notifications.error("Code is required");
      return;
    }
    if (config.hasOwnership && !editing && (form.ownership_id === "" || form.ownership_id == null)) {
      notifications.error("Please select an ownership");
      return;
    }
    if (config.hasCategory && !editing && !form.category) {
      notifications.error("Please select a category");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        // code is required on add (unique per institution, A-Z 0-9 _) and
        // cannot be changed afterwards.
        ...(!editing ? { code: form.code.trim().toUpperCase() } : {}),
        name: form.name,
        // Collapse runs of blank lines (a paste, or holding Enter, can leave
        // dozens) and drop leading/trailing whitespace — the textarea's
        // maxLength stops new ones, but this also cleans up anything typed
        // before that limit was added.
        description: form.description.trim().replace(/\n{3,}/g, "\n\n"),
        ...(config.hasOwnership && !editing ? { ownership_id: form.ownership_id } : {}),
        ...(config.hasCategory && !editing ? { category: form.category } : {}),
        is_draft: draft,
        ...(editing ? { id: idOf(editing), expected_updated_time: editing.updated_time } : {}),
      };
      const response = await (editing ? config.api.edit(payload) : config.api.add(payload));
      // Confirmed live (see InstitutionBranding.jsx's identical fix):
      // /edit with is_draft:false only updates the record's fields — it
      // never advances process_status on its own, draft or not. Without
      // this, "Save changes" on a Draft (new or edit-in-progress) row
      // looked like it submitted but silently left it stuck in Draft
      // forever, with no Submit button ever appearing on the row to
      // recover it (getMakerCheckerButtons hides Submit for exactly that
      // "Active record with an edit-side draft" shape).
      const wasDraft = editing && (editing.auth_status === "DRAFT" || editing.process_status_name === "Draft");
      if (wasDraft && !draft) {
        await config.api.submit({ id: idOf(editing), narration: "Submitted for review" });
      }
      notifications.success(apiMessage(response, t("onboarding:titleSaved", { title: displayTitle })));
      setOpen(false);
      setEditing(null);
      setForm({ code: "", name: "", description: "", ownership_id: "", category: "" });
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
      const id = idOf(action.row);
      const narration = action.reason || "";
      const payload = { id, narration };
      const response =
        action.type === "submit"
          ? await config.api.submit(payload)
          : action.type === "auth"
            ? await config.api.auth(payload)
            : action.type === "deauth"
              ? await config.api.deauth(payload)
              : action.type === "delete"
                ? await config.api.delete(payload)
                : action.type === "deactivate"
                  ? await config.api.deactivate(payload)
                  : action.type === "reactivate"
                    ? await config.api.reactivate(payload)
                    : await config.api.deleteAuth(payload);
      notifications.success(apiMessage(response, t("onboarding:actionCompleted", { title: displayTitle })));
      setAction(null);
      void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setActionPending(false);
    }
  };

  const columns = [
    ...(config.hasCategory ? [{ key: "category", label: t("onboarding:category"), render: (row) => row.category ?? "-" }] : []),
    { key: "code", label: t("onboarding:code"), render: (row) => row.code ?? "-" },
    { key: "name", label: t("onboarding:name"), render: (row) => row.name ?? "-" },
    { key: "description", label: t("common:description"), render: (row) => row.description || "-" },
    ...(config.hasOwnership
      ? [
          {
            key: "ownership_id",
            label: t("onboarding:ownership"),
            render: (row) => ownershipTypes.find((o) => String(o.id) === String(row.ownership_id))?.name ?? row.ownership_id ?? "-",
          },
        ]
      : []),
    {
      key: "status",
      label: t("common:status"),
      render: (row) => <StatusBadge status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : row.status === 0 ? "INACTIVE" : "-"))} variant="solid" />,
    },
    {
      key: "process_status_name",
      label: t("common:processStatus"),
      render: (row) => <StatusBadge status={String(row.process_status_name ?? "-")} variant="subtle" />,
    },
    {
      key: "auth_status",
      label: t("common:authorizationStatus"),
      render: (row) => <StatusBadge status={String(row.auth_status ?? "-")} variant="subtle" />,
    },
    {
      key: "actions",
      label: t("common:actions"),
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
            onEdit={() =>
              void (async () => {
                const e = await draftAwareRow(config.api, row);
                setForm({ code: e.code ?? "", name: e.name ?? "", description: e.description ?? "", ownership_id: e.ownership_id ?? "", category: e.category ?? "" });
                setEditing(row);
                setOpen(true);
              })()
            }
            onAudit={() => setAudit(row)}
            onSubmit={() => setAction({ type: "submit", row, label: t("common:submit"), reason: "" })}
            onAuthorize={() => setAction({ type: pendingType, row, label: t("common:authorize"), reason: "" })}
            onDeauthorize={() => setAction({ type: "deauth", row, label: t("common:deauthorize"), reason: "" })}
            onDeactivate={() => setAction({ type: "deactivate", row, label: t("statusLabels:Deactivate"), reason: "" })}
            onReactivate={() => setAction({ type: "reactivate", row, label: t("common:reactivate"), reason: "" })}
            onDelete={() => setAction({ type: "delete", row, label: t("statusLabels:Delete"), reason: "" })}
          />
        );
      },
    },
  ];

  const addAction = allowed(menus, "Add", config.menuName) ? (
    <button
      onClick={() => {
        setForm({ code: "", name: "", description: "", ownership_id: "", category: "" });
        setEditing(null);
        setOpen(true);
      }}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
    >
      <Plus size={14} /> {t("onboarding:addTitle", { title: displayTitle })}
    </button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">{displayTitle}</h1>
        <p className="mt-1 text-xs text-muted-foreground">{t("onboarding:manageMasterData", { title: displayTitle.toLowerCase() })}</p>
      </div>
      <div
        className="mb-4 overflow-hidden rounded-2xl"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <StatusFilterTabs total={pagination.totalRecords}
          rows={rows}
          value={tab}
          onChange={setTab}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={t("onboarding:searchTitle", { title: displayTitle.toLowerCase() })}
          actions={addAction}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={idOf}
          isLoading={loading}
          title={displayTitle}
          serverPagination={{
            page,
            totalPages: pagination.totalPages ?? 1,
            totalRecords: pagination.totalRecords ?? rows.length,
            onPageChange: setPage,
            limit,
            onLimitChange: (next) => {
              setLimit(next);
              setPage(1);
            },
          }}
          bare
        />
      </div>
      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={t(editing ? "onboarding:editTitle" : "onboarding:addTitle", { title: displayTitle })}
          footer={
            <>
              <button onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold text-muted-foreground">
                {t("common:cancel")}
              </button>
              <button
                type="submit"
                form="customer-master-config-form"
                data-mode="draft"
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-bold"
              >
                {saving && <Spinner size={13} />}
                {t("onboarding:saveAsDraft")}
              </button>
              <button
                type="submit"
                form="customer-master-config-form"
                data-mode="submit"
                disabled={saving}
                className="flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
              >
                {saving && <Spinner size={13} />}
                {editing ? t("onboarding:saveChanges") : t("onboarding:addTitle", { title: displayTitle })}
              </button>
            </>
          }
        >
          <form
            id="customer-master-config-form"
            onSubmit={(e) => {
              e.preventDefault();
              save(e.nativeEvent.submitter?.dataset?.mode === "draft");
            }}
            className="grid gap-4"
          >
            {config.hasOwnership && (
              <label className="text-sm font-semibold text-slate-700">
                {t("onboarding:ownership")}
                <FilterSelect
                  className="mt-1.5"
                  value={form.ownership_id}
                  onChange={(value) => setForm({ ...form, ownership_id: value })}
                  disabled={Boolean(editing)}
                  options={[
                    { value: "", label: t("customer:selectOwnership") },
                    ...ownershipTypes.map((o) => ({ value: o.id, label: o.name ?? String(o.id) })),
                  ]}
                />
              </label>
            )}
            {config.hasCategory && (
              <label className="text-sm font-semibold text-slate-700">
                {t("onboarding:category")}
                <FilterSelect
                  className="mt-1.5"
                  value={form.category}
                  onChange={(value) => setForm({ ...form, category: value })}
                  disabled={Boolean(editing)}
                  options={[
                    { value: "", label: t("onboarding:selectCategory") },
                    ...DOCUMENT_TYPE_CATEGORIES.map((c) => ({ value: c, label: c })),
                  ]}
                />
              </label>
            )}
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:code")}
              <input
                required
                disabled={Boolean(editing)}
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })}
                className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono disabled:bg-muted"
              />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:aZ09AndCannotBe")}</span>
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:name")}
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 w-full rounded-xl border px-3 py-2.5"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              {t("common:description")}
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={250}
                className="mt-1.5 min-h-24 w-full rounded-xl border p-3"
              />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{form.description.length}/250</span>
            </label>
          </form>
        </Modal>
      )}
      {view && (
        <Modal open title={t("onboarding:viewTitle", { title: displayTitle })} onClose={() => setView(null)} size="sm">
          <dl className="grid gap-3">
            {[
              ...(config.hasCategory ? [[t("onboarding:category"), view.category]] : []),
              [t("onboarding:code"), view.code],
              [t("onboarding:name"), view.name],
              [t("common:description"), view.description],
              ...(config.hasOwnership
                ? [[t("onboarding:ownership"), ownershipTypes.find((o) => String(o.id) === String(view.ownership_id))?.name ?? view.ownership_id]]
                : []),
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-3">
                <dt className="text-xs text-muted-foreground">{label}</dt>
                <dd className="text-sm font-semibold">{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {audit && (
        <AuditModal
          title={displayTitle}
          onClose={() => setAudit(null)}
          fields={[...(config.hasCategory ? [["category", t("onboarding:category")]] : []), ["name", t("onboarding:name")], ["description", t("common:description")], ...(config.hasOwnership ? [["ownership_id", t("onboarding:ownership")]] : [])]}
          fetchAudit={(p, l) => config.api.audit({ id: idOf(audit), page: p, limit: l }).then(mapAuditResponse)}
        />
      )}
      {action && (
        <ConfirmDialog
          open
          title={`${action.label} ${displayTitle}`}
          description={describeConfirmAction(action.type, describeActionRow(action.row))}
          confirmLabel={action.label}
          destructive={["deauth", "delete", "deleteAuth"].includes(action.type)}
          confirmDisabled={action.type === "deauth" && !action.reason?.trim()}
          pending={actionPending}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {["auth", "deauth", "deleteAuth"].includes(action.type) && <PendingChangesDiff {...pendingInfo} />}
          {action.type === "submit" && (
            <dl className="mt-1 grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">{t("onboarding:submitPreview")}</p>
              {[
                ...(config.hasCategory ? [[t("onboarding:category"), action.row?.category]] : []),
                [t("onboarding:code"), action.row?.code],
                [t("onboarding:name"), action.row?.name],
                [t("common:description"), action.row?.description],
                ...(config.hasOwnership
                  ? [[t("onboarding:ownership"), ownershipTypes.find((o) => String(o.id) === String(action.row?.ownership_id))?.name ?? action.row?.ownership_id]]
                  : []),
              ].map(([label, value]) => (
                <div key={label} className="rounded-xl border border-border p-2.5">
                  <dt className="text-[10px] font-bold uppercase text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-700">{value || "-"}</dd>
                </div>
              ))}
            </dl>
          )}
          <textarea
            className="mt-3 min-h-20 w-full rounded-xl border p-3"
            value={action.reason ?? ""}
            onChange={(e) => setAction({ ...action, reason: e.target.value })}
            placeholder={t("onboarding:narration")}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
