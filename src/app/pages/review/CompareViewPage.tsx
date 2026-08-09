import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { Check, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { GradientMesh, Avatar, StatusBadge } from "../../legacy/legacy-components";
import { useReviewStore } from "../../features/review/review.store";
import type { PendingChange } from "../../features/review/review.types";
import { DiffViewer } from "./components/DiffViewer";
import { cn } from "../../lib/utils";
import { Skeleton } from "../../components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "../../components/ui/alert";
import { toast } from "sonner";

export function CompareViewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { fetchChangeById, updateChangeStatus, isLoading, error } = useReviewStore();
  const [change, setChange] = useState<PendingChange | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [mode, setMode] = useState<"split" | "unified">("split");
  const [approved, setApproved] = useState<boolean | null>(null);

  useEffect(() => {
    if (!id) return;
    setNotFound(false);
    void fetchChangeById(id).then((item) => {
      if (item) setChange(item);
      else setNotFound(true);
    });
  }, [id, fetchChangeById]);

  if (isLoading || (!change && !notFound)) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
        <GradientMesh />
        <div className="relative max-w-5xl mx-auto space-y-4">
          <Skeleton className="h-10 w-80" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-80 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || notFound || !change) {
    return (
      <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
        <GradientMesh />
        <div className="relative max-w-5xl mx-auto">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{notFound ? "Approval not found" : "Approval unavailable"}</AlertTitle>
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{notFound ? "The requested approval ID is invalid." : error}</span>
              <button className="text-sm underline" onClick={() => void fetchChangeById(id ?? "")}>Retry</button>
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-20 pb-12 px-4 relative bg-[#F9FAFB]">
      <GradientMesh />
      <div className="relative max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6 pt-2 flex-wrap">
          <button onClick={() => navigate("/review")} className="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1 shrink-0">
            ← Review Center
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-slate-800 tracking-tight">Change Comparison</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {change.institutionName} · <span className="text-indigo-600 font-medium">1 field changed</span>
            </p>
          </div>
          <div className="flex items-center gap-1 bg-white rounded-xl border border-slate-200 p-1 shadow-sm shrink-0">
            {(["split", "unified"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn("px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all", mode === m ? "bg-indigo-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50")}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm mb-5">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Requested by</p>
              <div className="flex items-center gap-2">
                <Avatar name={change.requestedBy} size="sm" />
                <p className="text-sm font-semibold text-slate-700">{change.requestedBy}</p>
              </div>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Submitted</p>
              <p className="text-sm font-semibold text-slate-700">{change.requestedAt}</p>
            </div>
            <div className="flex-1 min-w-48">
              <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">Reason</p>
              <p className="text-sm text-slate-700">{change.reason}</p>
            </div>
            <StatusBadge status={change.status} />
          </div>
        </div>
        <DiffViewer change={change} mode={mode} />
        {approved === null ? (
          <div className="flex gap-3 justify-end">
            <button onClick={() => setApproved(false)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 transition-colors">
              <XCircle size={15} /> Reject Change
            </button>
            <button onClick={() => setApproved(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-emerald-500 to-teal-500 shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all">
              <Check size={15} /> Approve Change
            </button>
          </div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={cn("flex items-center justify-between p-4 rounded-2xl border", approved ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100")}>
            <div className="flex items-center gap-3">
              {approved ? <CheckCircle size={18} className="text-emerald-600" /> : <XCircle size={18} className="text-red-600" />}
              <div>
                <p className={cn("text-sm font-semibold", approved ? "text-emerald-800" : "text-red-800")}>{approved ? "Change approved" : "Change rejected"}</p>
                <p className={cn("text-xs mt-0.5", approved ? "text-emerald-600" : "text-red-600")}>{approved ? "The change will be applied to the institution" : "The change has been declined"}</p>
              </div>
            </div>
            <button
              onClick={async () => {
                const ok = await updateChangeStatus(change.id, approved ? "approved" : "rejected");
                if (ok) toast.success(approved ? "Change approved" : "Change rejected");
                else toast.error(useReviewStore.getState().error ?? "Failed to update approval");
                navigate("/review");
              }}
              className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
            >
              Back to Review →
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
