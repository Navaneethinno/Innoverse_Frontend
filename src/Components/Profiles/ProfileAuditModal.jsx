import { AuditModal } from "@/Components/Common/AuditModal";
import { useProfileAuditQuery } from "@/Hooks/Profiles/profileHooks";

// Mirrors AuditModal's formatting approach (real key/value fields, not a
// raw JSON dump), adapted to whatever fields a real /profile/audit_list
// response actually contains. The exact field set is unverified against a
// live backend — this renders the fields payse's own AuditProfile.jsx reads
// off each record.
const AUDIT_FIELDS = [
  ["profile_name", "Profile Name"],
  ["audit_note", "Audit Note"],
];

function renderMenuGrants(entry) {
  const grants = Array.isArray(entry.menu_info)
    ? entry.menu_info
    : Array.isArray(entry.menu_audit_array)
      ? entry.menu_audit_array
      : [];
  if (grants.length === 0) return null;
  return (
    <div className="mt-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
        Menu / Action grants
      </p>
      <div className="flex flex-wrap gap-1.5">
        {grants.map((grant, i) => (
          <span
            key={i}
            className="rounded-full bg-muted px-2 py-1 text-[10px] font-semibold text-muted-foreground"
          >
            menu #{grant.menu_id ?? grant.profile_menu_action_id} · action{" "}
            {Array.isArray(grant.actions) ? grant.actions.join(",") : (grant.action_id ?? "—")}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ProfileAuditModal({ profile, profileId, onClose }) {
  const auditQuery = useProfileAuditQuery(profileId);

  return (
    <AuditModal
      title={profile?.profile_name ?? `#${profileId}`}
      entries={auditQuery.data ?? []}
      fields={AUDIT_FIELDS}
      isLoading={auditQuery.isLoading}
      error={auditQuery.error}
      onRetry={() => void auditQuery.refetch()}
      onClose={onClose}
      getActionLabel={(entry) => entry.audit_action ?? entry.profile_name ?? null}
      getEntryKey={(entry, index) => entry.audit_id ?? entry.audit_key ?? index}
      renderExtra={renderMenuGrants}
    />
  );
}
