import { AuditModal } from "@/Components/Common/AuditModal";
import { usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { usersApi } from "@/Services/Users/users.api";
import { nameOf, userId } from "./UserForm";

// Same response-envelope tolerance as the initial page-1 fetch in
// User.jsx's openAudit() — kept in sync with that unwrap logic.
function extractUserAuditEntries(response) {
  return Array.isArray(response)
    ? response
    : (response?.data?.user_audit_array ?? response?.data?.audit_array ?? response?.data ?? []);
}

// Audit-trail modal wrapper for a single user — split out of UsersPage.jsx.
// Also surfaces the record's own open pending request (if any) via
// /user/pending, so a checker reviewing the audit trail immediately sees
// what's currently being asked of them without leaving this modal.
export function AuditUser({ audit, onClose }) {
  const open = !!audit;
  const { data, isLoading, error } = usePendingChanges(usersApi.pending, open ? userId(audit.user) : null, open);
  if (!audit) return null;
  return (
    <AuditModal
      title={nameOf(audit.user)}
      entries={audit.entries}
      onClose={onClose}
      pendingChanges={data}
      pendingLoading={isLoading}
      pendingError={error}
      currentRecord={audit.user}
      fetchMore={(page, limit) =>
        usersApi
          .audit({ user_id: userId(audit.user), page, limit })
          .then(extractUserAuditEntries)
      }
    />
  );
}
