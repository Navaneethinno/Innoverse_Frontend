import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { MousePointerClick, X } from "lucide-react";
import { controlAt, explain } from "./pageControls";

// "What's this?": hover any button, filter, tab or column and its
// explanation shows beside it. Clicks are held back so nothing runs by
// accident; Esc or the bar's Done ends it.
export function GuideInspector({ onClose }) {
  const { t } = useTranslation("guide");
  const [hit, setHit] = useState(null); // { rect, title, content }

  useEffect(() => {
    const onMove = (e) => {
      const el = controlAt(e.target);
      if (!el) return setHit(null);
      const r = el.getBoundingClientRect();
      setHit((previous) => (previous?.el === el ? previous : { el, rect: r, ...explain(el) }));
    };
    const block = (e) => {
      if (e.target.closest?.("[data-guide-ui]")) return;
      e.preventDefault();
      e.stopPropagation();
    };
    const onKey = (e) => e.key === "Escape" && onClose();
    const onScroll = () => setHit(null);
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("click", block, true);
    document.addEventListener("mousedown", block, true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("click", block, true);
      document.removeEventListener("mousedown", block, true);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [onClose]);

  const r = hit?.rect;
  const below = r && r.bottom + 160 < window.innerHeight;
  const left = r ? Math.min(Math.max(12, r.left), window.innerWidth - 300) : 0;
  return (
    <div className="pointer-events-none fixed inset-0 z-[10000]">
      <div data-guide-ui className="pointer-events-auto fixed left-1/2 top-3 flex -translate-x-1/2 items-center gap-3 rounded-2xl border bg-[var(--card)] px-4 py-2 text-xs shadow-2xl">
        <MousePointerClick size={15} className="text-primary" />
        <span className="font-semibold">{t("inspectBar")}</span>
        <button type="button" onClick={onClose} className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 font-bold text-primary-foreground">
          <X size={12} /> {t("done")}
        </button>
      </div>
      {r && (
        <>
          <div className="fixed rounded-lg outline outline-2 outline-offset-2 outline-[var(--primary)] transition-all duration-150" style={{ top: r.top, left: r.left, width: r.width, height: r.height }} />
          <div
            className="fixed w-[18rem] rounded-xl border bg-[var(--card)] p-3 text-[var(--card-foreground)] shadow-2xl transition-all duration-150"
            style={{ left, ...(below ? { top: r.bottom + 10 } : { bottom: window.innerHeight - r.top + 10 }) }}
          >
            <p className="text-sm font-black">{hit.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{hit.content}</p>
          </div>
        </>
      )}
    </div>
  );
}
