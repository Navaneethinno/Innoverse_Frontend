import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/Hooks/useAuth";
import { Plus } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { StatusFilterTabs, statusBucket } from "@/Components/Common/StatusFilterTabs";
import { Modal } from "@/Components/Common/Modal";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { RowActions } from "@/Components/Common/RowActions";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { AuditModal } from "@/Components/Common/AuditModal";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { notifications, apiMessage } from "@/Utils/Lib/notifications";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePartyTypes, useOwnershipTypes } from "@/Hooks/Master/masterHooks";
import { masterApis, onboardingDefinitionApi, rowsOf } from "@/Services/Onboarding/onboarding.api";
import { useMenuPermission } from "./LifecycleList";
import { useOnboardingCatalog } from "./onboardingHooks";
import { OnboardingDefinitionWizard } from "./OnboardingDefinitionWizard";

const pendingApi = ({ id }) => onboardingDefinitionApi.pending({ id });

// A customer type = the definition, full stop (Onboarding_Configuration_
// API.md §8.1) — no separate "version" any more, so this is now an
// ordinary single-entity maker-checker list: same RowActions +
// getMakerCheckerButtons() + ConfirmDialog + PendingChangesDiff + AuditModal
// pattern as Kinship or any other master, just with its own "Edit" opening
// the configuration wizard instead of a plain field form. Editing an Active
// row is exactly that "reopen for reconfiguration" action (guide §8.4/§10),
// so it needs no special-casing here — getMakerCheckerButtons already
// grants Edit on Active, and the wizard itself does the reopen.
function DefinitionRowActions({ row, can, onOpen, onRefresh }) {
  const [action, setAction] = useState(null); // { method, label }
  const [audit, setAudit] = useState(false);
  const [narration, setNarration] = useState("");
  const [working, setWorking] = useState(false);

  const username = useAuth((state) => state.user?.username);
  const buttons = getMakerCheckerButtons(row, {
    canAdd: can("Add"),
    canEdit: can("Edit"),
    canAuthorize: can("Authorize"),
    canChangeStatus: can("Deactivate") || can("Reactivate"),
    canDelete: can("Delete"),
  });
  // A checker must be a different user from the maker (server refuses
  // "cannot authorise own"), same check as LifecycleList.jsx.
  if (username && row.updated_by === username) {
    buttons.authorize = false;
    buttons.deauthorize = false;
  }

  const pendingInfo = usePendingChanges(pendingApi, row.id, !!action && ["auth", "deauth", "deleteAuth"].includes(action.method));

  const execute = async () => {
    if (action.method === "deauth" && !narration.trim()) {
      notifications.error("A reason is required to reject this");
      return;
    }
    setWorking(true);
    try {
      const payload = { id: row.id, ...(narration.trim() ? { narration: narration.trim() } : {}) };
      const response = await onboardingDefinitionApi[action.method](payload);
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
    <div className="flex items-center justify-center gap-1">
      <RowActions
        buttons={buttons}
        onView={() => onOpen(row, { forceReadOnly: true })}
        onEdit={buttons.edit ? () => onOpen(row) : undefined}
        onAudit={() => setAudit(true)}
        onSubmit={buttons.submitDraft ? () => setAction({ method: "submit", label: "Submit" }) : undefined}
        onAuthorize={() => setAction({ method: pendingMethod, label: "Authorize" })}
        onDeauthorize={() => setAction({ method: "deauth", label: "Reject" })}
        onDeactivate={() => setAction({ method: "deactivate", label: "Deactivate" })}
        onReactivate={() => setAction({ method: "reactivate", label: "Reactivate" })}
        onDelete={() => setAction({ method: "delete", label: "Delete" })}
      />
      <ConfirmDialog
        open={!!action}
        title={`${action?.label ?? "Action"} onboarding configuration`}
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
          title={row.name}
          fields={[
            ["minor_age_years", "Minor age"],
            ["home_country_id", "Home country"],
            ["kyc_group_id", "KYC scheme"],
            ["effective_from", "Effective from"],
          ]}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            onboardingDefinitionApi.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </div>
  );
}

const emptyForm = { code: "", name: "", description: "", combination: "", ownership_sub_type_id: "" };

export function OnboardingConfigurationPage() {
  const navigate = useNavigate();
  // "Onboarding Configuration" is the menu's real, current name (confirmed
  // in the sidebar) — the other alternatives are kept only in case an
  // institution's menu still uses an older name. Without a match here,
  // useMenuPermission falls back to permissive (every button shown to
  // everyone), which is what was silently happening before this menu name
  // was added: none of the old alternatives matched it.
  const can = useMenuPermission("Onboarding Configuration|Individual Type Config|Onboarding Definition|Customer Type");
  const catalog = useOnboardingCatalog();
  const { partyTypes = [] } = usePartyTypes(true);
  const { ownershipTypes = [] } = useOwnershipTypes(true);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [subTypes, setSubTypes] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [wizard, setWizard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await onboardingDefinitionApi.list({ page, limit });
      setRows(rowsOf(response));
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
  useLiveChannel(onboardingDefinitionApi.listPath, () => void load());

  useEffect(() => {
    masterApis.ownership_sub_type
      .list({ page: 1, limit: 200 })
      .then((r) => setSubTypes(rowsOf(r).filter((s) => Number(s.status) === 1)))
      .catch(() => setSubTypes([]));
  }, []);

  // Only the combinations the platform has enabled can be configured — today
  // just Customer × Individual (guide §6).
  const combinations = useMemo(
    () =>
      (catalog?.onboarding_combinations ?? [])
        .filter((c) => c.is_enabled)
        .map((c) => ({
          value: `${c.party_type_id}:${c.ownership_id}`,
          label: `${partyTypes.find((p) => String(p.id) === String(c.party_type_id))?.name ?? c.party_type_id} × ${ownershipTypes.find((o) => String(o.id) === String(c.ownership_id))?.name ?? c.ownership_id}`,
          party_type_id: c.party_type_id,
          ownership_id: c.ownership_id,
        })),
    [catalog, partyTypes, ownershipTypes],
  );
  const chosen = combinations.find((c) => c.value === form.combination);
  const subTypeOptions = subTypes
    .filter((s) => !chosen || String(s.ownership_id) === String(chosen.ownership_id))
    .map((s) => ({ value: s.id, label: s.name }));

  const create = async () => {
    // Sub type is optional now (guide §4) — an ownership without sub-typed
    // customer types has none to pick, and even one that does may allow
    // "no sub type". The backend still refuses with its own message
    // ("This Ownership Has Sub Types: Choose One") when one is required.
    if (!form.code.trim() || !form.name.trim() || !chosen) {
      notifications.error("Code, name and combination are required");
      return;
    }
    setSaving(true);
    try {
      // Basics (minor_age_years, home_country_id, kyc_group_id,
      // effective_from) are filled in inside the wizard's own Basics step
      // right after this, via `edit`, rather than crowding this modal —
      // is_draft:true here just lands the identity in Draft so save_config
      // can build its configuration next (guide §8.3).
      const response = await onboardingDefinitionApi.add({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim().replace(/\n{3,}/g, "\n\n"),
        party_type_id: chosen.party_type_id,
        ownership_id: chosen.ownership_id,
        ...(form.ownership_sub_type_id ? { ownership_sub_type_id: Number(form.ownership_sub_type_id) } : {}),
        is_draft: true,
      });
      notifications.success(apiMessage(response, "Customer type created"));
      setOpen(false);
      setForm(emptyForm);
      await load();
      const created = rowsOf(response)[0];
      if (created) setWizard({ definition: created });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  // Same StatusFilterTabs + search filtering every other maker-checker
  // list uses (CustomerMasterConfigResource, InstitutionBrandingPage, ...)
  // rather than a page-specific tab bar.
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
      key: "name",
      label: "Customer type",
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div className="font-semibold">{r.name}</div>
          <div className="font-mono text-[11px] text-slate-400">{r.code}</div>
          {r.description && <div className="mt-0.5 max-w-[260px] truncate text-[11px] text-slate-500" title={r.description}>{r.description}</div>}
        </div>
      ),
    },
    {
      key: "ownership_sub_type_name",
      label: "Sub type",
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div>{r.ownership_sub_type_name ?? "-"}</div>
          <div className="text-[11px] text-slate-400">{r.party_type_name ?? "-"} × {r.ownership_name ?? "-"}</div>
          <div className="text-[11px] text-slate-400">{r.inst_profile_name ?? "-"}</div>
        </div>
      ),
    },
    {
      key: "status_name",
      label: "Status",
      sortValue: (r) => r.status_name ?? "",
      render: (r) => <StatusBadge status={String(r.status_name ?? "-")} />,
    },
    {
      key: "process_status_name",
      label: "Process Status",
      sortValue: (r) => r.process_status_name ?? "",
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} /> : "-"),
    },
    {
      key: "auth_status",
      label: "Authorization Status",
      sortValue: (r) => r.auth_status ?? "",
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} /> : "-"),
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (r) => (
        <DefinitionRowActions
          row={r}
          can={can}
          onOpen={(row, opts) => setWizard({ definition: row, forceReadOnly: Boolean(opts?.forceReadOnly) })}
          onRefresh={load}
        />
      ),
    },
  ];

  const addAction = can("Add") ? (
    <button
      type="button"
      onClick={() => {
        setForm(emptyForm);
        setOpen(true);
      }}
      className="flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white"
    >
      <Plus size={14} /> Add onboarding configuration
    </button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">Onboarding Configuration</h1>
        <p className="mt-1 text-xs text-slate-500">
          Each customer type is one record — its identity, its configuration and its maker-checker state together. Reopening an approved one for changes moves it back to Draft in place; there is no separate version.
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
          searchPlaceholder="Search onboarding configurations..."
          actions={addAction}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          isLoading={loading}
          title="Customer Types"
          emptyTitle="No customer types yet"
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add onboarding configuration"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold text-slate-500">
              Cancel
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void create()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving && <Spinner size={13} />}
              Create
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <label className="text-sm font-semibold text-slate-700">
            Code
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono text-sm" placeholder="CUSTOMER_INDIVIDUAL_STUDENT" />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">Letters, digits and underscore. Cannot be changed later.</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
            <span className="mt-1 block text-[11px] font-normal text-slate-400">{form.description.length}/250</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Party type × Ownership
            <FilterSelect className="mt-1.5" value={form.combination} onChange={(v) => setForm({ ...form, combination: v, ownership_sub_type_id: "" })} options={[{ value: "", label: "Select combination" }, ...combinations]} />
          </label>
          {subTypeOptions.length > 0 && (
            <label className="text-sm font-semibold text-slate-700">
              Sub type
              <FilterSelect className="mt-1.5" addAction={{ label: "Add ownership sub type", onClick: () => navigate("/ownershipsubtype") }} value={form.ownership_sub_type_id} onChange={(v) => setForm({ ...form, ownership_sub_type_id: v })} options={[{ value: "", label: "No sub type" }, ...subTypeOptions]} />
              <span className="mt-1 block text-[11px] font-normal text-slate-400">Optional — leave unset unless this combination requires one.</span>
            </label>
          )}
        </div>
      </Modal>

      {wizard && (
        <OnboardingDefinitionWizard
          definition={wizard.definition}
          forceReadOnly={wizard.forceReadOnly}
          onClose={() => setWizard(null)}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}
