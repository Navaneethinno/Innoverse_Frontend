import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useTranslation } from "react-i18next";
import { RowActions } from "@/Components/Common/RowActions";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { describeConfirmAction } from "@/Components/MakerChecker/confirmActionText";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { DataTable } from "@/Components/Common/DataTable";
import { Modal } from "@/Components/Common/Modal";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { matchesAction } from "@/Utils/Lib/actionAliases";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { useAuth } from "@/Hooks/useAuth";

// Permission gate off the login menu_array, matched by menu name. The new
// onboarding screens' menu names aren't registered in the sidebar data yet;
// when no menu of that name exists at all we don't hide the buttons (the
// server still enforces every permission) — once a menu IS registered, its
// actions decide.
export function useMenuPermission(menuName) {
  const menus = useSelector((state) => state.menu.menuArray);
  return useCallback(
    (action) => {
      const matching = (menus ?? []).filter((m) => new RegExp(`^(?:${menuName})$`, "i").test(String(m?.menu_name).trim()));
      if (matching.length === 0) return true;
      return matching.some((m) => (m.actions ?? []).some((a) => matchesAction(a?.action_name ?? a?.name, action)));
    },
    [menus, menuName],
  );
}

// Status/Process Status/Authorization Status as three separate columns —
// the same convention every other maker-checker list in the app uses
// (Institution Branding/Channel, Onboarding Configuration, Customer
// Onboarding, ...).
const statusColumns = (t) => [
  { key: "status_name", label: t("common:status"), render: (row) => <StatusBadge status={String(row.status_name ?? "-")} /> },
  { key: "process_status_name", label: t("common:processStatus"), render: (row) => <StatusBadge status={String(row.process_status_name ?? "-")} /> },
  { key: "auth_status", label: t("common:authorizationStatus"), render: (row) => <StatusBadge status={String(row.auth_status ?? "-")} /> },
];

