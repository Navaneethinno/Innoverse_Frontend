import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
import { usePartyTypes } from "@/Hooks/Master/masterHooks";
import { corpOnboardingDefinitionApi, rowsOf } from "@/Services/Onboarding/onboarding.api";
import { useMenuPermission } from "./LifecycleList";
import { useCorpOnboardingCatalog, useCorpOnboardingMasters } from "./corporateOnboardingHooks";
import { CorporateOnboardingDefinitionWizard } from "./CorporateOnboardingDefinitionWizard";

const pendingApi = ({ id }) => corpOnboardingDefinitionApi.pending({ id });

// Corporate mirror of OnboardingConfigurationPage.jsx (Corporate_Onboarding_
// Configuration_API.md §4): a corporate customer type = institution × party
// type × company type, one maker-checker row with the same RowActions/
// ConfirmDialog/PendingChangesDiff/AuditModal pattern. No KYC group/minor
// age here — corporate definitions don't have a KYC-levels concept yet
// (guide §8), so the create dialog only collects the identity plus
// home_country_id/effective_from.
function DefinitionRowActions({ row, can, onOpen, onRefresh }) {
  const [action, setAction] = useState(null);
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
      const response = await corpOnboardingDefinitionApi[action.method](payload);
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
        {action?.method === "submit" && (
          <dl className="mt-1 grid gap-2">
            <p className="text-xs font-semibold text-muted-foreground">This is what will be submitted for review:</p>
            {[["name", "Name"], ["code", "Code"], ["party_type_name", "Party type"], ["company_type_name", "Company type"]].map(([key, label]) => (
              <div key={key} className="rounded-xl border border-border p-2.5">
                <dt className="text-[10px] font-bold uppercase text-muted-foreground">{label}</dt>
                <dd className="mt-0.5 text-sm font-semibold text-slate-700">{row?.[key] ?? "-"}</dd>
              </div>
            ))}
          </dl>
        )}
        <textarea
          value={narration}
          onChange={(e) => setNarration(e.target.value)}
          placeholder={action?.method === "deauth" ? "Reason (required)" : "Narration"}
          className="mt-3 min-h-20 w-full rounded-xl border border-border p-3 text-sm"
        />
      </ConfirmDialog>
      {audit && (
        <AuditModal
          title={row.name}
          fields={[
            ["home_country_id", "Home country"],
            ["effective_from", "Effective from"],
          ]}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            corpOnboardingDefinitionApi.audit({ id: row.id, page, limit }).then((r) => ({
              entries: Array.isArray(r?.data) ? r.data : [],
              totalPages: r?.pagination?.totalPages ?? 1,
            }))
          }
        />
      )}
    </div>
  );
}

const emptyForm = {
  code: "",
  name: "",
  description: "",
  party_type_id: "",
  company_type_id: "",
  home_country_id: "",
  effective_from: "",
};

export function CorporateOnboardingConfigurationPage() {
  const navigate = useNavigate();
  const can = useMenuPermission("Corporate Onboarding Configuration|Corporate Type Config|Corporate Onboarding Definition|Corporate Customer Type");
  const catalog = useCorpOnboardingCatalog();
  const { partyTypes = [] } = usePartyTypes(true);
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(false);
  const { masters, countries } = useCorpOnboardingMasters(open);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [wizard, setWizard] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await corpOnboardingDefinitionApi.list({ page, limit });
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
  useLiveChannel(corpOnboardingDefinitionApi.listPath, () => void load());

  // Only Customer/Merchant/Agent party types the platform has enabled can be
  // configured (guide §6's onboarding_combinations), same idea as the
  // individual page's combinations list but corporate has no ownership axis.
  const enabledPartyTypeIds = new Set((catalog?.onboarding_combinations ?? []).filter((c) => c.is_enabled).map((c) => String(c.party_type_id)));
  const partyTypeOptions = partyTypes
    .filter((p) => enabledPartyTypeIds.has(String(p.id)))
    .map((p) => ({ value: p.id, label: p.name }));
  const companyTypeOptions = (masters.corp_company_type ?? []).map((c) => ({ value: c.id, label: c.name }));

  const create = async () => {
    if (!form.code.trim() || !form.name.trim() || !form.party_type_id || !form.company_type_id) {
      notifications.error("Code, name, party type and company type are required");
      return;
    }
    setSaving(true);
    try {
      const response = await corpOnboardingDefinitionApi.add({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim().replace(/\n{3,}/g, "\n\n"),
        party_type_id: Number(form.party_type_id),
        company_type_id: Number(form.company_type_id),
        ...(form.home_country_id ? { home_country_id: Number(form.home_country_id) } : {}),
        ...(form.effective_from ? { effective_from: form.effective_from } : {}),
        is_draft: true,
      });
      notifications.success(apiMessage(response, "Corporate customer type created"));
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
          <div className="font-mono text-[11px] text-muted-foreground">{r.code}</div>
          {r.description && <div className="mt-0.5 max-w-[260px] truncate text-[11px] text-muted-foreground" title={r.description}>{r.description}</div>}
        </div>
      ),
    },
    {
      key: "company_type_name",
      label: "Party × Company type",
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div>{r.company_type_name ?? "-"}</div>
          <div className="text-[11px] text-muted-foreground">{r.party_type_name ?? "-"}</div>
          <div className="text-[11px] text-muted-foreground">{r.inst_profile_name ?? "-"}</div>
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
      <Plus size={14} /> Add corporate customer type
    </button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">Corporate Onboarding Configuration</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Each corporate customer type is institution × party type × company type — its identity, configuration and maker-checker state together.
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
          searchPlaceholder="Search corporate customer types..."
          actions={addAction}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          isLoading={loading}
          title="Corporate Customer Types"
          emptyTitle="No corporate customer types yet"
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
        title="Add corporate customer type"
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold text-muted-foreground">
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
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono text-sm" placeholder="CUSTOMER_PRIVATE_LIMITED" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Letters, digits and underscore. Cannot be changed later.</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Name
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Description
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{form.description.length}/250</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Party type
            <FilterSelect className="mt-1.5" value={form.party_type_id} onChange={(v) => setForm({ ...form, party_type_id: v })} options={[{ value: "", label: "Select party type" }, ...partyTypeOptions]} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Company type
            <FilterSelect className="mt-1.5" addAction={{ label: "Add company type", onClick: () => navigate("/companytype") }} value={form.company_type_id} onChange={(v) => setForm({ ...form, company_type_id: v })} options={[{ value: "", label: "Select company type" }, ...companyTypeOptions]} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Home country
            <FilterSelect className="mt-1.5" value={form.home_country_id} onChange={(v) => setForm({ ...form, home_country_id: v })} options={[{ value: "", label: "Select country" }, ...countries.map((c) => ({ value: c.id, label: c.name }))]} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">Required if a rule uses IS_FOREIGN_INCORPORATED.</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Effective from
            <input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
          </label>
        </div>
      </Modal>

      {wizard && (
        <CorporateOnboardingDefinitionWizard
          definition={wizard.definition}
          forceReadOnly={wizard.forceReadOnly}
          onClose={() => setWizard(null)}
          onSaved={() => void load()}
        />
      )}
    </div>
  );
}
