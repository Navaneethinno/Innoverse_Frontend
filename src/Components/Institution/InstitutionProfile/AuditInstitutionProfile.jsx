import { AuditModal } from "@/Components/Common/AuditModal";
import { useInstitutionAuditQuery } from "@/Hooks/Institutions/institutionHooks";

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

export function AuditInstitutionProfile({ institution, institutionId, onClose }) {
  const auditQuery = useInstitutionAuditQuery(institutionId);

  return (
    <AuditModal
      title={institution?.name ?? institution?.code ?? `#${institutionId}`}
      entries={auditQuery.data ?? []}
      fields={AUDIT_FIELDS}
      isLoading={auditQuery.isLoading}
      error={auditQuery.error}
      onRetry={() => void auditQuery.refetch()}
      onClose={onClose}
    />
  );
}
