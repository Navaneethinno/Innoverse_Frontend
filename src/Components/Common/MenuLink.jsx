import { useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight } from "lucide-react";
import { findMenuByName } from "@/Hooks/usePermission";
import { menuPathForItem } from "@/Pages/Sidebar/menuRouteMap";

// A way to the screen where something missing is created ("Account
// Products"): a link when the user's menus include it, otherwise a note to
// ask someone who has it.
export function MenuLink({ menu, label }) {
  const { t } = useTranslation("common");
  const menus = useSelector((state) => state.menu.menuArray);
  const item = findMenuByName(menus, menu);
  if (!item) return <span className="font-semibold">{t("askSomeoneWithMenu", { menu })}</span>;
  return (
    <Link to={menuPathForItem(item, menus)} className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
      {label ?? t("goToMenu", { menu: item.menu_name })} <ArrowRight size={12} />
    </Link>
  );
}
