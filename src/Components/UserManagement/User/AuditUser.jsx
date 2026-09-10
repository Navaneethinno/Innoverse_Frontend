import { AuditModal } from "@/Components/Common/AuditModal";
import { mapAuditResponse } from "@/Components/Common/auditResponse";
import { usersApi } from "@/Services/Users/users.api";
import { nameOf, userId } from "./UserForm";

const AUDIT_FIELDS = [
  ["username", "Username"],
  ["profile_name", "Profile"],
  ["inst_profile_name", "Institution"],
  ["policy_name", "Password policy"],
  ["is_force_pwd", "Force password change"],
];

// Audit-trail modal wrapper for a single user — split out of UsersPage.jsx.
// No /pending call here — each audit entry already carries its own
// `changes` array (see AuditModal.jsx). /pending stays in use for
// AuthUser/DeauthUser, which are asking about a currently-open request,
// not history.
export function AuditUser({ audit, onClose }) {
  if (!audit) return null;
  return (
    <AuditModal
      title={nameOf(audit.user)}
      fields={AUDIT_FIELDS}
      onClose={onClose}
      fetchAudit={(page, limit) =>
        usersApi.audit({ user_id: userId(audit.user), page, limit }).then(mapAuditResponse)
      }
    />
  );
}
