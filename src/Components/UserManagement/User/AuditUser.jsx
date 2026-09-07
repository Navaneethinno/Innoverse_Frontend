import { AuditModal } from "@/Components/Common/AuditModal";
import { nameOf } from "./UserForm";

// Audit-trail modal wrapper for a single user — split out of UsersPage.jsx.
export function AuditUser({ audit, onClose }) {
  if (!audit) return null;
  return <AuditModal title={nameOf(audit.user)} entries={audit.entries} onClose={onClose} />;
}
