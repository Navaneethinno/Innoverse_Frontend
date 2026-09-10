import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { usersApi } from "@/Services/Users/users.api";

const AUDIT_FIELDS = [
  ["policy_id", "Policy ID"],
  ["policy_name", "Policy name"],
  ["description", "Description"],
  ["min_length", "Minimum length"],
  ["max_length", "Maximum length"],
  ["max_retry_count", "Maximum retry count"],
  ["lockout_duration_mins", "Lockout duration"],
  ["session_timeout_minutes", "Session timeout"],
  ["max_sessions_allowed", "Maximum sessions"],
];

const policyId = (policy) => policy?.policy_id ?? policy?.id;

export function AuditPasswordPolicy({ policy, onClose }) {
  if (!policy) return null;

  return (
    <AuditModal
      title={policy.policy_name ?? `Policy #${policyId(policy)}`}
      fields={AUDIT_FIELDS}
      onClose={onClose}
      fetchAudit={(page, limit) =>
        usersApi.passwordPolicyAudit({ policy_id: policyId(policy), page, limit }).then(mapAuditResponse)
      }
    />
  );
}
