import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useSelector } from "react-redux";
import { RowActions } from "@/Components/Common/RowActions";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { indvProfileApi } from "@/Services/Customer/customer.api";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { describeConfirmAction } from "@/Components/MakerChecker/confirmActionText";
import { matchesAction } from "@/Utils/Lib/actionAliases";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { reconcileSetter } from "@/Utils/Lib/liveReconcile";
import { AddCustomerWizard } from "./AddCustomerWizard";
import { EditCustomerWizard } from "./EditCustomerWizard";
import { ViewCustomerWizard } from "./ViewCustomerWizard";
import { CONFIGS } from "./customerFields";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

const idOf = (r) => r?.id;
const rowsOf = (r) => (Array.isArray(r?.data) ? r.data : (r?.data?.data ?? []));
const allowed = (menus, action, title) =>
  (menus ?? []).some(
    (m) =>
      new RegExp(title, "i").test(String(m?.menu_name)) &&
      (m.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action)),
  );

// The Customer list page — `/customer/indv_profile/*` composite root, same
// "list + RowActions + Add/Edit/View wizard" shape as
// DigitalProductResource.jsx's own `product` entity branch, just without
// the other 8 standalone sub-entity routes that file also serves (Customer
// has exactly one list page, no equivalent of Digital Product's separate
// Product Map/Security Config/... pages).
export function CustomerResource() {
  const config = CONFIGS.profile;
  const tr = useConfigLabel();
  const menus = useSelector((s) => s.menu.menuArray);
  const api = useMemo(() => indvProfileApi(), []);

  const describeActionRow = (row) => {
    if (!row) return "";
    const name = [row.first_name, row.last_name].filter(Boolean).join(" ");
    return name || row.full_name || row.reference_id || String(idOf(row));
  };

  const [rows, setRows] = useState([]),
    [pagination, setPagination] = useState({}),
    [page, setPage] = useState(1),
    [limit, setLimit] = useState(10),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState(""),
    [tab, setTab] = useState("all"),
    [audit, setAudit] = useState(null),
    [action, setAction] = useState(null),
    [wizardOpen, setWizardOpen] = useState(false),
    [editWizardProfile, setEditWizardProfile] = useState(null),
    [viewWizardProfile, setViewWizardProfile] = useState(null);

  // Shows the maker's proposed changes inside the Authorize/Reject confirm
  // dialog — fetched only while that dialog is actually open, via
  // indv_profile's own /pending endpoint (payload {id}).
  const pendingInfo = usePendingChanges(
    api.pending,
    action ? idOf(action.row) : null,
    Boolean(action) && ["auth", "deauth", "deleteAuth"].includes(action?.type),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await api.list({ page, limit });
      setRows(rowsOf(r));
      setPagination(r?.pagination ?? r?.data?.pagination ?? {});
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  // Reconcile in place instead of refetching (Live Updates guide §3) — see
  // DigitalProductResource.jsx's identical comment for why inserts are
  // skipped on this server-paginated list.
  useLiveChannel("/customer/indv_profile/list", reconcileSetter(setRows, { insertNew: false }));

  const visible = useMemo(
    () =>
      rows.filter(
        (r) =>
          (tab === "all" || statusBucket(r) === tab) &&
          JSON.stringify(r).toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, tab, search],
  );

  const run = async () => {
    try {
      const id = idOf(action.row);
      const narration = action.reason || "";
      const payload = { id, narration };
      const r =
        action.type === "submit"
          ? await api.submit(payload)
          : action.type === "auth"
            ? await api.auth(payload)
            : action.type === "deauth"
              ? await api.deauth(payload)
              : action.type === "delete"
                ? await api.delete(payload)
                : action.type === "deactivate"
                  ? await api.deactivate(payload)
                  : action.type === "reactivate"
                    ? await api.reactivate(payload)
                    : await api.deleteAuth(payload);
      notifications.success(apiMessage(r, `${tr(config.title)} action completed`));
      setAction(null);
      void load();
    } catch (e) {
      notifications.error(e.message);
    }
  };

  const columns = [
    { key: "reference_id", label: "Reference", render: (r) => r.reference_id ?? "-" },
    { key: "first_name", label: "First name", render: (r) => r.first_name ?? "-" },
    { key: "last_name", label: "Last name", render: (r) => r.last_name ?? "-" },
    {
      key: "status",
      label: tr("Status"),
      render: (r) =>
        r.status_name != null || r.status != null ? (
          <StatusBadge status={String(r.status_name ?? (r.status === 1 ? "ACTIVE" : "INACTIVE"))} />
        ) : (
          "—"
        ),
    },
    {
      key: "process_status_name",
      label: tr("Process Status"),
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} /> : "—"),
    },
    {
      key: "auth_status",
      label: tr("Authorization Status"),
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} /> : "—"),
    },
    {
      key: "actions",
      label: tr("Actions"),
      sortable: false,
      render: (r) => {
        const visibility = getMakerCheckerButtons(r, {
          canAdd: allowed(menus, "Add", config.menuName ?? config.title),
          canEdit: allowed(menus, "Edit", config.menuName ?? config.title),
          canAuthorize: allowed(menus, "Authorize", config.menuName ?? config.title),
          canDelete: allowed(menus, "Delete", config.menuName ?? config.title),
          canChangeStatus:
            allowed(menus, "Deactivate", config.menuName ?? config.title) ||
            allowed(menus, "Reactivate", config.menuName ?? config.title),
        });
        const pendingType = visibility.isPendingDelete ? "deleteAuth" : "auth";
        return (
          <RowActions
            buttons={visibility}
            onView={() => setViewWizardProfile(r)}
            onEdit={() => setEditWizardProfile(r)}
            onAudit={() => setAudit(r)}
            onSubmit={() => setAction({ type: "submit", row: r, label: "Submit", reason: "" })}
            onAuthorize={() => setAction({ type: pendingType, row: r, label: "Authorize", reason: "" })}
            onDeauthorize={() => setAction({ type: "deauth", row: r, label: "Deauthorize", reason: "" })}
            onDeactivate={() => setAction({ type: "deactivate", row: r, label: "Deactivate", reason: "" })}
            onReactivate={() => setAction({ type: "reactivate", row: r, label: "Reactivate", reason: "" })}
            onDelete={() => setAction({ type: "delete", row: r, label: "Delete", reason: "" })}
          />
        );
      },
    },
  ];

  const addAction = allowed(menus, "Add", config.menuName ?? config.title) ? (
    <button
      onClick={() => setWizardOpen(true)}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
    >
      <Plus size={14} /> {tr("Add")} {tr(config.title)}
    </button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-800">{tr(config.title)}</h1>
          <p className="mt-1 text-xs text-slate-500">
            {tr("Manage")} {tr(config.title).toLowerCase()} {tr("configuration")}.
          </p>
        </div>
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
          searchPlaceholder={`${tr("Search")} ${tr(config.title).toLowerCase()}...`}
          actions={addAction}
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
      {wizardOpen && (
        <AddCustomerWizard
          onClose={() => setWizardOpen(false)}
          onSuccess={() => {
            setWizardOpen(false);
            void load();
          }}
        />
      )}
      {editWizardProfile && (
        <EditCustomerWizard
          profile={editWizardProfile}
          onClose={() => setEditWizardProfile(null)}
          onSaved={() => void load()}
        />
      )}
      {viewWizardProfile && (
        <ViewCustomerWizard profile={viewWizardProfile} onClose={() => setViewWizardProfile(null)} />
      )}
      {audit && (
        <AuditModal
          title={tr(config.title)}
          onClose={() => setAudit(null)}
          fields={config.fields.map(([key, label]) => [key, tr(label)])}
          fetchAudit={(p, l) => api.audit({ id: idOf(audit), page: p, limit: l }).then(mapAuditResponse)}
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
            className="mt-3 min-h-20 w-full rounded-xl border p-3"
            value={action.reason ?? ""}
            onChange={(e) => setAction({ ...action, reason: e.target.value })}
            placeholder={tr("Narration")}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
