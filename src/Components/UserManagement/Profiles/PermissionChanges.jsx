import { useTranslation } from "react-i18next";
import { Minus, Plus } from "lucide-react";

// The permissions a pending profile edit adds and removes
// (`pending.permission_changes`), grouped by menu: "Disputes · View, Add".
const byMenu = (items) => {
  const groups = new Map();
  for (const p of items ?? []) {
    const name = p.menu_name ?? String(p.menu_id);
    groups.set(name, [...(groups.get(name) ?? []), p.action_name ?? String(p.action_id)]);
  }
  return [...groups.entries()];
};

export function PermissionChanges({ changes }) {
  const { t } = useTranslation("profiles");
  if (!changes) return null;
  const added = byMenu(changes.added);
  const removed = byMenu(changes.removed);
  return (
    <div className="mt-3 overflow-hidden rounded-xl border border-border">
      <p className="border-b border-border bg-muted px-3 py-2 text-[11px] font-black uppercase tracking-widest text-muted-foreground">{t("permissions")}</p>
      {!added.length && !removed.length ? (
        <p className="px-3 py-3 text-xs text-muted-foreground">{t("noPermissionChanges")}</p>
      ) : (
        <ul className="grid gap-1 p-3 text-xs">
          {added.map(([menu, actions]) => (
            <li key={`a-${menu}`} className="flex items-start gap-1.5 text-emerald-700">
              <Plus size={13} className="mt-0.5 shrink-0" />
              <span>
                <b>{menu}</b> · {actions.join(", ")}
              </span>
            </li>
          ))}
          {removed.map(([menu, actions]) => (
            <li key={`r-${menu}`} className="flex items-start gap-1.5 text-red-700">
              <Minus size={13} className="mt-0.5 shrink-0" />
              <span>
                <b>{menu}</b> · {actions.join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// The pending reply without the two permission rows: PermissionChanges shows
// them. An edit of permissions only has no field changes left to show.
const PERMISSION_ROWS = new Set(["permissions_added", "permissions_removed"]);
export const withoutPermissionRows = (data) => {
  if (!data) return data;
  const changes = (data.changes ?? []).filter((c) => !PERMISSION_ROWS.has(c.field));
  if (!changes.length && data.pending_action === "EDIT" && data.permission_changes) return null;
  return { ...data, changes };
};
