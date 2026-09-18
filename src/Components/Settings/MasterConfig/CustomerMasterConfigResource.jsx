import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { RowActions } from "@/Components/Common/RowActions";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
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
} from "@/Services/MasterConfig/district.api";

// One generic resource for the 12 new Individual Customer domain masters
// (2026-09) instead of 12 near-duplicate hand-rolled files like
// Gender.jsx/Disability.jsx — same idea as DigitalProductResource.jsx/
// AcctConfigResource.jsx's own CONFIGS-driven generic pattern, applied to
// this batch since every one of these 12 is the exact same plain
// name/description master (only ownership_sub_type adds one more field).
const CONFIGS = {
  marital_status: { title: "Marital Status", menuName: "Marital Status", api: maritalStatusApi },
  visa_type: { title: "Visa Type", menuName: "Visa Type", api: visaTypeApi },
  immigration_status: { title: "Immigration Status", menuName: "Immigration Status", api: immigrationStatusApi },
  address_type: { title: "Address Type", menuName: "Address Type", api: addressTypeApi },
  relationship_type: { title: "Relationship Type", menuName: "Relationship Type", api: relationshipTypeApi },
  indv_verification_status: { title: "Verification Status", menuName: "Verification Status", api: indvVerificationStatusApi },
  indv_verification_method: { title: "Verification Method", menuName: "Verification Method", api: indvVerificationMethodApi },
  indv_tax_status: { title: "Tax Status", menuName: "Tax Status", api: indvTaxStatusApi },
  indv_tax_classification: { title: "Tax Classification", menuName: "Tax Classification", api: indvTaxClassificationApi },
  indv_pep_status: { title: "PEP Status", menuName: "PEP Status", api: indvPepStatusApi },
  indv_pep_category: { title: "PEP Category", menuName: "PEP Category", api: indvPepCategoryApi },
  // ownership_id is set once on add and never editable — same
  // readOnlyOnEdit convention every other CONFIGS-driven resource in the
  // app uses (see AcctConfigResource.jsx's own acct_product.readOnlyOnEdit).
  ownership_sub_type: {
    title: "Ownership Sub Type",
    menuName: "Ownership Sub Type",
    api: ownershipSubTypeApi,
    hasOwnership: true,
    readOnlyOnEdit: ["ownership_id"],
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

export function CustomerMasterConfigResource({ entity }) {
  const config = CONFIGS[entity];
  const menus = useSelector((state) => state.menu.menuArray);
  const { ownershipTypes = [] } = useOwnershipTypes(Boolean(config.hasOwnership));

  const [rows, setRows] = useState([]),
    [pagination, setPagination] = useState({}),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(10),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("all"),
    [form, setForm] = useState({ name: "", description: "", ownership_id: "" }),
    [editing, setEditing] = useState(null),
    [open, setOpen] = useState(false),
    [view, setView] = useState(null),
    [audit, setAudit] = useState(null),
    [action, setAction] = useState(null),
    [saving, setSaving] = useState(false);

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
    if (config.hasOwnership && !editing && (form.ownership_id === "" || form.ownership_id == null)) {
      notifications.error("Please select an ownership");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        ...(config.hasOwnership && !editing ? { ownership_id: form.ownership_id } : {}),
        is_draft: draft,
        ...(editing ? { id: idOf(editing), expected_updated_time: editing.updated_time } : {}),
      };
      const response = await (editing ? config.api.edit(payload) : config.api.add(payload));
      notifications.success(apiMessage(response, `${config.title} saved`));
      setOpen(false);
      setEditing(null);
      setForm({ name: "", description: "", ownership_id: "" });
      void load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const run = async () => {
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
      notifications.success(apiMessage(response, `${config.title} action completed`));
      setAction(null);
      void load();
    } catch (error) {
      notifications.error(error.message);
    }
  };

  const columns = [
    { key: "name", label: "Name", render: (row) => row.name ?? "-" },
    { key: "description", label: "Description", render: (row) => row.description || "-" },
    ...(config.hasOwnership
      ? [
          {
            key: "ownership_id",
            label: "Ownership",
            render: (row) => ownershipTypes.find((o) => String(o.id) === String(row.ownership_id))?.name ?? row.ownership_id ?? "-",
          },
        ]
      : []),
    {
      key: "status",
      label: "Status",
      render: (row) => <StatusBadge status={String(row.status_name ?? (row.status === 1 ? "ACTIVE" : row.status === 0 ? "INACTIVE" : "-"))} variant="solid" />,
    },
    {
      key: "process_status_name",
      label: "Process Status",
      render: (row) => <StatusBadge status={String(row.process_status_name ?? "-")} />,
    },
    {
      key: "auth_status",
      label: "Authorization Status",
      render: (row) => <StatusBadge status={String(row.auth_status ?? "-")} />,
    },
    {
      key: "actions",
      label: "Actions",
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
              setForm({ name: row.name ?? "", description: row.description ?? "", ownership_id: row.ownership_id ?? "" });
              setEditing(row);
              setOpen(true);
            }}
            onAudit={() => setAudit(row)}
            onSubmit={() => setAction({ type: "submit", row, label: "Submit", reason: "" })}
            onAuthorize={() => setAction({ type: pendingType, row, label: "Authorize", reason: "" })}
            onDeauthorize={() => setAction({ type: "deauth", row, label: "Deauthorize", reason: "" })}
            onDeactivate={() => setAction({ type: "deactivate", row, label: "Deactivate", reason: "" })}
            onReactivate={() => setAction({ type: "reactivate", row, label: "Reactivate", reason: "" })}
            onDelete={() => setAction({ type: "delete", row, label: "Delete", reason: "" })}
          />
        );
      },
    },
  ];

  const addAction = allowed(menus, "Add", config.menuName) ? (
    <button
      onClick={() => {
        setForm({ name: "", description: "", ownership_id: "" });
        setEditing(null);
        setOpen(true);
      }}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
    >
      <Plus size={14} /> Add {config.title}
    </button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">{config.title}</h1>
        <p className="mt-1 text-xs text-slate-500">Manage {config.title.toLowerCase()} master data.</p>
      </div>
      <div
        className="mb-4 overflow-hidden rounded-2xl"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <StatusFilterTabs
          rows={rows}
          value={tab}
          onChange={setTab}
          search={search}
          onSearch={setSearch}
          searchPlaceholder={`Search ${config.title.toLowerCase()}...`}
          actions={addAction}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={idOf}
          isLoading={loading}
          title={config.title}
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
          compact
        />
      </div>
      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={`${editing ? "Edit" : "Add"} ${config.title}`}
          footer={
            <>
              <button onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold text-slate-500">
                Cancel
              </button>
              <button
                type="submit"
                form="customer-master-config-form"
                data-mode="draft"
                disabled={saving}
                className="rounded-xl border px-4 py-2 text-sm font-bold"
              >
                Save as draft
              </button>
              <button
                type="submit"
                form="customer-master-config-form"
                data-mode="submit"
                disabled={saving}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white"
              >
                {editing ? "Save changes" : `Add ${config.title}`}
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
                Ownership
                <FilterSelect
                  className="mt-1.5"
                  value={form.ownership_id}
                  onChange={(value) => setForm({ ...form, ownership_id: value })}
                  disabled={Boolean(editing)}
                  options={[
                    { value: "", label: "Select ownership" },
                    ...ownershipTypes.map((o) => ({ value: o.id, label: o.name ?? String(o.id) })),
                  ]}
                />
              </label>
            )}
            <label className="text-sm font-semibold text-slate-700">
              Name
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="mt-1.5 w-full rounded-xl border px-3 py-2.5"
              />
            </label>
            <label className="text-sm font-semibold text-slate-700">
              Description
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="mt-1.5 min-h-24 w-full rounded-xl border p-3"
              />
            </label>
          </form>
        </Modal>
      )}
      {view && (
        <Modal open title={`View ${config.title}`} onClose={() => setView(null)} size="sm">
          <dl className="grid gap-3">
            {[
              ["Name", view.name],
              ["Description", view.description],
              ...(config.hasOwnership
                ? [["Ownership", ownershipTypes.find((o) => String(o.id) === String(view.ownership_id))?.name ?? view.ownership_id]]
                : []),
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border p-3">
                <dt className="text-xs text-slate-400">{label}</dt>
                <dd className="text-sm font-semibold">{value || "-"}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
      {audit && (
        <AuditModal
          title={config.title}
          onClose={() => setAudit(null)}
          fields={[["name", "Name"], ["description", "Description"], ...(config.hasOwnership ? [["ownership_id", "Ownership"]] : [])]}
          fetchAudit={(p, l) => config.api.audit({ id: idOf(audit), page: p, limit: l }).then(mapAuditResponse)}
        />
      )}
      {action && (
        <ConfirmDialog
          open
          title={`${action.label} ${config.title}`}
          description={describeConfirmAction(action.type, describeActionRow(action.row))}
          confirmLabel={action.label}
          destructive={["deauth", "delete", "deleteAuth"].includes(action.type)}
          confirmDisabled={action.type === "deauth" && !action.reason?.trim()}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {["auth", "deauth", "deleteAuth"].includes(action.type) && <PendingChangesDiff {...pendingInfo} />}
          <textarea
            className="mt-3 min-h-20 w-full rounded-xl border p-3"
            value={action.reason ?? ""}
            onChange={(e) => setAction({ ...action, reason: e.target.value })}
            placeholder="Narration"
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
