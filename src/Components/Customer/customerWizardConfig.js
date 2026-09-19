import { useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { indvProfileApi } from "@/Services/Customer/customer.api";
import { usePartyTypes, useOwnershipTypes } from "@/Hooks/Master/masterHooks";
import { notifications } from "@/Utils/Lib/notifications";
import { rowsOf } from "./customerWizardShared";

// The self-onboarding customer never picks their own institution — the
// frontend already knows which institution it's serving (its own
// config/subdomain), carried through the logged-in maker's own session:
// auth.service.js's parseSessionResponse stores the whole `user_details`
// object verbatim as `user` in Redux (AuthToken.js's state.token.user), and
// a real /user/login response already has `inst_profile_id` on it
// (data[0].user_details.inst_profile_id) — just read it.
export function useCustomerInstProfileId() {
  return useSelector((state) => state.token?.user?.inst_profile_id ?? null);
}

// Scans a master list's rows for the one whose name/code (case-insensitive)
// matches `target` — same "field names aren't fixed across masters" scan
// AcctConfigResource.jsx's own firstMatchingKey/optionOf uses, since
// party_type/ownership rows don't have a single guaranteed field name.
function firstMatchingKey(item, patterns) {
  const keys = Object.keys(item ?? {});
  for (const pattern of patterns) {
    const key = keys.find((k) => pattern.test(k));
    if (key && item[key] != null && item[key] !== "") return item[key];
  }
  return undefined;
}
function findByNameOrCode(list, target) {
  const wanted = String(target).toLowerCase();
  return (list ?? []).find((item) => {
    const name = firstMatchingKey(item, [/^name$/i, /_name$/i]);
    const code = firstMatchingKey(item, [/^code$/i, /_code$/i]);
    return String(name ?? "").toLowerCase() === wanted || String(code ?? "").toLowerCase() === wanted;
  });
}

// Resolves the fixed party_type_id (CUSTOMER) / ownership_id (INDIVIDUAL)
// ids this wizard always sends — never hardcoded numeric ids, since they
// aren't guaranteed stable across environments; resolved at runtime from
// the same master lists CustomerResource.jsx's own Add/Edit form already
// fetches. Fails loud (a notifications.error) rather than silently
// guessing when no exact match exists.
export function useCustomerPartyOwnershipIds(enabled = true) {
  const { partyTypes = [], error: partyTypesError } = usePartyTypes(enabled);
  const { ownershipTypes = [], error: ownershipTypesError } = useOwnershipTypes(enabled);

  useEffect(() => {
    if (partyTypesError) notifications.error(partyTypesError.message);
  }, [partyTypesError]);
  useEffect(() => {
    if (ownershipTypesError) notifications.error(ownershipTypesError.message);
  }, [ownershipTypesError]);

  const partyTypeId = useMemo(() => {
    if (!enabled || partyTypes.length === 0) return null;
    const match = findByNameOrCode(partyTypes, "CUSTOMER");
    if (!match) {
      notifications.error("Could not resolve the CUSTOMER party type — check master data.");
      return null;
    }
    return match.id;
  }, [enabled, partyTypes]);

  const ownershipId = useMemo(() => {
    if (!enabled || ownershipTypes.length === 0) return null;
    const match = findByNameOrCode(ownershipTypes, "INDIVIDUAL");
    if (!match) {
      notifications.error("Could not resolve the INDIVIDUAL ownership type — check master data.");
      return null;
    }
    return match.id;
  }, [enabled, ownershipTypes]);

  return { partyTypeId, ownershipId, loading: enabled && (partyTypes.length === 0 || ownershipTypes.length === 0) };
}

// Loads the whole wizard's shape once at the very start of the wizard, per
// the redesign handoff — ownership sub types (filtered to what this
// institution actually accepts), identification/address types (with
// front/back/mandatory/same-as rules), employment statuses, document
// requirements + document types. Re-fetches if `ownershipSubTypeId`
// changes (the optional narrower re-call the handoff describes); passing
// none just returns everything unfiltered.
export function useWizardConfig(instProfileId, ownershipSubTypeId) {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (instProfileId == null) return;
    let cancelled = false;
    setLoading(true);
    indvProfileApi()
      .wizardConfig({ inst_profile_id: instProfileId, ...(ownershipSubTypeId ? { ownership_sub_type_id: ownershipSubTypeId } : {}) })
      .then((r) => {
        if (cancelled) return;
        setConfig(rowsOf(r)[0] ?? {});
        setError(null);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e);
        notifications.error(e.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instProfileId, ownershipSubTypeId]);

  return {
    config: config ?? {},
    ownershipSubTypes: config?.ownership_sub_types ?? [],
    identificationTypes: config?.identification_types ?? [],
    addressTypes: config?.address_types ?? [],
    employmentStatuses: config?.employment_statuses ?? [],
    documentRequirements: config?.document_requirements ?? [],
    documentTypes: config?.document_types ?? [],
    loading,
    error,
  };
}

// Looks up one wizard_config.employment_statuses row by the id the customer
// picked on the Employment step (employment_id key, per customerFields.jsx's
// LOOKUP_OPTIONS idKey override).
function findEmploymentRow(employmentStatuses, employmentId) {
  if (employmentId == null || employmentId === "") return null;
  return (employmentStatuses ?? []).find((row) => String(row.employment_id ?? row.id) === String(employmentId)) ?? null;
}

// Employer-detail fields (employer name/address/contact) on the Employment
// step should only render when the chosen row's own
// is_employer_details_required flag says so — see AddCustomerWizard.jsx's
// bug fix comment.
export function employmentRequiresEmployerDetails(employmentStatuses, employmentId) {
  return Boolean(findEmploymentRow(employmentStatuses, employmentId)?.is_employer_details_required);
}

// Server rule: ownership_sub_type_id is required whenever the institution
// has ANY enabled sub-type — mirror that client-side so the customer never
// reaches submit only to be rejected there.
export function isSubTypeRequired(ownershipSubTypes) {
  return (ownershipSubTypes ?? []).length > 0;
}

// Server rule: employer_name is required once the chosen employment status
// says employer details are needed — same condition
// employmentRequiresEmployerDetails already gates the fields' visibility on.
export function employerNameMissing(employmentStatuses, employmentId, employerName) {
  return employmentRequiresEmployerDetails(employmentStatuses, employmentId) && !employerName;
}

// document_requirements' document_category ("ADDRESS_PROOF") and
// document_types' category ("ADDRESS") name the same real-world category
// under two different strings — confirmed by the backend team. Treat them
// as equal everywhere a document row is matched against its category.
const CATEGORY_ALIASES = { ADDRESS_PROOF: "ADDRESS", ADDRESS: "ADDRESS" };
export function sameDocumentCategory(a, b) {
  if (a == null || b == null) return false;
  const normalize = (v) => CATEGORY_ALIASES[String(v).toUpperCase()] ?? String(v).toUpperCase();
  return normalize(a) === normalize(b);
}

// Business Details is only relevant when the chosen employment status looks
// self-employed/business/professional — wizard_config doesn't carry an
// explicit flag for this, so (per the handoff's own fallback) match a
// case-insensitive substring against the row's name/code.
export function isBusinessEmployment(employmentStatuses, employmentId) {
  const row = findEmploymentRow(employmentStatuses, employmentId);
  if (!row) return false;
  const name = String(row.name ?? row.code ?? "").toUpperCase();
  return /SELF[\s_-]?EMPLOYED|BUSINESS|PROFESSIONAL/.test(name);
}

// IF_FOREIGNER document condition — matches the chosen ownership_sub_type
// row's name/code against the same NRI/PIO/OCI/FOREIGN_NATIONAL categories
// the original onboarding handoff called out.
export function isForeignOwnershipSubType(ownershipSubTypes, subTypeId) {
  if (subTypeId == null || subTypeId === "") return false;
  const row = (ownershipSubTypes ?? []).find((t) => String(t.id ?? t.ownership_sub_type_id) === String(subTypeId));
  if (!row) return false;
  const name = String(row.name ?? row.code ?? "").toUpperCase();
  return /\bNRI\b|\bPIO\b|\bOCI\b|FOREIGN[\s_-]?NATIONAL|FOREIGNER/.test(name);
}

// GUARDIAN / NOMINEE relationship-type matching — same name/code
// case-insensitive substring scan, used by the Relationships step (Guardian
// sub-block) and the Documents step's IF_NOMINEE_ADDED condition.
export function isGuardianRelationshipType(relationshipTypes, relationshipTypeId) {
  const row = (relationshipTypes ?? []).find((t) => String(t.id) === String(relationshipTypeId));
  return /GUARDIAN/.test(String(row?.name ?? row?.code ?? "").toUpperCase());
}
export function isNomineeRelationshipType(relationshipTypes, relationshipTypeId) {
  const row = (relationshipTypes ?? []).find((t) => String(t.id) === String(relationshipTypeId));
  return /NOMINEE/.test(String(row?.name ?? row?.code ?? "").toUpperCase());
}

// Evaluates one document_requirements row's condition_rule (CONDITIONAL
// requirement_type only) against the wizard's current state.
export function evaluateDocumentCondition(rule, ctx) {
  switch (rule) {
    case "AGE_LT_18":
      return ctx.age != null && ctx.age < 18;
    case "IF_FOREIGNER":
      return Boolean(ctx.isForeigner);
    case "IF_NOMINEE_ADDED":
      return Boolean(ctx.hasNominee);
    default:
      return true;
  }
}
