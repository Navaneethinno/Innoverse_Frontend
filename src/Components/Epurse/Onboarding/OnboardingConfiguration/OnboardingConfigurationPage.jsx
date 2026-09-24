import { useNavigate } from "react-router-dom";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
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
import { masterApis, onboardingDefinitionApi, rowsOf } from "@/Services/Epurse/onboarding.api";
import { useMenuPermission } from "./LifecycleList";
import { useOnboardingCatalog, useOnboardingMasters } from "./onboardingHooks";
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
  const { t } = useTranslation(["onboarding", "common"]);
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
      notifications.success(apiMessage(response, t("onboarding:actionSuccessful", { action: action.label })));
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
        onSubmit={buttons.submitDraft ? () => setAction({ method: "submit", label: t("common:submit") }) : undefined}
        onAuthorize={() => setAction({ method: pendingMethod, label: t("common:authorize") })}
        onDeauthorize={() => setAction({ method: "deauth", label: t("onboarding:reject") })}
        onDeactivate={() => setAction({ method: "deactivate", label: t("common:deactivate") })}
        onReactivate={() => setAction({ method: "reactivate", label: t("common:reactivate") })}
        onDelete={() => setAction({ method: "delete", label: t("common:delete") })}
      />
      <ConfirmDialog
        open={!!action}
        title={t("onboarding:actionOnboardingConfiguration", { action: action?.label ?? t("common:actions") })}
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
            <p className="text-xs font-semibold text-muted-foreground">{t("onboarding:submitPreview")}</p>
            {[["name", t("onboarding:name")], ["code", t("onboarding:code")], ["party_type_name", t("onboarding:partyType")], ["ownership_name", t("onboarding:ownership")], ["ownership_sub_type_name", t("onboarding:subType")]].map(([key, label]) => (
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
          placeholder={action?.method === "deauth" ? t("onboarding:reasonRequired") : t("onboarding:narration")}
          className="mt-3 min-h-20 w-full rounded-xl border border-border p-3 text-sm"
        />
      </ConfirmDialog>
      {audit && (
        <AuditModal
          title={row.name}
          fields={[
            ["minor_age_years", t("onboarding:minorAge")],
            ["home_country_id", t("onboarding:homeCountry")],
            ["kyc_group_id", t("onboarding:kycScheme")],
            ["effective_from", t("onboarding:effectiveFrom")],
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

// minor_age_years/home_country_id/kyc_group_id/effective_from are Basics
// fields the API requires on this SAME `add` call (Onboarding_Configuration_
// API.md §8.3-8.4) — there is no separate "create draft, then set basics"
// step, so this dialog has to collect them up front instead of leaving them
// to the wizard's own Basics step (which only ever runs after the record
// already exists).
const emptyForm = {
  code: "",
  name: "",
  description: "",
  combination: "",
  ownership_sub_type_id: "",
  minor_age_years: 18,
  home_country_id: "",
  kyc_group_id: "",
  effective_from: "",
};

export function OnboardingConfigurationPage() {
  const navigate = useNavigate();
  const { t } = useTranslation(["onboarding", "common"]);
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
  const [open, setOpen] = useState(false);
  // Only loaded while the create dialog is actually open — same masters
  // the wizard's own Basics step uses.
  const { countries, kycGroups } = useOnboardingMasters(open);
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [subTypes, setSubTypes] = useState([]);
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
    if (!form.minor_age_years || Number(form.minor_age_years) <= 0) {
      notifications.error("Minor age (years) is required");
      return;
    }
    setSaving(true);
    try {
      // Basics (minor_age_years, home_country_id, kyc_group_id,
      // effective_from) have to go on this SAME `add` call — the API has no
      // separate "create draft, then set basics" step (guide §8.3-8.4), so
      // they can't be deferred to the wizard's own Basics step the way the
      // rest of the configuration is.
      const response = await onboardingDefinitionApi.add({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim().replace(/\n{3,}/g, "\n\n"),
        party_type_id: chosen.party_type_id,
        ownership_id: chosen.ownership_id,
        ...(form.ownership_sub_type_id ? { ownership_sub_type_id: Number(form.ownership_sub_type_id) } : {}),
        minor_age_years: Number(form.minor_age_years),
        ...(form.home_country_id ? { home_country_id: Number(form.home_country_id) } : {}),
        ...(form.kyc_group_id ? { kyc_group_id: Number(form.kyc_group_id) } : {}),
        ...(form.effective_from ? { effective_from: form.effective_from } : {}),
        is_draft: true,
      });
      notifications.success(apiMessage(response, t("onboarding:customerTypeCreated")));
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
  // list uses (CustomerMasterConfigResource, InstitutionBranding, ...)
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
      label: t("onboarding:customerType"),
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
      key: "ownership_sub_type_name",
      label: t("onboarding:subType"),
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div>{r.ownership_sub_type_name ?? "-"}</div>
          <div className="text-[11px] text-muted-foreground">{r.party_type_name ?? "-"} × {r.ownership_name ?? "-"}</div>
          <div className="text-[11px] text-muted-foreground">{r.inst_profile_name ?? "-"}</div>
        </div>
      ),
    },
    {
      key: "status_name",
      label: t("common:status"),
      sortValue: (r) => r.status_name ?? "",
      render: (r) => <StatusBadge status={String(r.status_name ?? "-")} />,
    },
    {
      key: "process_status_name",
      label: t("common:processStatus"),
      sortValue: (r) => r.process_status_name ?? "",
      render: (r) => (r.process_status_name ? <StatusBadge status={String(r.process_status_name)} /> : "-"),
    },
    {
      key: "auth_status",
      label: t("common:authorizationStatus"),
      sortValue: (r) => r.auth_status ?? "",
      render: (r) => (r.auth_status ? <StatusBadge status={String(r.auth_status)} /> : "-"),
    },
    {
      key: "actions",
      label: t("common:actions"),
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
      <Plus size={14} /> {t("onboarding:addOnboardingConfiguration")}
    </button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">{t("onboarding:onboardingConfigurationTitle")}</h1>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("onboarding:onboardingConfigurationSubtitle")}
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
          searchPlaceholder={t("onboarding:searchOnboardingConfigurations")}
          actions={addAction}
          bare
        />
        <DataTable
          columns={columns}
          rows={visible}
          rowKey={(r) => r.id}
          isLoading={loading}
          title={t("onboarding:customerTypes")}
          emptyTitle={t("onboarding:noCustomerTypesYet")}
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
        title={t("onboarding:addOnboardingConfiguration")}
        footer={
          <>
            <button type="button" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-bold text-muted-foreground">
              {t("common:cancel")}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void create()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving && <Spinner size={13} />}
              {t("onboarding:create")}
            </button>
          </>
        }
      >
        <div className="grid gap-4">
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:code")}
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono text-sm" placeholder="CUSTOMER_INDIVIDUAL_STUDENT" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:codeHint")}</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:name")}
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("common:description")}
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{form.description.length}/250</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:partyTypeOwnership")}
            <FilterSelect className="mt-1.5" value={form.combination} onChange={(v) => setForm({ ...form, combination: v, ownership_sub_type_id: "" })} options={[{ value: "", label: t("onboarding:selectCombination") }, ...combinations]} />
          </label>
          {subTypeOptions.length > 0 && (
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:subType")}
              <FilterSelect className="mt-1.5" addAction={{ label: t("onboarding:addOwnershipSubType"), onClick: () => navigate("/ownershipsubtype") }} value={form.ownership_sub_type_id} onChange={(v) => setForm({ ...form, ownership_sub_type_id: v })} options={[{ value: "", label: t("onboarding:noSubType") }, ...subTypeOptions]} />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:subTypeHint")}</span>
            </label>
          )}
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:minorAgeYears")}
            <input type="number" min={0} value={form.minor_age_years} onChange={(e) => setForm({ ...form, minor_age_years: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:minorAgeHint")}</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:homeCountry")}
            <FilterSelect className="mt-1.5" value={form.home_country_id} onChange={(v) => setForm({ ...form, home_country_id: v })} options={[{ value: "", label: t("onboarding:selectCountry") }, ...countries.map((c) => ({ value: c.id, label: c.name }))]} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:homeCountryHint")}</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:kycScheme")}
            <FilterSelect className="mt-1.5" addAction={{ label: t("onboarding:addKycScheme"), onClick: () => navigate("/kycschemes") }} value={form.kyc_group_id} onChange={(v) => setForm({ ...form, kyc_group_id: v })} options={[{ value: "", label: t("onboarding:selectKycScheme") }, ...kycGroups.map((g) => ({ value: g.id, label: `${g.name} (${g.code})` }))]} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:kycSchemeHint")}</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:effectiveFrom")}
            <input type="date" value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
          </label>
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
