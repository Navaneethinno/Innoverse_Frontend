import { useCallback, useEffect, useState } from "react";
import { Plus, PlayCircle } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { actionButtonClass } from "@/Components/Common/actionStyles";
import { notifications } from "@/Utils/Lib/notifications";
import { customerOnboardingApi, onboardingRowsOf } from "@/Services/Onboarding/customerOnboarding.api";
import { CustomerOnboardingWizard } from "./CustomerOnboardingWizard";

// Customer onboarding in progress ("Customer Onboarding (Individual) —
// Frontend Guide" §7). This is a work list, not a maker-checker registry —
// authorising the finished customer isn't part of the API yet (guide §9),
// so every row here is still ACTIVE/incomplete and the only action is to
// resume it in the wizard.
export function CustomerOnboardingResource() {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
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

  const columns = [
    {
      key: "customer_name",
      label: "Customer",
      render: (r) => (
        <div className="text-left">
          <div className="font-semibold">{r.customer_name || "-"}</div>
          <div className="text-[11px] text-slate-400">{r.email || r.phone_number}</div>
        </div>
      ),
    },
    { key: "customer_type", label: "Customer type" },
    {
      key: "current_step",
      label: "Progress",
      render: (r) => (
        <span className="inline-flex items-center gap-2">
          {r.current_step} <StatusBadge status={r.onboarding_status} />
        </span>
      ),
    },
    { key: "last_activity_at", label: "Last activity", render: (r) => (r.last_activity_at ? new Date(r.last_activity_at).toLocaleString() : "-") },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <div className="flex items-center justify-center gap-1">
          <UiTooltip label="Resume">
            <button type="button" className={actionButtonClass("edit")} onClick={() => setWizard({ referenceId: r.reference_id })}>
              <PlayCircle size={14} />
            </button>
          </UiTooltip>
        </div>
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
        <button
          type="button"
          onClick={() => setWizard({ referenceId: null })}
          className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
        >
          <Plus size={14} /> New onboarding
        </button>
      </div>
      <div
        className="overflow-hidden rounded-2xl"
        style={{ background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" }}
      >
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(r) => r.reference_id}
          isLoading={loading}
          title="Customer Onboarding"
          emptyTitle="No onboarding in progress"
          searchableKeys={["customer_name", "email", "phone_number", "customer_type"]}
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
