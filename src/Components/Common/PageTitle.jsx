import { createElement } from "react";
import { getMenuIcon } from "@/Components/Layout/Menu/moduleIcons";
import { useMenuContext } from "@/Components/Layout/Menu/menuContext";
import { menuLabel } from "@/Components/Layout/Menu/menuLabels";
import { cn } from "@/Utils/Lib/utils";

// A page's title, as every screen shows it: large and bold, after the
// icon its menu has in the sidebar (or `icon`, when given).
// On a menu's screen the title is the backend's name of that menu in the
// user's language (menu_label), never the portal's own translation; the
// children show only off a menu (or while it has no name). `own`: a view
// inside the screen (an edit form, a second tab) keeps its own title.
export function PageTitle({ icon, className, own = false, children }) {
  const menu = useMenuContext()?.menu;
  const glyph = icon ?? getMenuIcon(menu?.menu_name ?? "");
  const title = (!own && menu && menuLabel(menu)) || children;
  return (
    <h1 className={cn("flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800", className)}>
      {createElement(glyph, { size: 22, className: "shrink-0 text-primary" })} <span className="min-w-0">{title}</span>
    </h1>
  );
}
