import { motion } from "motion/react";
import { X } from "lucide-react";
import { MakerCheckerConfig, type MakerCheckerConfigValue, type CheckerCandidate } from "./MakerCheckerConfig";

interface Props {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  children: React.ReactNode;
  checkerConfig: MakerCheckerConfigValue;
  setCheckerConfig: (v: MakerCheckerConfigValue) => void;
  candidates: CheckerCandidate[];
  makerInstitutionId?: string | number | null;
  currentMakerId?: string | number | null;
  showCheckerConfig?: boolean;
}

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
}: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.97, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} className="relative w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl border border-slate-100 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-slate-800">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
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
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
            <button type="button" onClick={onSubmit} className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50" style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}>Submit</button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
