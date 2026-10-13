import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";

// Single source of truth for maker-checker status derivation — every list
// page in the app (Institution, MasterConfig, UserManagement, Digital
// Product) should derive draft/pending/pendingDelete/active/inactive from
// this instead of hand-rolling its own version.
//
// Root cause this fixes: backends have been observed putting the same
// human-readable state ("Pending Delete", "Draft", "Active", ...) in EITHER
// process_status_name OR auth_status depending on the entity/endpoint. Every
// per-page copy of this logic checked only process_status_name, so a row
// whose backend response only populated auth_status (confirmed for
// UserManagement/Profile: auth_status: "Pending Delete", process_status_name
// absent) silently failed every check — draft/pending/pendingDelete all
// came back false, so the entire actions column for that row vanished
// (no Authorize/Delete Auth button at all), even though the StatusBadge
// column right next to it was rendering "Pending Delete" correctly from
// that very same auth_status field.
export function deriveStatusFlags(row) {
  const process = String(row?.process_status_name ?? "").toLowerCase();
  const auth = String(row?.auth_status ?? "").toLowerCase();
  const statusName = String(row?.status_name ?? "").toLowerCase();
  const combined = `${process} ${auth} ${statusName}`;

  const draft =
    Number(row?.status) === INSTITUTION_DRAFT_STATUS_CODE || combined.includes("draft");
  const pendingDelete = combined.includes("pending delete");
  const pending = pendingDelete || combined.includes("pending") || auth === "auth wait";
  const active = row?.status === 1 || statusName === "active" || auth === "active" || auth === "authorized";
  const inactive =
    row?.status === 0 || statusName === "inactive" || auth === "inactive" || auth === "deactivated";

  return { draft, pending, pendingDelete, active, inactive };
}

