import { AuditModal } from "@/Components/Common/AuditModal";
import { usersApi } from "@/Services/Users/users.api";
import { nameOf, userId } from "./UserForm";

// Same response-envelope tolerance already used elsewhere for this
// endpoint's array key, plus the top-level pagination envelope shared by
// every other confirmed-live list/audit response in this codebase.
function extractUserAuditPage(response) {
  const entries = Array.isArray(response)
    ? response
    : (response?.data?.user_audit_array ?? response?.data?.audit_array ?? response?.data ?? []);
  return { entries, totalPages: response?.pagination?.totalPages ?? 1 };
}

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
      onClose={onClose}
      fetchAudit={(page, limit) =>
        usersApi.audit({ user_id: userId(audit.user), page, limit }).then(extractUserAuditPage)
      }
    />
  );
}
