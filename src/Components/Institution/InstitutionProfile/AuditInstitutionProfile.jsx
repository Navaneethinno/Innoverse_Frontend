import { AuditModal } from "@/Components/Common/AuditModal";
import { mapInstitutionListResponse } from "@/Hooks/Institutions/institutionHooks";
import { institutionsApi } from "@/Services/Institutions/institutions.api";

// Relocated verbatim from Components/Institutions/InstitutionAuditModal.jsx
// to live alongside the rest of the InstitutionProfile feature files,
// matching payse's AuditInstitutions.jsx convention.
//
// Field labels/order confirmed against a real POST /institution/profile/audit
// response — see institutionHooks.js's mapInstitutionListResponse comment
// for the full envelope shape this was verified against.
const AUDIT_FIELDS = [
  ["code", "Code"],
  ["name", "Name"],
  ["type", "Type"],
  ["timezone", "Timezone"],
  ["date_format", "Date Format"],
  ["has_branch", "Has Branch"],
  ["max_branches_allowed", "Max Branches"],
  ["kyc_enabled", "KYC Enabled"],
  ["total_kyc_levels", "Total KYC Levels"],
];

// No /pending call here — each audit entry already carries its own
// `changes` array (see AuditModal.jsx), so the diff comes straight from
// the audit history itself instead of a second request. /pending stays in
// use for AuthInstitutionProfile/DeauthInstitutionProfile, which are
// asking about a currently-open request, not history.
export function AuditInstitutionProfile({ institution, institutionId, onClose }) {
  return (
    <AuditModal
      title={institution?.name ?? institution?.code ?? `#${institutionId}`}
      fields={AUDIT_FIELDS}
      onClose={onClose}
      fetchAudit={(page, limit) =>
        institutionsApi.audit({ id: institutionId, page, limit }).then((response) => {
          const mapped = mapInstitutionListResponse(response);
          return { entries: mapped.institutions, totalPages: mapped.pagination?.totalPages ?? 1 };
        })
      }
    />
  );
}
