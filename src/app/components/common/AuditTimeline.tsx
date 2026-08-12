import { motion } from "motion/react";
import { CheckCircle, XCircle, Clock, FileText } from "lucide-react";
import { cn } from "../../lib/utils";
import { ChangeViewer } from "./ChangeViewer";
import type { AuditEntryOut } from "../../features/maker-checker.types";
import { useState } from "react";

interface AuditTimelineProps {
  entries: AuditEntryOut[];
  isLoading?: boolean;
}

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
};

export function AuditTimeline({ entries, isLoading }: AuditTimelineProps) {
  const [expanded, setExpanded] = useState<string | number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-16 rounded-2xl animate-pulse bg-slate-100" />
        ))}
      </div>
    );
  }

  if (!entries.length) {
    return (
      <div className="flex flex-col items-center py-12 gap-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center">
          <FileText size={20} className="text-slate-300" />
        </div>
        <p className="text-sm font-bold text-slate-500">No audit history</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {entries.map((entry, i) => {
        const isExpanded = expanded === entry.id;
        const decisionIcon = entry.decision === "APPROVE"
          ? <CheckCircle size={14} className="text-emerald-500" />
          : entry.decision === "REJECT"
          ? <XCircle size={14} className="text-red-500" />
          : <Clock size={14} className="text-amber-500" />;

        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-2xl overflow-hidden cursor-pointer"
            style={glass}
            onClick={() => setExpanded(isExpanded ? null : entry.id)}
          >
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="shrink-0">{decisionIcon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn(
                    "text-[10px] font-black uppercase px-2 py-0.5 rounded-full",
                    entry.action === "ADD" ? "bg-emerald-50 text-emerald-700" :
                    entry.action === "EDIT" ? "bg-blue-50 text-blue-700" :
                    entry.action === "DELETE" ? "bg-red-50 text-red-700" :
                    "bg-slate-50 text-slate-600"
                  )}>
                    {entry.action}
                  </span>
                  <span className="text-xs font-semibold text-slate-700">{entry.event_type}</span>
                  {entry.decision && (
                    <span className={cn(
                      "text-[10px] font-bold uppercase",
                      entry.decision === "APPROVE" ? "text-emerald-600" : "text-red-600"
                    )}>
                      {entry.decision}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {entry.maker && <span className="text-[11px] text-slate-400">Maker: <span className="font-semibold text-slate-600">{entry.maker.name}</span></span>}
                  {entry.checker && <span className="text-[11px] text-slate-400">Checker: <span className="font-semibold text-slate-600">{entry.checker.name}</span></span>}
                  <span className="text-[11px] text-slate-400">{entry.approval_count}/{entry.required_checker_count} approvals</span>
                  {entry.remark && <span className="text-[11px] text-slate-400 italic">"{entry.remark}"</span>}
                </div>
              </div>
              <span className="text-[10px] text-slate-300 shrink-0">{new Date(entry.created_at).toLocaleString()}</span>
            </div>
            {isExpanded && (
              <div className="px-4 pb-4 border-t border-slate-100">
                <div className="pt-3">
                  <ChangeViewer
                    action={entry.action}
                    before_data={entry.before_data}
                    after_data={entry.after_data}
                  />
                </div>
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}
