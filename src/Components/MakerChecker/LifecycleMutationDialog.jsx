import { motion } from "motion/react";
import { X } from "lucide-react";
import { MakerCheckerConfig } from "./MakerCheckerConfig";
export function LifecycleMutationDialog({
  open,
  title,
  onClose,
  onSubmit,
  children,
  checkerConfig,
  setCheckerConfig,
  candidates,
  makerInstitutionId,
  currentMakerId,
  showCheckerConfig = true,
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100">
            <X size={14} />
          </button>
        </div>
        <div className="space-y-4">
          {children}
          {showCheckerConfig && (
            <MakerCheckerConfig
              value={checkerConfig}
              onChange={setCheckerConfig}
              candidates={candidates}
              makerInstitutionId={makerInstitutionId}
              currentMakerId={currentMakerId}
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSubmit}
              className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-200/50"
              style={{ background: "#2266EE" }}
            >
              Submit
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
