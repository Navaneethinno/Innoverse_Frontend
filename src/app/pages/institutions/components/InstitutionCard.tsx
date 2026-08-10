import { motion } from "motion/react";
import { ArrowUpRight, MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import type { Institution } from "../../../features/institution/institution.types";
import { cn } from "../../../lib/utils";

const GRADIENTS = [
  "from-[#6C7FFF] to-[#B39DFA]",
  "from-[#6EDFC4] to-[#3BBFA0]",
  "from-[#FFB3A0] to-[#FF8C6B]",
  "from-[#FFCB6B] to-[#F59E0B]",
  "from-[#B39DFA] to-[#6C7FFF]",
];

const STATUS_STYLES: Record<string, { pill: string; dot: string; label: string }> = {
  ACTIVE:    { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Active" },
  active:    { pill: "bg-emerald-50 text-emerald-700 border-emerald-200", dot: "bg-emerald-500", label: "Active" },
  PENDING:   { pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   label: "Pending" },
  pending:   { pill: "bg-amber-50 text-amber-700 border-amber-200",       dot: "bg-amber-500",   label: "Pending" },
  REJECTED:  { pill: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500",     label: "Rejected" },
  rejected:  { pill: "bg-red-50 text-red-700 border-red-200",             dot: "bg-red-500",     label: "Rejected" },
  SUSPENDED: { pill: "bg-orange-50 text-orange-700 border-orange-200",    dot: "bg-orange-500",  label: "Suspended" },
  suspended: { pill: "bg-orange-50 text-orange-700 border-orange-200",    dot: "bg-orange-500",  label: "Suspended" },
  DRAFT:     { pill: "bg-slate-50 text-slate-500 border-slate-200",       dot: "bg-slate-400",   label: "Draft" },
  draft:     { pill: "bg-slate-50 text-slate-500 border-slate-200",       dot: "bg-slate-400",   label: "Draft" },
};

export function InstitutionCard({ inst, index }: { inst: Institution; index: number }) {
  const navigate = useNavigate();
  const grad = GRADIENTS[index % GRADIENTS.length];

  const displayName = inst.name || inst.legal_name || inst.code || "—";
  const displayType = inst.type || inst.legal_name || "Institution";
  const displayCity = inst.city || inst.state || inst.country || null;
  const statusKey = String(inst.status ?? "DRAFT");
  const statusCfg = STATUS_STYLES[statusKey] ?? STATUS_STYLES.DRAFT;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -5, boxShadow: "0 20px 60px rgba(108,127,255,0.16)" }}
      className="rounded-2xl p-5 cursor-pointer group relative overflow-hidden"
      style={{
        background: "rgba(255,255,255,0.68)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.88)",
        boxShadow: "0 4px 20px rgba(108,127,255,0.07), 0 1px 3px rgba(108,127,255,0.04)",
      }}
      onClick={() => navigate(`/institutions/${inst.id}`)}
      role="button"
      tabIndex={0}
      aria-label={`Open ${displayName}`}
      onKeyDown={(e) => e.key === "Enter" && navigate(`/institutions/${inst.id}`)}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
        style={{ background: "linear-gradient(135deg, rgba(108,127,255,0.04) 0%, rgba(179,157,250,0.06) 100%)" }} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div className={cn(`w-11 h-11 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white text-base font-black shadow-md`)}>
            {displayName.charAt(0).toUpperCase()}
          </div>
          <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border", statusCfg.pill)}>
            <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusCfg.dot)} />
            {statusCfg.label}
          </span>
        </div>

        <h3 className="text-sm font-bold text-slate-800 group-hover:text-indigo-700 transition-colors leading-snug tracking-tight">
          {displayName}
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5 font-medium">{displayType}</p>

        {/* Stats row */}
        <div className="mt-4 pt-4 border-t border-slate-100/80 grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Code</p>
            <p className="text-sm font-black text-slate-700 mt-0.5 font-mono">{inst.code || "—"}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-widest text-slate-300 font-bold">Version</p>
            <p className="text-sm font-black text-slate-700 mt-0.5">{inst.version ?? "—"}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
            {displayCity ? <><MapPin size={10} /> {displayCity}</> : <span className="text-slate-300">No location</span>}
          </span>
          <span className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 text-[11px] text-indigo-500 font-bold transition-opacity">
            Open <ArrowUpRight size={11} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}
