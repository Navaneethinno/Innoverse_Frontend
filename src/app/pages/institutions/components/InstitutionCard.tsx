import { motion } from "motion/react";
import { ArrowRight, Globe } from "lucide-react";
import { useNavigate } from "react-router";
import { InstitutionAvatar, StatusBadge } from "../../../legacy/legacy-components";
import type { Institution } from "../../../features/institution/institution.types";

export function InstitutionCard({ inst, index }: { inst: Institution; index: number }) {
  const navigate = useNavigate();

  return (
    <motion.div
      key={inst.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
      whileHover={{ y: -4, boxShadow: "0 16px 48px rgba(124,140,255,0.14)" }}
      className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm cursor-pointer group relative overflow-hidden"
      onClick={() => navigate(`/institutions/${inst.id}`)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${inst.name} workspace`}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/institutions/${inst.id}`)}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/0 to-purple-50/0 group-hover:from-indigo-50/60 group-hover:to-purple-50/40 transition-all duration-300 pointer-events-none rounded-2xl" />
      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <InstitutionAvatar name={inst.name} />
          <StatusBadge status={inst.status} />
        </div>
        <h3 className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors leading-snug">{inst.name}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{inst.type}</p>
        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Accounts</p>
            <p className="text-sm font-bold text-slate-700 mt-0.5">{inst.totalAccounts.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Volume</p>
            <p className="text-sm font-bold text-slate-700 mt-0.5">{inst.totalVolume}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Globe size={11} />
            <span>{inst.city}</span>
          </div>
          <span className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-xs text-indigo-600 font-medium transition-opacity">
            Open <ArrowRight size={11} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
