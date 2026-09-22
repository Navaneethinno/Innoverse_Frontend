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
import { customerOnboardingApi, onboardingRowsOf } from "@/Services/Onboarding/customerOnboarding.api";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { useMenuPermission } from "@/Components/OnboardingConfig/LifecycleList";
import { CustomerOnboardingWizard } from "./CustomerOnboardingWizard";

// Customer onboarding — now the same 13-call maker-checker lifecycle as
// every other entity (Customer_Onboarding_API.md §1): the row's own
// status/process_status/auth_status decide the buttons, exactly like
// Institution/User Management/Master Config, via the shared
// getMakerCheckerButtons() engine instead of a hand-rolled state table.
const pendingApi = ({ id }) => customerOnboardingApi.pending({ reference_id: id });

function OnboardingActions({ row, canAdd, canEdit, canAuthorize, canChangeStatus, canDelete, onRefresh, onOpen }) {
  const [action, setAction] = useState(null); // { method, label }
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const [working, setWorking] = useState(false);
  const buttons = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete });
  // The API's own can_authorise (true when a request is waiting AND the
  // viewer isn't the one who made it) is the authoritative "may I decide
  // this one" — the server refuses a self-approval regardless, so this
  // just keeps the button from being offered in the first place.
  if (row.can_authorise === false) {
    buttons.authorize = false;
    buttons.deauthorize = false;
  }
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
      const response = await customerOnboardingApi[action.method](payload);
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
          title={row.customer_name || row.email || row.phone_number}
          fields={[
            ["customer_name", "Customer"],
            ["onboarding_definition_name", "Customer type"],
            ["current_step", "Step"],
          ]}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            customerOnboardingApi.audit({ reference_id: row.reference_id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </>
  );
}

export function CustomerOnboardingResource() {
  const can = useMenuPermission("Customer|Onboarding Wizard|Customer Onboarding");
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(null); // { referenceId } | { referenceId: null } for "new"

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await customerOnboardingApi.list({ page, limit });
      setRows(onboardingRowsOf(response));
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
  useLiveChannel("/customer/individual/list", () => void load());

  // Same StatusFilterTabs + search filtering every other maker-checker list
  // uses, applied on top of whatever page pending_only already narrowed
  // server-side to.
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
      key: "customer_name",
      label: "Customer",
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div className="font-semibold">{r.customer_name || "-"}</div>
          <div className="text-[11px] text-muted-foreground">{r.email || r.phone_number}</div>
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
          {r.kyc_level_name && (
            <div className="text-[11px] text-muted-foreground">
              KYC: {r.kyc_level_name}
              {r.kyc_status && <span className={r.kyc_status === "VERIFIED" ? "ml-1 text-emerald-600" : "ml-1 text-amber-600"}>· {r.kyc_status === "VERIFIED" ? "Verified" : "Pending review"}</span>}
            </div>
          )}
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
        <h1 className="text-xl font-black text-slate-800">Customer Onboarding</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Take an individual customer through the institution's published onboarding form — every field, option and rule comes from that configuration.
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
          searchPlaceholder="Search customer onboarding..."
          actions={addAction}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.reference_id}
          isLoading={loading}
          title="Customer Onboarding"
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
        <CustomerOnboardingWizard
          referenceId={wizard.referenceId}
          forceReadOnly={wizard.forceReadOnly}
          onClose={() => setWizard(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
