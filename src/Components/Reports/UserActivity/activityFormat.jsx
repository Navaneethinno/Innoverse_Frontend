// Shared by the User Activity page and its detail panel (IST times, ranges,
// periods and downloads are in ../Shared/reportShared).

export const ROLES = ["MAKER", "CHECKER", "DIRECT"];

const ROLE_TONES = {
  MAKER: "bg-[color-mix(in_srgb,var(--primary)_12%,transparent)] text-primary",
  CHECKER: "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success",
  DIRECT: "bg-amber-50 text-amber-700",
};
export function RoleBadge({ role, name }) {
  return <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold ${ROLE_TONES[role] ?? "bg-muted text-muted-foreground"}`}>{name ?? role}</span>;
}

// A record's label, or #id, or just its type.
export const recordText = (row) => row?.record_label ?? (row?.record_id != null ? `#${row.record_id}` : row?.entity_name ?? "-");
