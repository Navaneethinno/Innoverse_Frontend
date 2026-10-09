import { createElement } from "react";
import { getMenuIcon } from "@/Pages/Sidebar/moduleIcons";
import { useMenuContext } from "@/Pages/Sidebar/menuContext";
import { cn } from "@/Utils/Lib/utils";

// A page's title, as every screen shows it: large and bold, after the
// icon its menu has in the sidebar (or `icon`, when given).
export function PageTitle({ icon, className, children }) {
  const menuName = useMenuContext()?.menu?.menu_name;
  const glyph = icon ?? getMenuIcon(menuName ?? "");
  return (
    <h1 className={cn("flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800", className)}>
      {createElement(glyph, { size: 22, className: "shrink-0 text-primary" })} <span className="min-w-0">{children}</span>
    </h1>
  );
}
