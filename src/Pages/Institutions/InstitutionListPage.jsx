import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { AlertCircle, Eye, History, Plus, Search, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { InstitutionAuditModal } from "@/Components/Institutions/InstitutionAuditModal";
import { DataTable } from "@/Components/Common/DataTable";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import {
  useInstitutionAuthMutation,
  useInstitutionDeauthMutation,
  useInstitutionDeleteAuthMutation,
  useInstitutionDeleteMutation,
  useInstitutionsQuery,
} from "@/Hooks/Institutions/institutionHooks";
import { cn } from "@/Utils/Lib/cn";
import { notifications } from "@/Utils/Lib/notifications";

// Every non-active, non-terminal auth_status groups into the "Pending" tab.
// The real, specific value (NEW_AUTH / EDIT_AUTH / DEL_WAIT_AUTH / ...) is
// still shown per-row via StatusBadge — only the tab grouping simplifies.
const ACTIVE_STATUSES = ["ACTIVE", "AUTHORIZED"];
const TERMINAL_INACTIVE_STATUSES = ["INACTIVE", "DEACTIVATED", "DEAUTH", "DELETED"];
const TABS = ["all", "active", "pending"];
const TAB_LABEL = { all: "All", active: "Active", pending: "Pending" };

function statusOf(inst) {
  return String(inst.auth_status ?? inst.status ?? "").toUpperCase();
}
function tabOf(inst) {
  const status = statusOf(inst);
  if (ACTIVE_STATUSES.includes(status)) return "active";
  if (TERMINAL_INACTIVE_STATUSES.includes(status)) return "inactive";
  return "pending";
}
function timestampOf(inst) {
  const raw = inst.updated_time ?? inst.created_time;
  const time = raw ? new Date(raw).getTime() : NaN;
  return Number.isNaN(time) ? 0 : time;
}
function institutionId(inst) {
  return inst?.id ?? inst?.inst_id ?? inst?.institution_id;
}

export function InstitutionListPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [action, setAction] = useState(null);
  const [description, setDescription] = useState("");
  const [auditInstitution, setAuditInstitution] = useState(null);

  const [page, setPage] = useState(1);

  // /institution/profile/list has no status-filter or search param
  // (confirmed via Postman) — unlike /user/list, which does and so can
  // paginate correctly under any tab/search. Real per-page server requests
  // ({page, limit:10}, reading pagination.totalRecords) only produce
  // correct results here for the genuinely unfiltered view: page 2 of
  // "Active" wouldn't correspond to anything real if the server did the
  // slicing before any status filtering happened on our end. So: when
  // viewing "All" with no search, fetch real pages from the server (fast,
  // scales to any record count). The moment a tab or search narrows the
  // view, we need the fuller working set in memory to filter correctly,
  // so switch to a larger single fetch and let DataTable paginate that
  // client-side instead — same tradeoff already accepted for the "Active"/
  // "Pending" tabs in UsersPage.jsx, whose backend also can't filter
  // everything the UI exposes.
  const needsFullBatch = activeTab !== "all" || search.trim() !== "";
  const institutionsQuery = useInstitutionsQuery(
    needsFullBatch ? { page: 1, limit: 500 } : { page, limit: 10 },
  );
  const authMutation = useInstitutionAuthMutation();
  const deauthMutation = useInstitutionDeauthMutation();
  const deleteMutation = useInstitutionDeleteMutation();
  const deleteAuthMutation = useInstitutionDeleteAuthMutation();

  const institutions = useMemo(() => institutionsQuery.data ?? [], [institutionsQuery.data]);

  const counts = useMemo(() => {
    const result = { all: institutions.length, active: 0, pending: 0 };
    institutions.forEach((inst) => {
      const tab = tabOf(inst);
      if (tab === "active" || tab === "pending") result[tab] += 1;
    });
    return result;
  }, [institutions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = institutions.filter((inst) => {
      const matchSearch =
        !q ||
        String(inst.name ?? "").toLowerCase().includes(q) ||
        String(inst.code ?? "").toLowerCase().includes(q);
      const matchTab = activeTab === "all" || tabOf(inst) === activeTab;
      return matchSearch && matchTab;
    });
    if (activeTab === "pending" || activeTab === "all") {
      return [...rows].sort((a, b) => timestampOf(b) - timestampOf(a));
    }
    return rows;
  }, [institutions, search, activeTab]);

  const runAction = async () => {
    if (!action) return;
    try {
      const id = institutionId(action.inst);
      if (action.type === "auth") await authMutation.mutateAsync({ id, remark: description.trim() });
      if (action.type === "deauth") await deauthMutation.mutateAsync({ id, description: description.trim(), remark: description.trim() });
      if (action.type === "delete") await deleteMutation.mutateAsync({ id });
      if (action.type === "deleteAuth") await deleteAuthMutation.mutateAsync({ id });
      notifications.success("Institution action completed");
      setAction(null);
      setDescription("");
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Action failed");
    }
  };
  const actionPending =
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deleteAuthMutation.isPending;

  const columns = [
    { key: "code", label: "Code", render: (r) => <span className="font-mono font-bold text-slate-700">{r.code ?? "—"}</span> },
    { key: "name", label: "Name", render: (r) => <span className="font-semibold text-slate-800">{r.name ?? "—"}</span> },
    { key: "type", label: "Type", sortValue: (r) => r.type_name ?? r.type ?? "", render: (r) => r.type_name ?? r.type ?? "—" },
    { key: "status", label: "Status", sortValue: statusOf, render: (r) => <StatusBadge status={statusOf(r)} /> },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (inst) => {
        const id = institutionId(inst);
        return (
          <div className="flex items-center justify-center gap-1">
            <button title="View" onClick={() => navigate(`/institutions/${id}`)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
              <Eye size={14} />
            </button>
            <button title="Audit" onClick={() => setAuditInstitution(inst)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
              <History size={14} />
            </button>
            <button title="Authorize" onClick={() => setAction({ type: "auth", inst })} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
              <ShieldCheck size={14} />
            </button>
            <button title="Deauthorize" onClick={() => setAction({ type: "deauth", inst })} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50">
              <ShieldOff size={14} />
            </button>
            <button title="Delete" onClick={() => setAction({ type: "delete", inst })} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
              <Trash2 size={14} />
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="pt-3 pb-6">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-0.5 text-[11px] font-bold uppercase tracking-widest text-blue-400">Registry</p>
          <h1 className="text-xl font-black leading-none tracking-tight text-slate-800">Institutions</h1>
          <p className="mt-1 text-xs font-medium text-slate-400">
            {institutions.length} registered · {counts.active} active
          </p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }}
          whileTap={{ scale: 0.97 }}
          onClick={() => navigate("/institutions/create")}
          className="flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-bold text-white shadow-lg shadow-blue-200/50"
          style={{ background: "#2266EE" }}
        >
          <Plus size={14} />
          <span className="hidden sm:inline">New Institution</span>
          <span className="sm:hidden">New</span>
        </motion.button>
      </div>

      <div className="mb-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full max-w-xs">
          <Search size={13} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            type="text"
            placeholder="Search institutions…"
            className="w-full rounded-xl py-2 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ background: "var(--glass-bg)", backdropFilter: "blur(12px)", border: "1px solid var(--glass-border)" }}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {TABS.map((value) => (
            <button
              key={value}
              onClick={() => {
                setActiveTab(value);
                setPage(1);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-all",
                activeTab === value
                  ? "border-transparent text-white shadow-md shadow-blue-200/50"
                  : "text-slate-500 hover:border-blue-200 hover:text-blue-600",
              )}
              style={
                activeTab === value
                  ? { background: "#2266EE", border: "none" }
                  : { background: "var(--glass-bg)", backdropFilter: "blur(12px)", borderColor: "var(--glass-border)" }
              }
            >
              {TAB_LABEL[value]} ({counts[value]})
            </button>
          ))}
        </div>
      </div>

      {institutionsQuery.error && (
        <div className="mb-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {institutionsQuery.error.message}
          <button onClick={() => void institutionsQuery.refetch()} className="ml-auto text-xs font-bold underline">
            Retry
          </button>
        </div>
      )}

      <DataTable
        columns={columns}
        rows={filtered}
        rowKey={(inst) => institutionId(inst)}
        isLoading={institutionsQuery.isLoading}
        title="Institutions"
        searchableKeys={["name", "code"]}
        emptyTitle="No institutions found"
        emptyDescription="Adjust your search or filter criteria"
        serverPagination={
          needsFullBatch
            ? null
            : {
                page: institutionsQuery.pagination?.currentPage ?? page,
                totalPages: institutionsQuery.pagination?.totalPages ?? 1,
                totalRecords: institutionsQuery.pagination?.totalRecords ?? filtered.length,
                onPageChange: setPage,
              }
        }
      />

      <ConfirmDialog
        open={!!action}
        onClose={() => {
          setAction(null);
          setDescription("");
        }}
        title="Confirm institution action"
        description={
          action && (
            <>
              {action.type} institution <strong>{action.inst?.name ?? action.inst?.code}</strong>?
            </>
          )
        }
        pending={actionPending}
        confirmDisabled={(action?.type === "auth" || action?.type === "deauth") && !description.trim()}
        destructive={action?.type === "delete"}
        onConfirm={() => void runAction()}
      >
        {action && (action.type === "auth" || action.type === "deauth") && (
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Remark (required)"
            className="mt-3 min-h-20 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
          />
        )}
      </ConfirmDialog>

      {auditInstitution && (
        <InstitutionAuditModal
          institution={auditInstitution}
          institutionId={institutionId(auditInstitution)}
          onClose={() => setAuditInstitution(null)}
        />
      )}
    </div>
  );
}
