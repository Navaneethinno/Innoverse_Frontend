import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import {
  AlertCircle,
  Eye,
  History,
  Plus,
  PowerOff,
  Power,
  Search,
  Send,
  ShieldCheck,
  ShieldOff,
  Trash2,
} from "lucide-react";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { DataTable } from "@/Components/Common/DataTable";
import {
  mapInstitutionListResponse,
  useHasInstitutionAction,
  useInstitutionAuthMutation,
  useInstitutionDeactivateMutation,
  useInstitutionDeauthMutation,
  useInstitutionDeleteMutation,
  useInstitutionReactivateMutation,
  useInstitutionSubmitMutation,
  useInstitutionsQuery,
} from "@/Hooks/Institutions/institutionHooks";
import { institutionsApi } from "@/Services/Institutions/institutions.api";
import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";
import { cn } from "@/Utils/Lib/cn";
import { notifications } from "@/Utils/Lib/notifications";
import { institutionId } from "./InstitutionProfileForm";
import { AuthInstitutionProfile } from "./AuthInstitutionProfile";
import { DeauthInstitutionProfile } from "./DeauthInstitutionProfile";
import { DeleteInstitutionProfile } from "./DeleteInstitutionProfile";
import { DeactivateInstitutionProfile } from "./DeactivateInstitutionProfile";
import { ReactivateInstitutionProfile } from "./ReactivateInstitutionProfile";
import { SubmitInstitutionProfile } from "./SubmitInstitutionProfile";
import { AuditInstitutionProfile } from "./AuditInstitutionProfile";

// Every non-active, non-terminal auth_status groups into the "Pending" tab.
// The real, specific value (NEW_AUTH / EDIT_AUTH / DEL_WAIT_AUTH / ...) is
// still shown per-row via StatusBadge — only the tab grouping simplifies.
const ACTIVE_STATUSES = ["ACTIVE", "AUTHORIZED"];
const TERMINAL_INACTIVE_STATUSES = ["INACTIVE", "DEACTIVATED", "DEAUTH", "DELETED"];
const TABS = ["all", "active", "pending", "inactive"];
const TAB_LABEL = { all: "All", active: "Active", pending: "Pending", inactive: "Inactive" };

