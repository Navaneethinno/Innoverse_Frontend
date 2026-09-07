import { AuditModal } from "@/Components/Common/AuditModal";
import { usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { usersApi } from "@/Services/Users/users.api";
import { nameOf, userId } from "./UserForm";

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
    />
  );
}
