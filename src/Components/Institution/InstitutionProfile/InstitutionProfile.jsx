import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { motion } from "motion/react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Filter,
  ListChecks,
  PauseCircle,
  Plus,
} from "lucide-react";
import { RowActions } from "@/Components/Common/RowActions";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { deriveStatusFlags } from "@/Components/MakerChecker/statusFlags";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { DataTable } from "@/Components/Common/DataTable";
import { useSessionState } from "@/Hooks/useSessionState";
import {
  mapInstitutionListResponse,
  useHasInstitutionAction,
  useInstitutionAuthMutation,
  useInstitutionDeactivateMutation,
  useInstitutionDeauthMutation,
  useInstitutionDeleteAuthMutation,
  useInstitutionDeleteMutation,
  useInstitutionReactivateMutation,
  useInstitutionSubmitMutation,
  useInstitutionsQuery,
} from "@/Hooks/Institution/institutionHooks";
import { institutionsApi } from "@/Services/Institution/institutions.api";
import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";
import { cn } from "@/Utils/Lib/cn";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
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
const TAB_LABEL_KEY = {
  all: "statusAll",
  active: "statusActive",
  pending: "statusPending",
  inactive: "statusInactive",
};
const TAB_ICON = { all: ListChecks, active: CheckCircle2, pending: Clock3, inactive: PauseCircle };

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
// Distinguishes a pending DELETE from a pending add/edit/deactivate/
// reactivate — approving the former must call the dedicated /delete_auth
// endpoint, not the generic /auth endpoint (see useInstitutionDeleteAuthMutation).
// Delegates to the shared deriveStatusFlags rather than checking
// process_status_name alone — some responses only populate auth_status with
// the human-readable state ("Pending Delete"), which a process_status_name-
// only check silently misses (confirmed live in UserManagement/Profile).
function isPendingDelete(inst) {
  return deriveStatusFlags(inst).pendingDelete;
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
  const { t } = useTranslation(["institutions", "common"]);
  // Real permission source — the user's own menu_array (from login), the
  // exact same data the sidebar itself uses to decide what to show. An
  // action button only renders if its name is actually present in the
  // "Institution Profile" menu's actions[] for this user, so a user with
  // only Edit/Add/Authorise granted never sees Delete/Deactivate/
  // Reactivate/Deauthorize buttons that would just fail server-side anyway.
  // View is the one exception: it's not consistently granted via login's
  // menu_array actions[] the way the others are, so it's always shown
  // rather than gated — a user should always be able to look at a record.
  // Per the confirmed action-UI mapping: Authorise is ONE grant controlling
  // BOTH the Authorise and Deauthorise buttons as a pair (not two separate
  // permissions), and Change Status is likewise ONE grant controlling BOTH
  // Deactivate and Reactivate as a pair — which one of the pair actually
  // shows depends on the record's own state, not on separate permissions.
  const canEdit = useHasInstitutionAction("Edit");
  const canAdd = useHasInstitutionAction("Add");
  const canAuthorise = useHasInstitutionAction("Authorize");
  const canChangeStatus = useHasInstitutionAction("Change Status");
  const canDelete = useHasInstitutionAction("Delete");
  // Kept for the tab session: View/Edit open the institution on its own
  // route, and coming back should land on the same page, tab and search.
  const [search, setSearch] = useSessionState("institutions:search", "");
  const [activeTab, setActiveTab] = useSessionState("institutions:tab", "all");
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [auditInstitution, setAuditInstitution] = useState(null);

  const [page, setPage] = useSessionState("institutions:page", 1);
  const [limit, setLimit] = useSessionState("institutions:limit", 10);

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
    needsFullBatch ? { page: 1, limit: 500 } : { page, limit },
  );
  const authMutation = useInstitutionAuthMutation();
  const deauthMutation = useInstitutionDeauthMutation();
  const deleteMutation = useInstitutionDeleteMutation();
  const deleteAuthMutation = useInstitutionDeleteAuthMutation();
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
      let result;
      if (action.type === "auth")
        result = isPendingDelete(action.inst)
          ? await deleteAuthMutation.mutateAsync({ id, narration: trimmed })
          : await authMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "deauth") result = await deauthMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "delete") result = await deleteMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "deactivate") result = await deactivateMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "reactivate") result = await reactivateMutation.mutateAsync({ id, narration: trimmed });
      if (action.type === "submit") result = await submitMutation.mutateAsync({ id, narration: trimmed });
      notifications.success(apiMessage(result, "Institution action completed"));
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
    deleteAuthMutation.isPending ||
    deactivateMutation.isPending ||
    reactivateMutation.isPending ||
    submitMutation.isPending;

  const columns = [
    { key: "code", label: t("institutions:columnCode"), render: (r) => <span className="font-mono font-bold text-slate-700">{r.code ?? "—"}</span> },
    { key: "name", label: t("institutions:columnName"), render: (r) => <span className="font-semibold text-slate-800">{r.name ?? "—"}</span> },
    { key: "type", label: t("institutions:columnType"), sortValue: (r) => r.type_name ?? r.type ?? "", render: (r) => r.type_name ?? r.type ?? "—" },
    {
      key: "status_name",
      label: t("institutions:columnStatus"),
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
      key: "process_status_name",
      label: t("institutions:columnProcessStatus"),
      sortValue: (r) => r.process_status_name ?? "",
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} variant="subtle" /> : "—"),
    },
    {
      key: "auth_status",
      label: t("institutions:columnAuthorizationStatus"),
      sortValue: statusOf,
      render: (r) => (r.auth_status ? <StatusBadge status={statusOf(r)} variant="subtle" /> : "—"),
    },
    {
      key: "actions",
      label: t("institutions:columnActions"),
      sortable: false,
      render: (inst) => {
        const id = institutionId(inst);
        // Single shared status-based visibility engine — see
        // buttonVisibility.js for the full status_name/process_status_name
        // matrix this is built from.
        const buttons = getMakerCheckerButtons(inst, {
          canEdit,
          canAdd,
          canAuthorize: canAuthorise,
          canChangeStatus,
          canDelete,
        });
        return (
          <RowActions
            buttons={buttons}
            onView={() => navigate(`/institutions/${id}`)}
            onEdit={() => navigate(`/institutions/${id}?edit=1`)}
            onAudit={() => setAuditInstitution(inst)}
            onSubmit={() => setAction({ type: "submit", inst })}
            onAuthorize={() => setAction({ type: "auth", inst })}
            onDeauthorize={() => setAction({ type: "deauth", inst })}
            onDeactivate={() => setAction({ type: "deactivate", inst })}
            onReactivate={() => setAction({ type: "reactivate", inst })}
            onDelete={() => setAction({ type: "delete", inst })}
          />
        );
      },
    },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black leading-none tracking-tight text-slate-800">{t("institutions:listTitle")}</h1>
        <p className="mt-1 text-xs font-medium text-muted-foreground">
          {t("institutions:listSubtitle", { total: institutions.length, active: counts.active })}
        </p>
      </div>

      <div
        className="mb-4 overflow-hidden rounded-2xl"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
      <div className="flex flex-col gap-2 border-b border-border p-3">
        <div className="flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto">
          {TABS.map((value) => {
            const Icon = TAB_ICON[value];
            const isActive = activeTab === value;
            return (
              <button
                key={value}
                onClick={() => {
                  setActiveTab(value);
                  setPage(1);
                }}
                className={cn(
                  "flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold transition-colors",
                  !isActive && "text-muted-foreground hover:bg-muted hover:text-slate-700",
                )}
                style={
                  isActive
                    ? { background: "var(--primary-light)", color: "var(--primary)" }
                    : undefined
                }
              >
                <Icon
                  size={14}
                  strokeWidth={2}
                  className={isActive ? undefined : "text-muted-foreground"}
                  style={isActive ? { color: "var(--primary)" } : undefined}
                />
                {t(`common:${TAB_LABEL_KEY[value]}`)}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                    !isActive && "bg-slate-100 text-muted-foreground",
                  )}
                  style={isActive ? { background: "var(--primary)", color: "var(--primary-foreground)" } : undefined}
                >
                  {counts[value]}
                </span>
              </button>
            );
          })}
        </div>
        {canAdd && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/institutions/create")}
            className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-3 text-xs font-bold text-white"
            style={{ background: "var(--primary)" }}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">{t("institutions:newInstitution")}</span>
            <span className="sm:hidden">{t("institutions:newInstitutionShort")}</span>
          </motion.button>
        )}
        </div>
        <div className="relative w-full max-w-sm sm:max-w-none">
          <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            type="text"
            placeholder={t("institutions:searchInstitutionsPlaceholder")}
            className="h-9 w-full rounded-lg border border-border bg-white pl-9 pr-3 text-xs outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      {institutionsQuery.error && (
        <div className="mx-3.5 mb-3 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          <AlertCircle size={14} /> {institutionsQuery.error.message}
          <button onClick={() => void institutionsQuery.refetch()} className="ml-auto text-xs font-bold underline">
            {t("institutions:retry")}
          </button>
        </div>
      )}

      <DataTable
        bare
        persistKey="institutions"
        columns={columns}
        rows={filtered}
        rowKey={(inst) => institutionId(inst)}
        isLoading={institutionsQuery.isLoading}
        title={t("institutions:listTitle")}
        searchableKeys={["name", "code"]}
        emptyTitle={t("institutions:emptyTitle")}
        emptyDescription={t("institutions:emptyDescription")}
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
                limit,
                onLimitChange: (nextLimit) => {
                  setLimit(nextLimit);
                  setPage(1);
                },
              }
        }
      />
      </div>

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
