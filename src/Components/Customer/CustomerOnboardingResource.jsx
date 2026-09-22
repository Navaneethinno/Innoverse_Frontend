import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { customerOnboardingApi, onboardingRowsOf } from "@/Services/Onboarding/customerOnboarding.api";
import { useMenuPermission } from "@/Components/OnboardingConfig/LifecycleList";
import { CustomerOnboardingWizard } from "./CustomerOnboardingWizard";

// Customer onboarding — now the same 13-call maker-checker lifecycle as
// every other entity (Customer_Onboarding_API.md §1): the row's own
// status/process_status/auth_status decide the buttons, exactly like
// Institution/User Management/Master Config, via the shared
// getMakerCheckerButtons() engine instead of a hand-rolled state table.
const pendingApi = ({ id }) => customerOnboardingApi.pending({ reference_id: id });

// The common single-status views from the state table (guide §1.2) — the
// list call itself takes `status`/`process_status` as plain numbers now.
const STATUS_FILTERS = [
  { value: "", label: "Any status" },
  { value: "1:1", label: "Active" },
  { value: "9:9", label: "Draft" },
  { value: "5:5", label: "Rejected add" },
  { value: "13:13", label: "Inactive" },
  { value: "8:8", label: "Deleted" },
];

function OnboardingActions({ row, canAdd, canEdit, canAuthorize, canChangeStatus, canDelete, onRefresh, onOpen }) {
  const [action, setAction] = useState(null); // { method, label }
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const [working, setWorking] = useState(false);
  const buttons = getMakerCheckerButtons(row, { canAdd, canEdit, canAuthorize, canChangeStatus, canDelete });
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
        onView={!buttons.edit ? () => onOpen(row) : undefined}
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
          className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-3 text-sm"
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
  const [pendingOnly, setPendingOnly] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [wizard, setWizard] = useState(null); // { referenceId } | { referenceId: null } for "new"

  const [status, processStatus] = statusFilter ? statusFilter.split(":").map(Number) : [undefined, undefined];
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await customerOnboardingApi.list({
        page,
        limit,
        ...(pendingOnly ? { pending_only: true } : {}),
        ...(status != null ? { status, process_status: processStatus } : {}),
      });
      setRows(onboardingRowsOf(response));
      setPagination(response?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, pendingOnly, statusFilter]);
  useEffect(() => {
    void load();
  }, [load]);

  const columns = [
    {
      key: "customer_name",
      label: "Customer",
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div className="font-semibold">{r.customer_name || "-"}</div>
          <div className="text-[11px] text-slate-400">{r.email || r.phone_number}</div>
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
          <div className="text-[11px] text-slate-400">Step: {r.current_step ?? "-"}</div>
          {r.kyc_level_name && (
            <div className="text-[11px] text-slate-400">
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
          onOpen={(row) => setWizard({ referenceId: row.reference_id })}
        />
      ),
    },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">Customer Onboarding</h1>
          <p className="mt-1 text-xs text-slate-500">
            Take an individual customer through the institution's published onboarding form — every field, option and rule comes from that configuration.
          </p>
        </div>
        {can("Add") && (
          <button
            type="button"
            onClick={() => setWizard({ referenceId: null })}
            className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
          >
            <Plus size={14} /> New onboarding
          </button>
        )}
      </div>
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-3">
          <div className="flex items-center gap-1.5">
            {[
              { key: false, label: "All" },
              { key: true, label: "Waiting for me" },
            ].map((tab) => (
              <button
                key={String(tab.key)}
                type="button"
                onClick={() => {
                  setPendingOnly(tab.key);
                  setPage(1);
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-bold ${pendingOnly === tab.key ? "bg-primary text-white" : "text-slate-500 hover:bg-slate-100"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <FilterSelect
            className="w-40"
            value={statusFilter}
            onChange={(v) => {
              setStatusFilter(v);
              setPage(1);
            }}
            options={STATUS_FILTERS}
          />
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.reference_id}
          isLoading={loading}
          title="Customer Onboarding"
          emptyTitle="No onboarding in progress"
          searchableKeys={["customer_name", "email", "phone_number", "onboarding_definition_name"]}
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
          onClose={() => setWizard(null)}
          onChanged={() => void load()}
        />
      )}
    </div>
  );
}
