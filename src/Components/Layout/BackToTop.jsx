import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp } from "lucide-react";

// A round "back to top" button, bottom-right, on every page once it has
// been scrolled more than a screen down.
export function BackToTop() {
  const { t } = useTranslation("common");
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > window.innerHeight * 0.8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {shown && (
        <motion.button
          type="button"
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.9 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label={t("backToTop", "Back to top")}
          title={t("backToTop", "Back to top")}
          className="fixed bottom-5 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-[var(--primary)] text-[var(--primary-foreground,#fff)] shadow-lg ring-4 ring-[var(--primary-light)] print:hidden"
        >
          <ArrowUp size={18} strokeWidth={2.4} />
        </motion.button>
      )}
    </AnimatePresence>
  );
}
