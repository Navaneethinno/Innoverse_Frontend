import { ArrowRight } from "lucide-react";
import { useOpenMenu } from "@/Pages/Sidebar/menuContext";

// A link-style button to the master where a missing value is created, for a
// hint that has no dropdown to carry FilterSelect's `addAction` row. Opens
// the page the same way (useOpenMenu, by page slug).
export function MenuLink({ slug, label }) {
  const openMenu = useOpenMenu();
  return (
    <button type="button" onClick={() => openMenu(slug)} className="inline-flex items-center gap-1 font-bold text-primary hover:underline">
      {label} <ArrowRight size={12} />
    </button>
  );
}
