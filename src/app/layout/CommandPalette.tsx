import { AnimatePresence, motion } from "motion/react";

export function CommandPalette({ open }: { open: boolean; onClose: () => void; onNavigate: () => void }) {
  return (
    <AnimatePresence>
      {open ? <motion.div /> : null}
    </AnimatePresence>
  );
}

