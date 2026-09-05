import { X } from "lucide-react";
import { motion } from "motion/react";

export function AuditModal({ title, data, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"
      onClick={onClose}
      role="presentation"
    >
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[80vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} aria-label="Close audit">
            <X />
          </button>
        </div>
        <pre className="max-h-[65vh] overflow-auto rounded-xl bg-slate-900 p-4 text-xs text-slate-100">
          {JSON.stringify(data, null, 2)}
        </pre>
      </motion.div>
    </div>
  );
}
