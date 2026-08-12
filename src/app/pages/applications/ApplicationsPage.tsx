import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, AppWindow, Plus, X, Check, ClipboardCheck } from "lucide-react";
import { useAuthStore } from "../../features/auth/auth.store";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { useUserStore } from "../../features/users/user.store";
import { apiService } from "../../features/api.service";
import { PendingTable } from "../../components/common/PendingTable";
import { MakerCheckerConfig } from "../../components/common/MakerCheckerConfig";
import { LifecycleMutationDialog } from "../../components/common/LifecycleMutationDialog";
import { AuditTimeline } from "../../components/common/AuditTimeline";
import { StatusBadge } from "../../components/common/StatusBadge";
import { Skeleton } from "../../components/ui/skeleton";
import { notifications } from "../../lib/notifications";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import type { Application, CreateApplicationPayload } from "../../features/applications/application.types";
import type { PendingRequestOut, AuditEntryOut } from "../../features/maker-checker.types";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

type ActiveTab = "all" | "pending" | "assignments";

export function ApplicationsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";

  const { institutions, fetchInstitutions } = useInstitutionStore();
  const { users, fetchUsers } = useUserStore();
  const [applications, setApplications] = useState<Application[]>([]);
  const [pending, setPending] = useState<PendingRequestOut[]>([]);
  const [assignPending, setAssignPending] = useState<PendingRequestOut[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("all");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateApplicationPayload>({ code: "", name: "", remark: "" });
  const [checkerConfig, setCheckerConfig] = useState({ checker_mode: "ANY" as const, checker_assignments: [], required_checker_count: 1 });
  const [submitting, setSubmitting] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [selectedAction, setSelectedAction] = useState<"edit" | "delete" | "activate" | "deactivate" | null>(null);
  const [actionRemark, setActionRemark] = useState("");
  const [actionName, setActionName] = useState("");
  const [auditEntries, setAuditEntries] = useState<AuditEntryOut[]>([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [continueTarget, setContinueTarget] = useState<AuditEntryOut | null>(null);
  const [continueMode, setContinueMode] = useState<"edit" | "delete">("edit");
  const [continueJson, setContinueJson] = useState("");

  const [selectedInst, setSelectedInst] = useState("");
  const [selectedApp, setSelectedApp] = useState("");
  const [assigning, setAssigning] = useState(false);

  const loadAll = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setApplications(await apiService.getApplications());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load applications");
    } finally {
      setIsLoading(false);
    }
  };

  const loadPending = async () => {
    setIsLoading(true);
    try {
      setPending(await apiService.getPendingApplications());
    } catch { setPending([]); }
    finally { setIsLoading(false); }
  };

  const loadAssignPending = async () => {
    if (!currentUser?.institution?.id) return;
    setIsLoading(true);
    try {
      setAssignPending(await apiService.getPendingInstitutionApplications(currentUser.institution.id));
    } catch { setAssignPending([]); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    if (activeTab === "all") void loadAll();
    else if (activeTab === "pending") void loadPending();
    else void loadAssignPending();
    if (isPlatformOwner) void fetchInstitutions();
    void fetchUsers();
  }, [activeTab, fetchInstitutions, fetchUsers, isPlatformOwner]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) { notifications.error("Code and name are required"); return; }
    setSubmitting(true);
    try {
      await apiService.createApplication({ code: form.code, name: form.name, remark: form.remark || null, ...checkerConfig });
      notifications.success("Application creation request submitted for approval");
      setShowForm(false);
      setForm({ code: "", name: "", remark: "" });
      void loadAll();
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to create application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInst || !selectedApp) { notifications.error("Select both institution and application"); return; }
    setAssigning(true);
    try {
      await apiService.assignApplication(selectedInst, selectedApp, null);
      notifications.success("Application assignment request submitted for approval");
      setSelectedInst("");
      setSelectedApp("");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to assign application");
    } finally {
      setAssigning(false);
    }
  };

  const handleApprove = async (request_id: string) => {
    try {
      await apiService.approveApplication(request_id);
      toast.success("Request approved");
      setPending((p) => p.filter((r) => r.request_id !== request_id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to approve"); }
  };

  const handleReject = async (request_id: string) => {
    try {
      await apiService.rejectApplication(request_id);
      toast.success("Request rejected");
      setPending((p) => p.filter((r) => r.request_id !== request_id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to reject"); }
  };

  const handleApproveAssign = async (request_id: string) => {
    try {
      await apiService.approveInstitutionApplication(request_id);
      toast.success("Assignment approved");
      setAssignPending((p) => p.filter((r) => r.request_id !== request_id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to approve"); }
  };

  const handleRejectAssign = async (request_id: string) => {
    try {
      await apiService.rejectInstitutionApplication(request_id);
      toast.success("Assignment rejected");
      setAssignPending((p) => p.filter((r) => r.request_id !== request_id));
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed to reject"); }
  };

  const openAction = async (app: Application, action: "edit" | "delete" | "activate" | "deactivate") => {
    setSelectedApplication(app);
    setSelectedAction(action);
    setActionName(app.name ?? "");
    setActionRemark("");
    setAuditLoading(true);
    try {
      setAuditEntries(await apiService.getApplicationAudit(app.id));
    } catch {
      setAuditEntries([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const submitAction = async () => {
    if (!selectedApplication || !selectedAction) return;
    let result = null;
    if (selectedAction === "edit") result = await apiService.updateApplication(selectedApplication.id, { name: actionName || undefined, remark: actionRemark || null });
    if (selectedAction === "delete") result = await apiService.deleteApplication(selectedApplication.id, { remark: actionRemark || null });
    if (selectedAction === "activate") result = await apiService.activateApplication(selectedApplication.id, { remark: actionRemark || null });
    if (selectedAction === "deactivate") result = await apiService.deactivateApplication(selectedApplication.id, { remark: actionRemark || null });
    if (result) {
      notifications.success("Application request submitted for approval");
      setSelectedApplication(null);
      setSelectedAction(null);
      void loadAll();
    } else {
      notifications.error("Failed to submit application request");
    }
  };

  const submitContinue = async () => {
    if (!continueTarget) return;
    let after_data: Record<string, unknown> | undefined;
    if (continueMode === "edit") {
      try {
        after_data = continueJson ? JSON.parse(continueJson) : undefined;
      } catch {
        notifications.error("Rejected ADD continuation must be valid JSON");
        return;
      }
    }
    try {
      await apiService.continueRejectedApplicationAdd(String(continueTarget.request_id), { after_data, remark: actionRemark || null }, continueMode);
      notifications.success("Rejected ADD continued");
      setContinueTarget(null);
      void loadPending();
      void loadAll();
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to continue rejected ADD");
    }
  };

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Management</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Applications</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">{applications.length} available</p>
        </div>
        {activeTab === "all" && isPlatformOwner && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
            style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
          >
            <Plus size={14} /> New Application
          </motion.button>
        )}
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit flex-wrap" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {([
          { key: "all", label: "All Applications" },
          { key: "pending", label: "Pending Approvals" },
          { key: "assignments", label: "Assignment Pending" },
        ] as { key: ActiveTab; label: string }[]).map(({ key, label }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={cn("px-4 py-1.5 rounded-lg text-xs font-bold transition-all", activeTab === key ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600")}
            style={activeTab === key ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}>
            {label}
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && activeTab === "all" && (
          <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="rounded-2xl p-6 mb-6" style={glass}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800">New Application</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"><X size={14} /></button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {(["code", "name", "remark"] as const).map((key) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{key}</label>
                  <input value={form[key] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={key === "remark" ? "Optional" : key.toUpperCase()}
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }} />
                </div>
              ))}
              <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100">Cancel</button>
                <motion.button type="submit" disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}>
                  {submitting ? "Submitting…" : "Submit for Approval"}
                </motion.button>
              </div>
              <div className="sm:col-span-3">
                <MakerCheckerConfig
                  value={checkerConfig}
                  onChange={setCheckerConfig}
                  candidates={users.map((u) => ({ id: u.id, name: u.username, institution_id: u.institution?.id }))}
                  makerInstitutionId={currentUser?.institution?.id}
                  currentMakerId={currentUser?.id}
                />
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assign form */}
      {activeTab === "all" && isPlatformOwner && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl p-6 mb-6" style={glass}>
          <h2 className="text-sm font-bold text-slate-800 mb-4">Assign to Institution</h2>
          <form onSubmit={handleAssign} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Institution</label>
              <select value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}>
                <option value="">Select institution…</option>
                {institutions.map((i) => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Application</label>
              <select value={selectedApp} onChange={(e) => setSelectedApp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}>
                <option value="">Select application…</option>
                {applications.map((a) => <option key={a.id} value={String(a.id)}>{a.name}</option>)}
              </select>
            </div>
            <div className="flex items-end">
              <motion.button type="submit" disabled={assigning} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                className="w-full px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}>
                {assigning ? "Assigning…" : "Assign"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={loadAll} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      {activeTab === "pending" ? (
        <PendingTable requests={pending} isLoading={isLoading} currentUserId={currentUser?.id} onApprove={handleApprove} onReject={handleReject} entityLabel="application" />
      ) : activeTab === "assignments" ? (
        <PendingTable requests={assignPending} isLoading={isLoading} currentUserId={currentUser?.id} onApprove={handleApproveAssign} onReject={handleRejectAssign} entityLabel="assignment" />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={glass}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100/80">
                {["Code", "Name", "Status"].map((h) => (
                  <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-24 mx-auto" /></td>
                    ))}
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <AppWindow size={20} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">No applications found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((a, i) => (
                  <motion.tr key={a.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-50 hover:bg-white/60 transition-colors">
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">{a.code}</td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">{a.name}</td>
                    <td className="px-5 py-3.5 text-center"><StatusBadge status={a.auth_status ?? a.status ?? ""} /></td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button onClick={() => void openAction(a, "edit")} className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200">Edit</button>
                        <button onClick={() => void openAction(a, "delete")} className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200">Delete</button>
                        <button onClick={() => void openAction(a, "activate")} className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200">Activate</button>
                        <button onClick={() => void openAction(a, "deactivate")} className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200">Deactivate</button>
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {selectedApplication && selectedAction && (
        <LifecycleMutationDialog
          open
          title={`Application ${selectedAction}`}
          onClose={() => { setSelectedApplication(null); setSelectedAction(null); }}
          onSubmit={() => void submitAction()}
          checkerConfig={{ checker_mode: "ANY", checker_assignments: [], required_checker_count: 1 }}
          setCheckerConfig={() => {}}
          candidates={users.map((u) => ({ id: u.id, name: u.username, institution_id: u.institution?.id }))}
          makerInstitutionId={currentUser?.institution?.id}
          currentMakerId={currentUser?.id}
          showCheckerConfig={false}
        >
          <div className="space-y-3">
            {selectedAction === "edit" && (
              <input value={actionName} onChange={(e) => setActionName(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm" placeholder="Application name" />
            )}
            <textarea value={actionRemark} onChange={(e) => setActionRemark(e.target.value)} placeholder="Remark" className="w-full rounded-xl border px-3 py-2 text-sm min-h-24" />
            <div className="rounded-2xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold mb-3">Lifecycle</h3>
              <AuditTimeline entries={auditEntries} isLoading={auditLoading} onContinueRejectedAdd={(entry) => { setContinueTarget(entry); setContinueMode("edit"); setContinueJson(JSON.stringify(entry.after_data ?? {}, null, 2)); }} />
            </div>
          </div>
        </LifecycleMutationDialog>
      )}

      {continueTarget && (
        <LifecycleMutationDialog
          open
          title="Continue rejected ADD"
          onClose={() => setContinueTarget(null)}
          onSubmit={() => void submitContinue()}
          checkerConfig={{ checker_mode: "ANY", checker_assignments: [], required_checker_count: 1 }}
          setCheckerConfig={() => {}}
          candidates={users.map((u) => ({ id: u.id, name: u.username, institution_id: u.institution?.id }))}
          makerInstitutionId={currentUser?.institution?.id}
          currentMakerId={currentUser?.id}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <button type="button" onClick={() => setContinueMode("edit")} className="px-3 py-1.5 rounded-lg text-xs font-bold border">Edit continuation</button>
              <button type="button" onClick={() => setContinueMode("delete")} className="px-3 py-1.5 rounded-lg text-xs font-bold border">Delete continuation</button>
            </div>
            {continueMode === "edit" && <textarea value={continueJson} onChange={(e) => setContinueJson(e.target.value)} className="w-full rounded-xl border px-3 py-2 text-sm min-h-40 font-mono" />}
            <textarea value={actionRemark} onChange={(e) => setActionRemark(e.target.value)} placeholder="Remark" className="w-full rounded-xl border px-3 py-2 text-sm min-h-24" />
          </div>
        </LifecycleMutationDialog>
      )}
    </div>
  );
}