function statusOf(inst) {
  return String(inst.auth_status ?? inst.status ?? "").toUpperCase();
}
// Entity status is a numeric code (1 = Active, 0 = Inactive, INSTITUTION_
// DRAFT_STATUS_CODE = Draft) — status_name is only the human-readable label
// for display, never compared against directly. Confirmed against a real
// record: status_name showed "Draft" while status was the number 9, not the
// string "DRAFT" — that code lives in Constant.jsx (env-overridable) rather
// than hardcoded here, in case the backend ever renumbers it. The string
// check is kept only as a tolerant fallback in case some other response
// shape sends it as text instead.
function isInstitutionDraft(inst) {
  return Number(inst.status) === INSTITUTION_DRAFT_STATUS_CODE || statusOf(inst) === "DRAFT";
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

// PendingInstitutionsPage.jsx (formerly a separate route) used a different,
// request-based maker-checker data model (usePendingInstitutionsQuery /
// request_id / after_data) rather than a simple status filter over this same
// institution list — so its logic was NOT folded in here as a tab (that
// would misrepresent different data). It is no longer routed (institutionRoutes
// redirects /institutions/pending -> /institutions) and was left in place,
// unrelated to this list's own "Pending" tab which just groups this list's
// own non-active/non-terminal auth_status rows exactly as before.
export function InstitutionProfile() {
  const navigate = useNavigate();
  // Real permission source — the user's own menu_array (from login), the
  // exact same data the sidebar itself uses to decide what to show. An
  // action button only renders if its name is actually present in the
  // "Institution Profile" menu's actions[] for this user, so a user with
  // only View/Edit/Add/Authorise granted never sees Delete/Deactivate/
  // Reactivate/Deauthorize buttons that would just fail server-side anyway.
  const canView = useHasInstitutionAction("View");
  const canAdd = useHasInstitutionAction("Add");
  const canAuthorize = useHasInstitutionAction("Authorize");
  const canDeauthorize = useHasInstitutionAction("Deauthorize");
  const canDelete = useHasInstitutionAction("Delete");
  const canDeactivate = useHasInstitutionAction("Deactivate");
  const canReactivate = useHasInstitutionAction("Reactivate");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
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
  // "Pending" tabs in Profile.jsx, whose backend also can't filter
  // everything the UI exposes.
  const needsFullBatch = activeTab !== "all" || search.trim() !== "";
  const institutionsQuery = useInstitutionsQuery(
    needsFullBatch ? { page: 1, limit: 500 } : { page, limit: 10 },
  );
  const authMutation = useInstitutionAuthMutation();
  const deauthMutation = useInstitutionDeauthMutation();
  const deleteMutation = useInstitutionDeleteMutation();
  const deactivateMutation = useInstitutionDeactivateMutation();
  const reactivateMutation = useInstitutionReactivateMutation();
  const submitMutation = useInstitutionSubmitMutation();

  const institutions = useMemo(() => institutionsQuery.data ?? [], [institutionsQuery.data]);

  const counts = useMemo(() => {
    const result = { all: institutions.length, active: 0, pending: 0, inactive: 0 };
    institutions.forEach((inst) => {
      result[tabOf(inst)] += 1;
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

  const closeAction = () => {
    setAction(null);
    setNarration("");
  };

  const runAction = async () => {
    if (!action) return;
    try {
      const id = institutionId(action.inst);
      const trimmed = narration.trim();
      if (action.type === "auth") await authMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "deauth") await deauthMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "delete") await deleteMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "deactivate") await deactivateMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "reactivate") await reactivateMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "submit") await submitMutation.mutateAsync({ id, narration: trimmed });
      notifications.success("Institution action completed");
      setAction(null);
      setNarration("");
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Action failed");
    }
  };
  const actionPending =
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deactivateMutation.isPending ||
    reactivateMutation.isPending ||
    submitMutation.isPending;

  const columns = [
    { key: "code", label: "Code", render: (r) => <span className="font-mono font-bold text-slate-700">{r.code ?? "—"}</span> },
    { key: "name", label: "Name", render: (r) => <span className="font-semibold text-slate-800">{r.name ?? "—"}</span> },
    { key: "type", label: "Type", sortValue: (r) => r.type_name ?? r.type ?? "", render: (r) => r.type_name ?? r.type ?? "—" },
    {
      key: "status_name",
      label: "Status",
      sortValue: (r) => r.status_name ?? r.status ?? "",
      render: (r) =>
        r.status == null && !r.status_name ? (
          "—"
        ) : (
          <StatusBadge
            status={String(
              r.status_name ?? (isInstitutionDraft(r) ? "DRAFT" : r.status === 1 ? "ACTIVE" : "INACTIVE"),
            ).toUpperCase()}
          />
        ),
    },
    {
      key: "auth_status",
      label: "Authorization Status",
      sortValue: statusOf,
      render: (r) => (r.auth_status ? <StatusBadge status={statusOf(r)} /> : "—"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (inst) => {
        const id = institutionId(inst);
        // status 9 = Draft (not yet submitted, per the confirmed 2026-09
        // spec) — only the maker who owns it can act on it further via
        // /submit, so a Submit action only makes sense for rows actually
        // in that state.
        const draft = isInstitutionDraft(inst);
        const active = inst.status === 1 || String(inst.status_name ?? "").toUpperCase() === "ACTIVE";
        const inactive = inst.status === 0 || String(inst.status_name ?? "").toUpperCase() === "INACTIVE";
        return (
          <div className="flex flex-wrap items-center justify-center gap-1">
            {canView && (
              <button title="View" onClick={() => navigate(`/institutions/${id}`)} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
                <Eye size={14} />
              </button>
            )}
            <button title="Audit" onClick={() => setAuditInstitution(inst)} className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100">
              <History size={14} />
            </button>
            {draft && canAdd && (
              <button title="Submit Draft" onClick={() => setAction({ type: "submit", inst })} className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50">
                <Send size={14} />
              </button>
            )}
            {!draft && canAuthorize && (
              <button title="Authorize" onClick={() => setAction({ type: "auth", inst })} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                <ShieldCheck size={14} />
              </button>
            )}
            {!draft && canDeauthorize && (
              <button title="Deauthorize" onClick={() => setAction({ type: "deauth", inst })} className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50">
                <ShieldOff size={14} />
              </button>
            )}
            {active && canDeactivate && (
              <button title="Deactivate" onClick={() => setAction({ type: "deactivate", inst })} className="rounded-lg p-1.5 text-orange-600 hover:bg-orange-50">
                <PowerOff size={14} />
              </button>
            )}
            {inactive && canReactivate && (
              <button title="Reactivate" onClick={() => setAction({ type: "reactivate", inst })} className="rounded-lg p-1.5 text-emerald-600 hover:bg-emerald-50">
                <Power size={14} />
              </button>
            )}
            {canDelete && (
              <button title="Delete" onClick={() => setAction({ type: "delete", inst })} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                <Trash2 size={14} />
              </button>
            )}
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
        {canAdd && (
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
        )}
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
        fetchMore={async (page, limit) => {
          const mapped = mapInstitutionListResponse(await institutionsApi.list({ page, limit }));
          return { rows: mapped.institutions, totalPages: mapped.pagination.totalPages };
        }}
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

      <AuthInstitutionProfile
        institution={action?.type === "auth" ? action.inst : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />
      <DeauthInstitutionProfile
        institution={action?.type === "deauth" ? action.inst : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />
      <DeleteInstitutionProfile
        institution={action?.type === "delete" ? action.inst : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />
      <DeactivateInstitutionProfile
        institution={action?.type === "deactivate" ? action.inst : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />
      <ReactivateInstitutionProfile
        institution={action?.type === "reactivate" ? action.inst : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />
      <SubmitInstitutionProfile
        institution={action?.type === "submit" ? action.inst : null}
        narration={narration}
        setNarration={setNarration}
        pending={actionPending}
        onClose={closeAction}
        onConfirm={() => void runAction()}
      />

      {auditInstitution && (
        <AuditInstitutionProfile
          institution={auditInstitution}
          institutionId={institutionId(auditInstitution)}
          onClose={() => setAuditInstitution(null)}
        />
      )}
    </div>
  );
}
