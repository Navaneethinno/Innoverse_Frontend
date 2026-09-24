import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { corpCustomerOnboardingApi, corpOnboardingRowsOf } from "@/Services/Onboarding/corporateCustomerOnboarding.api";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { PortalSourceBadge, isPortalDraft, useDebouncedRefresh, usePortalAuditLabel } from "./customerPortal";
import { useMenuPermission } from "@/Components/OnboardingConfig/LifecycleList";
import { CorporateCustomerOnboardingWizard } from "./CorporateCustomerOnboardingWizard";

// Corporate mirror of CustomerOnboardingResource.jsx (Customer Onboarding
// (Corporate) — Frontend Guide §6): same 13-call maker-checker lifecycle,
// same getMakerCheckerButtons()-driven RowActions, just against
// /customer/corporate/* and the row's own company_name/registration_number
// instead of customer_name/kyc fields (no KYC levels for corporate).
const pendingApi = ({ id }) => corpCustomerOnboardingApi.pending({ reference_id: id });

function OnboardingActions({ row, canAdd, canEdit, canAuthorize, canChangeStatus, canDelete, onRefresh, onOpen }) {
  const [action, setAction] = useState(null);
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const [working, setWorking] = useState(false);
  const buttons = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete });
  if (row.can_authorise === false) {
    buttons.authorize = false;
    buttons.deauthorize = false;
  }
  // A portal draft is the customer's own form, still being filled in on
  // the customer portal — view only here until they complete it.
  if (isPortalDraft(row)) {
    buttons.edit = false;
    buttons.submitDraft = false;
    buttons.delete = false;
  }
  const portalAuditLabel = usePortalAuditLabel();
  const pendingInfo = usePendingChanges(
    pendingApi,
    row.reference_id,
    !!action && ["auth", "deauth", "deleteAuth"].includes(action.method),
  );

  const execute = async () => {
    if (action.method === "deauth" && !narration.trim()) {
      notifications.error("A reason is required to reject this");
      return;
    }
    setWorking(true);
    try {
      const payload = { reference_id: row.reference_id, ...(narration.trim() ? { narration: narration.trim() } : {}) };
      const response = await corpCustomerOnboardingApi[action.method](payload);
      notifications.success(apiMessage(response, `${action.label} successful`));
      await onRefresh();
      setAction(null);
      setNarration("");
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setWorking(false);
    }
  };

  const pendingMethod = buttons.isPendingDelete ? "deleteAuth" : "auth";
  return (
    <>
      <RowActions
        buttons={buttons}
        onView={() => onOpen(row, { forceReadOnly: true })}
        onEdit={buttons.edit ? () => onOpen(row) : undefined}
        onAudit={() => setAudit(true)}
        onAuthorize={() => setAction({ method: pendingMethod, label: "Authorize" })}
        onDeauthorize={() => setAction({ method: "deauth", label: "Reject" })}
        onDeactivate={() => setAction({ method: "deactivate", label: "Deactivate" })}
        onReactivate={() => setAction({ method: "reactivate", label: "Reactivate" })}
        onDelete={() => setAction({ method: "delete", label: "Delete" })}
      />
      <ConfirmDialog
        open={!!action}
        title={`${action?.label ?? "Action"} onboarding`}
        confirmLabel={action?.label}
        destructive={["deauth", "delete", "deleteAuth"].includes(action?.method)}
        pending={working}
        confirmDisabled={action?.method === "deauth" && !narration.trim()}
        onClose={() => setAction(null)}
        onConfirm={() => void execute()}
      >
        {["auth", "deauth", "deleteAuth"].includes(action?.method) && <PendingChangesDiff {...pendingInfo} />}
        <textarea
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          placeholder={action?.method === "deauth" ? "Reason (required)" : "Narration"}
          className="mt-3 min-h-20 w-full rounded-xl border border-border p-3 text-sm"
        />
      </ConfirmDialog>
      {audit && (
        <AuditModal
          getActionLabel={portalAuditLabel}
          title={row.company_name || row.email || row.phone_number}
          fields={[
            ["company_name", "Company"],
            ["registration_number", "Registration number"],
            ["onboarding_definition_name", "Customer type"],
            ["current_step", "Step"],
          ]}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            corpCustomerOnboardingApi.audit({ reference_id: row.reference_id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}

export function CorporateCustomerOnboardingResource() {
  const can = useMenuPermission("Corporate Customer|Corporate Onboarding Wizard|Corporate Customer Onboarding");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(null); // { referenceId } | { referenceId: null } for "new"

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await corpCustomerOnboardingApi.list({ page, limit });
      setRows(corpOnboardingRowsOf(response));
      setPagination(response?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [page, limit]);
  useEffect(() => {
    void load();
  }, [load]);
  // Live pushes now include customer-portal activity (one `edit` per
  // section the customer saves) — coalesce bursts into one quiet refetch.
  const liveRefresh = useDebouncedRefresh(() => load({ silent: true }));
  useLiveChannel("/customer/corporate/list", liveRefresh);

  const visible =
    !search.trim() && tab === "all"
      ? rows
      : rows.filter(
          (row) =>
            (tab === "all" || statusBucket(row) === tab) &&
            JSON.stringify(row).toLowerCase().includes(search.trim().toLowerCase()),
        );

  const columns = [
    {
      key: "company_name",
      label: "Company",
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div className="font-semibold">{r.company_name || "-"}</div>
          <div className="text-[11px] text-muted-foreground">{r.registration_number || r.email || r.phone_number}</div>
          {r.inst_profile_name && <div className="text-[11px] text-muted-foreground">{r.inst_profile_name}</div>}
          <PortalSourceBadge record={r} />
        </div>
      ),
    },
    {
      key: "onboarding_definition_name",
      label: "Customer type",
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div>{r.onboarding_definition_name ?? "-"}</div>
          <div className="text-[11px] text-muted-foreground">Step: {r.current_step ?? "-"}</div>
        </div>
      ),
    },
    {
      key: "status_name",
      label: "Status",
      render: (r) => <StatusBadge status={String(r.status_name ?? "-")} />,
    },
    {
      key: "process_status_name",
      label: "Process Status",
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} /> : "-"),
    },
    {
      key: "auth_status",
      label: "Authorization Status",
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} /> : "-"),
    },
    { key: "updated_time", label: "Last activity", render: (r) => (r.updated_time ? new Date(r.updated_time).toLocaleString() : "-") },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <OnboardingActions
          row={r}
          canAdd={can("Add")}
          canEdit={can("Edit")}
          canAuthorize={can("Authorize")}
          canChangeStatus={can("Change Status")}
          canDelete={can("Delete")}
          onRefresh={load}
          onOpen={(row, opts) => setWizard({ referenceId: row.reference_id, forceReadOnly: Boolean(opts?.forceReadOnly) })}
        />
      ),
    },
  ];

  const addAction = can("Add") ? (
    <button
      type="button"
      onClick={() => setWizard({ referenceId: null })}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
    >
      <Plus size={14} /> New onboarding
    </button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">Corporate Customer Onboarding</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Register a company, merchant or agent through the institution's published corporate onboarding form — every field, option and rule comes from that configuration.
        </p>
      </div>
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <StatusFilterTabs
          rows={rows}
          value={tab}
          onChange={setTab}
          search={search}
          onSearch={setSearch}
          searchPlaceholder="Search corporate onboarding..."
          actions={addAction}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.reference_id}
          isLoading={loading}
          title="Corporate Customer Onboarding"
          emptyTitle="No onboarding in progress"
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

      {wizard && (
        <CorporateCustomerOnboardingWizard
          referenceId={wizard.referenceId}
          forceReadOnly={wizard.forceReadOnly}
          onClose={() => setWizard(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
