import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { PageTitle } from "@/Components/Common/PageTitle";
import { DateInput } from "@/Components/Common/DateInput";
import { InstitutionOnly } from "@/Components/Common/InstitutionOnly";
import { useOpenMenu } from "@/Components/Layout/Menu/menuContext";
import { useState } from "react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { useAuth } from "@/Hooks/useAuth";
import { Plus } from "lucide-react";
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
import { useDropdownRows } from "@/Hooks/Master/masterHooks";
import { corpMasterApis, corpOnboardingDefinitionApi, masterApis, onboardingDefinitionApi, rowsOf } from "@/Services/Epurse/onboarding.api";
import { usePagePermission } from "@/Hooks/usePermission";
import { useOnboardingMasters } from "./onboardingHooks";
import { useCorpOnboardingMasters } from "./corporateOnboardingHooks";
import { countryOption } from "@/Components/Common/countryOption";
import { OnboardingDefinitionWizard } from "./OnboardingDefinitionWizard";
import { CorporateOnboardingDefinitionWizard } from "./CorporateOnboardingDefinitionWizard";

import { Button } from "@/Components/Common/Button";
import { PartyTypeSelect, partyTypeBody, useIsMerchantModule } from "../../partyType";
import { UntranslatedConfirm, untranslatedOf } from "@/Components/Epurse/Settings/FormBuilder/Translations";
import { mergeStatusColumns } from "@/Components/MakerChecker/statusColumns";
// Individual and corporate customer types are one screen. Corporate has no
// sub type, minor age or KYC scheme; it is set by its company type instead.
const KINDS = {
  individual: { api: onboardingDefinitionApi, Wizard: OnboardingDefinitionWizard, useMasters: useOnboardingMasters, typeApi: masterApis.ownership_sub_type },
  corporate: { api: corpOnboardingDefinitionApi, Wizard: CorporateOnboardingDefinitionWizard, useMasters: useCorpOnboardingMasters, typeApi: corpMasterApis.corp_company_type },
};
// The page's texts that differ by kind (onboarding:<key>).
const TEXTS = {
  individual: { created: "customerTypeCreated", add: "addOnboardingConfiguration", title: "onboardingConfigurationTitle", subtitle: "onboardingConfigurationSubtitle", list: "customerTypes", empty: "noCustomerTypesYet", homeCountryHint: "homeCountryHint" },
  corporate: { created: "corporateCustomerTypeCreated", add: "addCorporateCustomerType", title: "corporateOnboardingConfigurationTitle", subtitle: "corporateOnboardingConfigurationSubtitle", list: "corporateCustomerTypes", empty: "noCorporateCustomerTypesYet", homeCountryHint: "corpHomeCountryHint" },
};

