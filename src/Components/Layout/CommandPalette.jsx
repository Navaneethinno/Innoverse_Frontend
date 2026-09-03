import { AnimatePresence, motion } from "motion/react";
export function CommandPalette({ open }) {
  return <AnimatePresence>{open ? <motion.div /> : null}</AnimatePresence>;
}
