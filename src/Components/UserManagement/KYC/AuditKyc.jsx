import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { usersApi } from "@/Services/Users/users.api";

const AUDIT_FIELDS = [
  ["user_id", "User ID"],
  ["user_name", "User"],
  ["first_name", "First name"],
  ["last_name", "Last name"],
  ["employee_id", "Employee ID"],
  ["email", "Email"],
  ["mobile", "Mobile"],
  ["gender", "Gender"],
  ["address", "Address"],
];

const kycId = (kyc) => kyc?.user_id ?? kyc?.id;
const kycTitle = (kyc) =>
  kyc?.user_name || `${kyc?.first_name ?? kyc?.user_fname ?? ""} ${kyc?.last_name ?? kyc?.user_lname ?? ""}`.trim() || `KYC #${kycId(kyc)}`;

// Same dedicated wrapper pattern as Institution Profile audit: the page only
// opens/closes it, while this feature file owns its audit id and API mapping.
export function AuditKyc({ kyc, onClose }) {
  if (!kyc) return null;

  return (
    <AuditModal
      title={kycTitle(kyc)}
      fields={AUDIT_FIELDS}
      onClose={onClose}
      fetchAudit={(page, limit) =>
        usersApi.kycAudit({ user_id: kycId(kyc), page, limit }).then(mapAuditResponse)
      }
    />
  );
}
