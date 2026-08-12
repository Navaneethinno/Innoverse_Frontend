import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { motion } from "motion/react";
import { AlertCircle, ArrowLeft, Pencil, Trash2, Power, PowerOff, History } from "lucide-react";
import { useInstitutionStore } from "../../features/institution/institution.store";
import type { Institution } from "../../features/institution/institution.types";
import type { AuditEntryOut } from "../../features/maker-checker.types";
import { Skeleton } from "../../components/ui/skeleton";
import { AuditTimeline } from "../../components/common/AuditTimeline";
import { StatusBadge } from "../../components/common/StatusBadge";
import { LifecycleMutationDialog } from "../../components/common/LifecycleMutationDialog";
import { notifications } from "../../lib/notifications";

export function InstitutionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchInstitutionById, getInstitutionAudit, updateInstitution, deleteInstitution, activateInstitution, deactivateInstitution, continueRejectedAdd } = useInstitutionStore();
  const [institution, setInstitution] = useState<Institution | null>(null);
  const [auditEntries, setAuditEntries] = useState<AuditEntryOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [auditLoading, setAuditLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"edit" | "delete" | "activate" | "deactivate" | null>(null);
  const [remark, setRemark] = useState("");
  const [editName, setEditName] = useState("");
  const [continueTarget, setContinueTarget] = useState<AuditEntryOut | null>(null);
  const [continueMode, setContinueMode] = useState<"edit" | "delete">("edit");
  const [continueJson, setContinueJson] = useState("");

  const load = async () => {
    if (!id) return;
    setIsLoading(true);
    setError(null);
    const item = await fetchInstitutionById(id);
    if (!item) setError("Institution not found");
    else {
      setInstitution(item);
      setEditName(item.name ?? "");
      setAuditLoading(true);
      setAuditEntries(await getInstitutionAudit(id));
      setAuditLoading(false);
    }
    setIsLoading(false);
  };

  useEffect(() => { void load(); }, [id]);

  const makerPending = useMemo(
    () => auditEntries.find((e) => e.action === "ADD" && e.auth_status === "REJECTED"),
    [auditEntries],
  );

  const submitAction = async () => {
    if (!id || !action) return;
    const payload = { remark: remark || null };
    let result = null;
    if (action === "edit") result = await updateInstitution(id, { name: editName || undefined, remark: remark || null });
    if (action === "delete") result = await deleteInstitution(id, payload);
    if (action === "activate") result = await activateInstitution(id, payload);
    if (action === "deactivate") result = await deactivateInstitution(id, payload);
    if (result) {
      notifications.success("Institution request submitted for approval");
      setAction(null);
      void load();
    } else {
      notifications.error(useInstitutionStore.getState().error ?? "Failed to submit institution request");
    }
  };

  const submitContinue = async () => {
    if (!continueTarget) return;
    const after_data = continueMode === "delete" ? null : (continueJson ? JSON.parse(continueJson) : undefined);
    const result = await continueRejectedAdd(String(continueTarget.request_id), { after_data: after_data ?? undefined, remark: remark || null }, continueMode);
    if (result) {
      notifications.success("Rejected ADD continued");
      setContinueTarget(null);
      void load();
    } else {
      notifications.error(useInstitutionStore.getState().error ?? "Failed to continue rejected ADD");
    }
  };

  if (isLoading || !institution) return <div className="pt-4 pb-8 space-y-4"><Skeleton className="h-8 w-48 rounded-xl" /><Skeleton className="h-56 w-full rounded-2xl" /></div>;
  if (error) return <div className="pt-4 flex flex-col items-center py-20 text-center"><div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mb-4"><AlertCircle size={22} className="text-red-400" /></div><p className="text-sm font-bold text-slate-700">{error}</p><button onClick={() => void load()} className="mt-3 text-xs font-bold text-indigo-500 underline">Retry</button></div>;

  return (
    <div className="pt-4 pb-8 space-y-5">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/institutions")} className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-slate-700"><ArrowLeft size={13} /> Institutions</button>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { setAction("edit"); setRemark(""); }} className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1"><Pencil size={13} /> Edit</button>
          <button onClick={() => { setAction("delete"); setRemark(""); }} className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1"><Trash2 size={13} /> Delete</button>
          <button onClick={() => { setAction("activate"); setRemark(""); }} className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1"><Power size={13} /> Activate</button>
          <button onClick={() => { setAction("deactivate"); setRemark(""); }} className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 flex items-center gap-1"><PowerOff size={13} /> Deactivate</button>
        </div>
      </div>
      <div className="rounded-2xl p-5 bg-white/70 border border-white/80">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-black text-slate-800">{institution.name}</h1>
            <p className="text-xs text-slate-400 font-mono">{institution.code}</p>
          </div>
          <StatusBadge status={institution.auth_status ?? institution.status} />
        </div>
        <p className="text-sm text-slate-500">Type: {institution.type}</p>
        {makerPending && <p className="mt-2 text-xs text-amber-600">Rejected ADD available for continuation using audit key {makerPending.audit_key}</p>}
      </div>
      <div className="rounded-2xl p-5 bg-white/70 border border-white/80">
        <div className="flex items-center gap-2 mb-4"><History size={14} className="text-indigo-500" /><h2 className="text-sm font-bold">Lifecycle History</h2></div>
        <AuditTimeline entries={auditEntries} isLoading={auditLoading} onContinueRejectedAdd={(entry) => { setContinueTarget(entry); setContinueMode("edit"); setContinueJson(JSON.stringify(entry.after_data ?? {}, null, 2)); }} />
      </div>
      {action && (
        <LifecycleMutationDialog
          open={true}
          title={`Institution ${action}`}
          onClose={() => setAction(null)}
          onSubmit={() => void submitAction()}
          checkerConfig={{ checker_mode: "ANY", checker_assignments: [], required_checker_count: 1 }}
          setCheckerConfig={() => {}}
          candidates={[]}
          showCheckerConfig={false}
        >
          <div className="space-y-3">
            {action === "edit" && <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" />}
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Remark" className="w-full rounded-xl border px-3 py-2 text-sm min-h-24" />
          </div>
        </LifecycleMutationDialog>
      )}
      {continueTarget && (
        <LifecycleMutationDialog
          open={true}
          title="Continue rejected ADD"
          onClose={() => setContinueTarget(null)}
          onSubmit={() => void submitContinue()}
          checkerConfig={{ checker_mode: "ANY", checker_assignments: [], required_checker_count: 1 }}
          setCheckerConfig={() => {}}
          candidates={[]}
          showCheckerConfig={false}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setContinueMode("edit")} className="px-3 py-1.5 rounded-lg text-xs font-bold border">Edit continuation</button>
              <button type="button" onClick={() => setContinueMode("delete")} className="px-3 py-1.5 rounded-lg text-xs font-bold border">Delete continuation</button>
            </div>
            {continueMode === "edit" && <textarea value={continueJson} onChange={(e) => setContinueJson(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm min-h-40 font-mono" />}
            <textarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Remark" className="w-full rounded-xl border px-3 py-2 text-sm min-h-24" />
          </div>
        </LifecycleMutationDialog>
      )}
    </div>
  );
}
