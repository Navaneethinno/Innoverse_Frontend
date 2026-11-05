import { ChevronRight } from "lucide-react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { menuPathForItem } from "@/Components/Layout/Menu/menuRouteMap";

// Finds a message's screen in the sidebar's menus, as the sidebar builds it.
export function useNotificationTarget() {
  const menus = useSelector((state) => state.menu.menuArray);
  const navigate = useNavigate();
  const pageOf = (x) => {
    if (!x.menu_id) return null;
    const active = (menus ?? []).filter((m) => m?.status === 1);
    const menu = active.find((m) => Number(m.menu_id) === Number(x.menu_id));
    return menu ? menuPathForItem(menu, active) : null;
  };
  const go = (x, to) => navigate(to, { state: { menuClick: Date.now(), recordId: x.record_id ?? undefined } });
  return { pageOf, go };
}

// One inbox message: unread in bold with a dot, an arrow when it opens a screen.
export function NotificationRow({ item: x, to, onOpen }) {
  return (
    <button type="button" onClick={onOpen} className={`flex w-full items-start gap-2.5 border-b border-border/50 px-4 py-2.5 text-left transition-colors hover:bg-muted ${x.read ? "" : "bg-primary-light/40"}`}>
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${x.read ? "bg-transparent" : "bg-primary"}`} />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm ${x.read ? "font-medium text-foreground/80" : "font-bold text-foreground"}`}>{x.title}</span>
        {x.body && <span className="line-clamp-2 block text-xs text-muted-foreground">{x.body}</span>}
        <span className="mt-0.5 block text-[10px] text-muted-foreground">{[x.menu_label ?? x.menu_name, x.record_name || (x.record_id != null && `#${x.record_id}`), x.created_at && new Date(x.created_at).toLocaleString()].filter(Boolean).join(" · ")}</span>
      </span>
      {to && <ChevronRight size={14} className="mt-1 shrink-0 text-muted-foreground" />}
    </button>
  );
}
