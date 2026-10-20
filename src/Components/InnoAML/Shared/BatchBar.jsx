import { useTranslation } from "react-i18next";
import { ShieldCheck, ShieldOff, X } from "lucide-react";

// One import's batch (Blacklist, Whitelist): its id, Approve all / Reject
// all for a checker, and a way back to every row.
export function BatchBar({ batchId, canDecide, onDecide, onClear }) {
  const { t } = useTranslation("aml");
  if (!batchId) return null;
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-amber-300 bg-amber-50/60 p-2.5 text-sm">
      <span className="font-semibold">
        {t("importBatch")} <span className="font-mono text-xs">{batchId}</span>
      </span>
      <span className="ml-auto flex flex-wrap gap-2">
        {canDecide && (
          <>
            <button type="button" onClick={() => onDecide("auth")} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
              <ShieldCheck size={13} /> {t("approveBatch")}
            </button>
            <button type="button" onClick={() => onDecide("deauth")} className="flex items-center gap-1 rounded-lg border border-amber-400 px-3 py-1.5 text-xs font-bold text-amber-800">
              <ShieldOff size={13} /> {t("rejectBatch")}
            </button>
          </>
        )}
        <button type="button" onClick={onClear} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted">
          <X size={13} /> {t("clearBatch")}
        </button>
      </span>
    </div>
  );
}

// A row's batch as a small chip that shows that import's rows.
export function BatchChip({ batchId, onPick }) {
  const { t } = useTranslation("aml");
  if (!batchId) return null;
  return (
    <button type="button" onClick={() => onPick(batchId)} title={t("showBatch")} className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] font-bold text-muted-foreground hover:text-primary">
      {t("batchShort", { id: batchId.slice(0, 8) })}
    </button>
  );
}