// One reusable maker-checker list for every new onboarding-configuration
// screen (definitions, versions, KYC schemes): loads `api.list`, live-updates,
// filters by status/search, renders the shared RowActions column and the
// confirm / pending-diff / audit dialogs. Screen-specific behavior is
// injected: `onEdit` (open the screen's editor), `canEditRow`, `renderExtra`
// (extra per-row buttons), `renderView`, `describeRow`.
export function LifecycleList({
  title,
  subtitle,
  api,
  menuName,
  columns = [],
  filter = {},
  reloadKey = 0,
  toolbar = null,
  addButton = null,
  onEdit,
  onView,
  canEditRow = () => true,
  canDeleteRow = () => true,
  canDeactivateRow = () => true,
  renderExtra,
  renderView,
  describeRow = (row) => row?.name ?? String(row?.id),
  auditFields: auditFieldsProp,
  emptyTitle,
  onChanged,
}) {
  const { t } = useTranslation(["onboarding", "common"]);
  const auditFields = auditFieldsProp ?? [["code", t("onboarding:code")], ["name", t("onboarding:name")]];
  const can = useMenuPermission(menuName);
  const username = useAuth((state) => state.user?.username);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("all");
  const [view, setView] = useState(null);
  const [audit, setAudit] = useState(null);
  const [action, setAction] = useState(null);
  const [pending, setPending] = useState(false);
  const filterKey = JSON.stringify(filter);

  const pendingInfo = usePendingChanges(
    api.pending,
    action?.row?.id ?? null,
    Boolean(action) && ["auth", "deauth", "deleteAuth"].includes(action?.type),
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.list({ page, limit, ...JSON.parse(filterKey) });
      setRows(rowsOf(response));
      setPagination(response?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [api, page, limit, filterKey]);
  useEffect(() => {
    void load();
  }, [load, reloadKey]);
  useLiveChannel(api.listPath, () => void load());

  const visible = useMemo(
    () =>
      rows.filter(
        (row) =>
          (tab === "all" || statusBucket(row) === tab) && JSON.stringify(row).toLowerCase().includes(search.toLowerCase()),
      ),
    [rows, tab, search],
  );

  const run = async () => {
    setPending(true);
    try {
      const payload = { id: action.row.id, narration: action.reason || "" };
      const verb = { deleteAuth: "deleteAuth" }[action.type] ?? action.type;
      const response = await api[verb](payload);
      notifications.success(apiMessage(response, t("onboarding:actionCompleted", { title })));
      setAction(null);
      await load();
      onChanged?.(action.type, action.row);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setPending(false);
    }
  };

  const tableColumns = [
    ...columns,
    ...statusColumns(t),
    {
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (row) => {
        const buttons = getMakerCheckerButtons(row, {
          canAdd: can("Add"),
          canEdit: can("Edit"),
          canAuthorize: can("Authorize"),
          canDelete: can("Delete"),
          canChangeStatus: can("Deactivate") || can("Reactivate"),
        });
        // Frozen content: an approved/pending configuration can't be edited
        // in place, and a screen may forbid delete/deactivate for a row.
        if (!canEditRow(row)) buttons.edit = false;
        if (!canDeleteRow(row)) buttons.delete = false;
        if (!canDeactivateRow(row)) buttons.deactivate = false;
        // A checker must be a different user from the maker (guide §12): the
        // server refuses "You Cannot Authorize Your Own Request", so don't offer it.
        if (username && row.updated_by === username) {
          buttons.authorize = false;
          buttons.deauthorize = false;
        }
        const pendingType = buttons.isPendingDelete ? "deleteAuth" : "auth";
        return (
          <div className="flex items-center justify-center gap-1">
            <RowActions
              buttons={buttons}
              onView={() => (onView ? onView(row) : setView(row))}
              onEdit={() => onEdit?.(row)}
              onAudit={() => setAudit(row)}
              onSubmit={() => setAction({ type: "submit", row, label: t("common:submit"), reason: "" })}
              onAuthorize={() => setAction({ type: pendingType, row, label: t("common:authorize"), reason: "" })}
              onDeauthorize={() => setAction({ type: "deauth", row, label: t("onboarding:reject"), reason: "" })}
              onDeactivate={() => setAction({ type: "deactivate", row, label: t("common:deactivate"), reason: "" })}
              onReactivate={() => setAction({ type: "reactivate", row, label: t("common:reactivate"), reason: "" })}
              onDelete={() => setAction({ type: "delete", row, label: t("common:delete"), reason: "" })}
            />
            {renderExtra?.(row, { reload: load, setAction })}
          </div>
        );
      },
    },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">{title}</h1>
          {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {toolbar}
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
          searchPlaceholder={t("onboarding:searchTitle", { title: title.toLowerCase() })}
          actions={addButton && can("Add") ? addButton : null}
          bare
        />
        <DataTable
          columns={tableColumns}
          rows={visible}
          rowKey={(row) => row.id}
          isLoading={loading}
          title={title}
          emptyTitle={emptyTitle ?? t("onboarding:noTitleFound", { title: title.toLowerCase() })}
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

      {view && (
        <Modal open onClose={() => setView(null)} title={t("onboarding:viewTitle", { title })} size="sm">
          {renderView ? (
            renderView(view)
          ) : (
            // Same label/value card grid every other master's View modal uses
            // (CustomerMasterConfigResource, ...), not a raw JSON dump —
            // auditFields already gives every screen's own field list.
            <dl className="grid gap-3">
              {[...auditFields, ["status_name", t("common:status")], ["process_status_name", t("common:processStatus")], ["auth_status", t("common:authorizationStatus")]].map(
                ([key, label]) => (
                  <div key={key} className="rounded-xl border p-3">
                    <dt className="text-xs text-muted-foreground">{label}</dt>
                    <dd className="text-sm font-semibold">{view[key] ?? "-"}</dd>
                  </div>
                ),
              )}
            </dl>
          )}
        </Modal>
      )}
      {audit && (
        <AuditModal
          title={describeRow(audit)}
          fields={auditFields}
          onClose={() => setAudit(null)}
          fetchAudit={(p, l) => api.audit({ id: audit.id, page: p, limit: l }).then(mapAuditResponse)}
        />
      )}
      {action && (
        <ConfirmDialog
          open
          title={`${action.label} ${title}`}
          description={describeConfirmAction(action.type, describeRow(action.row))}
          confirmLabel={action.label}
          destructive={["deauth", "delete", "deleteAuth"].includes(action.type)}
          confirmDisabled={action.type === "deauth" && !action.reason?.trim()}
          pending={pending}
          onClose={() => setAction(null)}
          onConfirm={() => void run()}
        >
          {["auth", "deauth", "deleteAuth"].includes(action.type) && <PendingChangesDiff {...pendingInfo} />}
          {action.type === "submit" && (
            <dl className="mt-1 grid gap-2">
              <p className="text-xs font-semibold text-muted-foreground">{t("onboarding:submitPreview")}</p>
              {auditFields.map(([key, label]) => (
                <div key={key} className="rounded-xl border border-border p-2.5">
                  <dt className="text-[10px] font-bold uppercase text-muted-foreground">{label}</dt>
                  <dd className="mt-0.5 text-sm font-semibold text-slate-700">{action.row?.[key] ?? "-"}</dd>
                </div>
              ))}
            </dl>
          )}
          <textarea
            className="mt-3 min-h-20 w-full rounded-xl border p-3"
            value={action.reason ?? ""}
            onChange={(e) => setAction({ ...action, reason: e.target.value })}
            placeholder={action.type === "deauth" ? t("onboarding:rejectReasonRequired") : t("onboarding:narration")}
          />
        </ConfirmDialog>
      )}
    </div>
  );
}