// A customer type = the definition, full stop (Onboarding_Configuration_
// API.md §8.1) — no separate "version" any more, so this is now an
// ordinary single-entity maker-checker list: same RowActions +
// getMakerCheckerButtons() + ConfirmDialog + PendingChangesDiff + AuditModal
// pattern as Kinship or any other master, just with its own "Edit" opening
// the configuration wizard instead of a plain field form. Editing an Active
// row is exactly that "reopen for reconfiguration" action (guide §8.4/§10),
// so it needs no special-casing here — getMakerCheckerButtons already
// grants Edit on Active, and the wizard itself does the reopen.
function DefinitionRowActions({ kind, row, can, onOpen, onRefresh }) {
  const k = KINDS[kind];
  const pendingApi = ({ id }) => k.api.pending({ id });
  const { t } = useAudienceTranslation(["onboarding", "common"]);
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

  // A submit refused for untranslated texts: asked, then sent again.
  const [untranslated, setUntranslated] = useState(null);
  const execute = async (confirmMissing = false) => {
    if (action.method === "deauth" && !narration.trim()) {
      notifications.error("A reason is required to reject this");
      return;
    }
    setWorking(true);
    try {
      const payload = { id: row.id, ...(narration.trim() ? { narration: narration.trim() } : {}), ...(confirmMissing ? { confirm_missing_translations: true } : {}) };
      let response;
      try {
        response = await k.api[action.method](payload);
      } catch (error) {
        const refusal = action.method === "submit" && untranslatedOf(error);
        if (!refusal) throw error;
        setUntranslated(refusal);
        return;
      }
      setUntranslated(null);
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
        permission={kind === "corporate" ? can : undefined}
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
      {untranslated && <UntranslatedConfirm refusal={untranslated} busy={working} onCancel={() => setUntranslated(null)} onConfirm={() => void execute(true)} />}
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
            {[["name", t("onboarding:name")], ["code", t("onboarding:code")], ["party_type_name", t("onboarding:partyType")], ...(kind === "corporate" ? [["company_type_name", t("onboarding:companyType")]] : [["ownership_name", t("onboarding:ownership")], ["ownership_sub_type_name", t("onboarding:subType")]])].map(([key, label]) => (
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
            ...(kind === "corporate" ? [] : [["minor_age_years", t("onboarding:minorAge")]]),
            ["home_country_id", t("onboarding:homeCountry")],
            ...(kind === "corporate" ? [] : [["kyc_group_id", t("onboarding:kycScheme")]]),
            ["effective_from", t("onboarding:effectiveFrom")],
          ]}
          onClose={() => setAudit(false)}
          fetchAudit={(page, limit) =>
            k.api.audit({ id: row.id, page, limit }).then((r) => ({
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
  party_type_id: "",
  ownership_sub_type_id: "",
  company_type_id: "",
  minor_age_years: 18,
  home_country_id: "",
  kyc_group_id: "",
  effective_from: "",
};

export function OnboardingConfigurationPage({ kind = "individual" }) {
  const k = KINDS[kind];
  const x = TEXTS[kind];
  const corporate = kind === "corporate";
  const openMenu = useOpenMenu();
  const { t } = useAudienceTranslation(["onboarding", "common"]);
  // "Onboarding Configuration" is the menu's real, current name (confirmed
  // in the sidebar) — the other alternatives are kept only in case an
  // institution's menu still uses an older name. Without a match here,
  // useMenuPermission falls back to permissive (every button shown to
  // everyone), which is what was silently happening before this menu name
  // was added: none of the old alternatives matched it.
  const can = usePagePermission("Onboarding Configuration");
  const isMerchant = useIsMerchantModule();
  const [open, setOpen] = useState(false);
  // Only loaded while the create dialog is actually open — same masters
  // the wizard's own Basics step uses.
  const { countries, kycGroups = [] } = k.useMasters(open);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [wizard, setWizard] = useState(null);

  const list = useServerList({ api: k.api.listPath, call: k.api.list });

  const load = list.reload;
  useLiveChannel(k.api.listPath, () => load());

  // Party type comes from the module (the API prefix) and ownership from
  // the menu (Individual), handoff 17: the one choice is the sub type, with
  // "No sub type" (null) as the default definition.
  const typeOptions = useDropdownRows(k.typeApi, open).map((s) => ({ value: s.id, label: s.name }));

  const create = async () => {
    if (corporate && (!form.code.trim() || !form.name.trim() || !form.company_type_id)) {
      notifications.error("Code, name and company type are required");
      return;
    }
    if (!form.code.trim() || !form.name.trim()) {
      notifications.error("Code and name are required");
      return;
    }
    if (!corporate && (!form.minor_age_years || Number(form.minor_age_years) <= 0)) {
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
      const response = await k.api.add({
        code: form.code.trim().toUpperCase(),
        name: form.name.trim(),
        description: form.description.trim().replace(/\n{3,}/g, "\n\n"),
        ...partyTypeBody(isMerchant, form.party_type_id),
        ...(corporate
          ? { company_type_id: Number(form.company_type_id) }
          : { ownership_sub_type_id: form.ownership_sub_type_id ? Number(form.ownership_sub_type_id) : null, minor_age_years: Number(form.minor_age_years) }),
        ...(form.home_country_id ? { home_country_id: Number(form.home_country_id) } : {}),
        ...(!corporate && form.kyc_group_id ? { kyc_group_id: Number(form.kyc_group_id) } : {}),
        ...(form.effective_from ? { effective_from: form.effective_from } : {}),
        is_draft: true,
      });
      notifications.success(apiMessage(response, t(`onboarding:${x.created}`)));
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


  const columns = mergeStatusColumns([
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
      key: corporate ? "company_type_name" : "ownership_sub_type_name",
      label: t(corporate ? "onboarding:partyCompanyType" : "onboarding:subType"),
      align: "left",
      render: (r) => (
        <div className="text-left">
          <div>{(corporate ? r.company_type_name : r.ownership_sub_type_name) ?? "-"}</div>
          <div className="text-[11px] text-muted-foreground">{r.party_type_name ?? "-"}{corporate ? "" : ` × ${r.ownership_name ?? "-"}`}</div>
          <InstitutionOnly><div className="text-[11px] text-muted-foreground">{r.inst_profile_name ?? "-"}</div></InstitutionOnly>
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
      key: "actions",
      label: t("common:actions"),
      sortable: false,
      render: (r) => (
        <DefinitionRowActions
          kind={kind}
          row={r}
          can={can}
          onOpen={(row, opts) => setWizard({ definition: row, forceReadOnly: Boolean(opts?.forceReadOnly) })}
          onRefresh={load}
        />
      ),
    },
  ]);

  const addAction = can("Add") ? (
    <Button
      size="xs"
      className="whitespace-nowrap"
      onClick={() => {
        setForm(emptyForm);
        setOpen(true);
      }}>
      <Plus size={14} /> {t(`onboarding:${x.add}`)}
    </Button>
  ) : null;

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{t(`onboarding:${x.title}`)}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(`onboarding:${x.subtitle}`)}
        </p>
      </div>
      <ListTable list={list} actions={addAction} columns={columns} rowKey={(r) => r.id} title={t(`onboarding:${x.list}`)} emptyTitle={t(`onboarding:${x.empty}`)} />

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t(`onboarding:${x.add}`)}
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("common:cancel")}
            </Button>
            <Button
              disabled={saving}
              onClick={() => void create()}
              className="flex"
            >
              {saving && <Spinner size={13} />}
              {t("onboarding:create")}
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:code")} <span className="text-red-500">*</span>
            <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "") })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 font-mono text-sm" placeholder={corporate ? "CUSTOMER_PRIVATE_LIMITED" : "CUSTOMER_INDIVIDUAL_STUDENT"} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:codeHint")}</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:name")} <span className="text-red-500">*</span>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("common:description")}
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={250} className="mt-1.5 min-h-20 w-full rounded-xl border p-3 text-sm" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{form.description.length}/250</span>
          </label>
          {isMerchant && <PartyTypeSelect value={form.party_type_id} onChange={(v) => setForm({ ...form, party_type_id: v })} />}
          {corporate ? (
            <label className="text-sm font-semibold text-slate-700">
              {t("onboarding:companyType")} <span className="text-red-500">*</span>
              <FilterSelect className="mt-1.5" addAction={{ label: t("onboarding:addCompanyType"), onClick: () => openMenu("companytype") }} value={form.company_type_id} onChange={(v) => setForm({ ...form, company_type_id: v })} options={[{ value: "", label: t("onboarding:selectCompanyType") }, ...typeOptions]} />
            </label>
          ) : (
            <>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:subType")}
            <FilterSelect className="mt-1.5" addAction={{ label: t("onboarding:addOwnershipSubType"), onClick: () => openMenu("ownershipsubtype") }} value={form.ownership_sub_type_id} onChange={(v) => setForm({ ...form, ownership_sub_type_id: v })} options={[{ value: "", label: t("onboarding:noSubTypeDefault") }, ...typeOptions]} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:subTypeHint")}</span>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:minorAgeYears")} <span className="text-red-500">*</span>
            <input type="number" min={0} value={form.minor_age_years} onChange={(e) => setForm({ ...form, minor_age_years: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:minorAgeHint")}</span>
          </label>
            </>
          )}
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:homeCountry")}
            <FilterSelect className="mt-1.5" value={form.home_country_id} onChange={(v) => setForm({ ...form, home_country_id: v })} options={[{ value: "", label: t("onboarding:selectCountry") }, ...countries.map(countryOption)]} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t(`onboarding:${x.homeCountryHint}`)}</span>
          </label>
          {!corporate && (
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:kycScheme")}
            <FilterSelect className="mt-1.5" addAction={{ label: t("onboarding:addKycScheme"), onClick: () => openMenu("kycschemes") }} value={form.kyc_group_id} onChange={(v) => setForm({ ...form, kyc_group_id: v })} options={[{ value: "", label: t("onboarding:selectKycScheme") }, ...kycGroups.map((g) => ({ value: g.id, label: `${g.name} (${g.code})` }))]} />
            <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("onboarding:kycSchemeHint")}</span>
          </label>
          )}
          <label className="text-sm font-semibold text-slate-700">
            {t("onboarding:effectiveFrom")}
            <DateInput value={form.effective_from} onChange={(e) => setForm({ ...form, effective_from: e.target.value })} className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm" />
          </label>
        </div>
      </Modal>

      {wizard && (
        <k.Wizard
          definition={wizard.definition}
          forceReadOnly={wizard.forceReadOnly}
          onClose={() => setWizard(null)}
          onSaved={() => load()}
        />
      )}
    </div>
  );
}
