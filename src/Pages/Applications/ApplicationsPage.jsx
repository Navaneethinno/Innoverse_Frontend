import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, AppWindow, Plus, X } from "lucide-react";
import { useAuth } from "../../Hooks/useAuth";
import { PendingTable } from "@/Components/MakerChecker/PendingTable";
import { MakerCheckerConfig } from "@/Components/MakerChecker/MakerCheckerConfig";
import { LifecycleMutationDialog } from "@/Components/MakerChecker/LifecycleMutationDialog";
import { AuditTimeline } from "@/Components/MakerChecker/AuditTimeline";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { Skeleton } from "../../Components/UI/skeleton";
import { notifications } from "../../Utils/Lib/notifications";
import { cn } from "../../Utils/Lib/utils";
import { applicationsApi } from "@/Services/Applications/applications.api";
import {
  useApplicationAssignmentMutation,
  useApplicationCreateMutation,
  useApplicationDecisionMutation,
  useApplicationLifecycleMutation,
  useApplicationUpdateMutation,
  useApplicationsQuery,
  useAssignmentPendingApplicationsQuery,
  useContinueRejectedApplicationMutation,
  usePendingApplicationsQuery,
} from "@/Hooks/Applications/applicationHooks";
import { useInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { useUsersQuery } from "@/Hooks/Users/userHooks";
const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};
export function ApplicationsPage() {
  const currentUser = useAuth((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";
  const { data: institutions = [] } = useInstitutionsQuery(isPlatformOwner);
  const { data: users = [] } = useUsersQuery();
  const [activeTab, setActiveTab] = useState("all");
  const applicationsQuery = useApplicationsQuery(
    activeTab === "all" || activeTab === "assignments",
  );
  const pendingQuery = usePendingApplicationsQuery(activeTab === "pending");
  const assignmentPendingQuery = useAssignmentPendingApplicationsQuery(activeTab === "assignments");
  const applications = applicationsQuery.data ?? [];
  const pending = pendingQuery.data ?? [];
  const assignPending = assignmentPendingQuery.data ?? [];
  const activeQuery =
    activeTab === "all"
      ? applicationsQuery
      : activeTab === "pending"
        ? pendingQuery
        : assignmentPendingQuery;
  const isLoading = activeQuery.isLoading;
  const error = activeQuery.error;
  const createMutation = useApplicationCreateMutation();
  const assignmentMutation = useApplicationAssignmentMutation();
  const updateMutation = useApplicationUpdateMutation();
  const lifecycleMutation = useApplicationLifecycleMutation();
  const decisionMutation = useApplicationDecisionMutation();
  const continueMutation = useContinueRejectedApplicationMutation();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", remark: "" });
  const [checkerConfig, setCheckerConfig] = useState({
    checker_mode: "ANY",
    checker_assignments: [],
    required_checker_count: 1,
  });
  const [submitting, setSubmitting] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [selectedAction, setSelectedAction] = useState(null);
  const [actionRemark, setActionRemark] = useState("");
  const [actionName, setActionName] = useState("");
  const [auditEntries, setAuditEntries] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [continueTarget, setContinueTarget] = useState(null);
  const [continueMode, setContinueMode] = useState("edit");
  const [continueJson, setContinueJson] = useState("");
  const [selectedInst, setSelectedInst] = useState("");
  const [selectedApp, setSelectedApp] = useState("");
  const [assigning, setAssigning] = useState(false);
  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      notifications.error("Code and name are required");
      return;
    }
    setSubmitting(true);
    try {
      await createMutation.mutateAsync({
        code: form.code,
        name: form.name,
        remark: form.remark || null,
        ...checkerConfig,
      });
      notifications.success("Application creation request submitted for approval");
      setShowForm(false);
      setForm({ code: "", name: "", remark: "" });
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to create application");
    } finally {
      setSubmitting(false);
    }
  };
  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedInst || !selectedApp) {
      notifications.error("Select both institution and application");
      return;
    }
    setAssigning(true);
    try {
      await assignmentMutation.mutateAsync({
        institutionId: selectedInst,
        applicationId: selectedApp,
      });
      notifications.success("Application assignment request submitted for approval");
      setSelectedInst("");
      setSelectedApp("");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to assign application");
    } finally {
      setAssigning(false);
    }
  };
  const handleApprove = async (request_id) => {
    try {
      await decisionMutation.mutateAsync({ requestId: request_id, decision: "approve" });
      notifications.success("Request approved");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to approve");
    }
  };
  const handleReject = async (request_id) => {
    try {
      await decisionMutation.mutateAsync({ requestId: request_id, decision: "reject" });
      notifications.success("Request rejected");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to reject");
    }
  };
  const handleApproveAssign = async (request_id) => {
    try {
      await decisionMutation.mutateAsync({ requestId: request_id, decision: "approve" });
      notifications.success("Assignment approved");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to approve");
    }
  };
  const handleRejectAssign = async (request_id) => {
    try {
      await decisionMutation.mutateAsync({ requestId: request_id, decision: "reject" });
      notifications.success("Assignment rejected");
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to reject");
    }
  };
  const openAction = async (app, action) => {
    setSelectedApplication(app);
    setSelectedAction(action);
    setActionName(app.name ?? "");
    setActionRemark("");
    setAuditLoading(true);
    try {
      setAuditEntries(await applicationsApi.audit(app.id));
    } catch {
      setAuditEntries([]);
    } finally {
      setAuditLoading(false);
    }
  };
  const submitAction = async () => {
    if (!selectedApplication || !selectedAction) return;
    try {
      if (selectedAction === "edit") {
        await updateMutation.mutateAsync({
          id: selectedApplication.id,
          payload: { name: actionName || undefined, remark: actionRemark || null },
        });
      } else {
        await lifecycleMutation.mutateAsync({
          id: selectedApplication.id,
          action: selectedAction,
          payload: { remark: actionRemark || null },
        });
      }
      notifications.success("Application request submitted for approval");
      setSelectedApplication(null);
      setSelectedAction(null);
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to submit application request");
    }
  };
  const submitContinue = async () => {
    if (!continueTarget) return;
    let after_data;
    if (continueMode === "edit") {
      try {
        after_data = continueJson ? JSON.parse(continueJson) : undefined;
      } catch {
        notifications.error("Rejected ADD continuation must be valid JSON");
        return;
      }
    }
    try {
      if (continueMode === "edit") {
        await continueMutation.mutateAsync({
          requestId: String(continueTarget.request_id),
          payload: { after_data, remark: actionRemark || null },
          mode: continueMode,
        });
      } else {
        await continueMutation.mutateAsync({
          requestId: String(continueTarget.request_id),
          payload: { remark: actionRemark || null },
          mode: continueMode,
        });
      }
      notifications.success("Rejected ADD continued");
      setContinueTarget(null);
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to continue rejected ADD");
    }
  };
  return (
    <div className="pt-4 pb-8">
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-end justify-between mb-6"
      >
        <div>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">
            Management
          </p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            Applications
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            {applications.length} available
          </p>
        </div>
        {activeTab === "all" && isPlatformOwner && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-200/50"
            style={{ background: "linear-gradient(135deg, #2266EE 0%, #26FFFF 100%)" }}
          >
            <Plus size={14} /> New Application
          </motion.button>
        )}
      </motion.div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit flex-wrap"
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
      >
        {[
          { key: "all", label: "All Applications" },
          { key: "pending", label: "Pending Approvals" },
          { key: "assignments", label: "Assignment Pending" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === key ? "text-white shadow-md" : "text-slate-500 hover:text-blue-600",
            )}
            style={
              activeTab === key ? { background: "linear-gradient(135deg, #2266EE, #26FFFF)" } : {}
            }
          >
            {label}
          </button>
        ))}
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && activeTab === "all" && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-6 mb-6"
            style={glass}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-slate-800">New Application</h2>
              <button
                onClick={() => setShowForm(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {["code", "name", "remark"].map((key) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                    {key}
                  </label>
                  <input
                    value={form[key] ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    placeholder={key === "remark" ? "Optional" : key.toUpperCase()}
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                    style={{
                      background: "var(--glass-bg)",
                      border: "1px solid rgba(34,102,238,0.15)",
                    }}
                  />
                </div>
              ))}
              <div className="sm:col-span-3 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <motion.button
                  type="submit"
                  disabled={submitting}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-200/50 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #2266EE 0%, #26FFFF 100%)" }}
                >
                  {submitting ? "Submitting…" : "Submit for Approval"}
                </motion.button>
              </div>
              <div className="sm:col-span-3">
                <MakerCheckerConfig
                  value={checkerConfig}
                  onChange={setCheckerConfig}
                  candidates={users.map((u) => ({
                    id: u.id,
                    name: u.username,
                    institution_id: u.institution?.id,
                  }))}
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
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 mb-6"
          style={glass}
        >
          <h2 className="text-sm font-bold text-slate-800 mb-4">Assign to Institution</h2>
          <form onSubmit={handleAssign} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Institution
              </label>
              <select
                value={selectedInst}
                onChange={(e) => setSelectedInst(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid rgba(34,102,238,0.15)",
                }}
              >
                <option value="">Select institution…</option>
                {institutions.map((i) => (
                  <option key={i.id} value={String(i.id)}>
                    {i.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">
                Application
              </label>
              <select
                value={selectedApp}
                onChange={(e) => setSelectedApp(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-200"
                style={{
                  background: "var(--glass-bg)",
                  border: "1px solid rgba(34,102,238,0.15)",
                }}
              >
                <option value="">Select application…</option>
                {applications.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <motion.button
                type="submit"
                disabled={assigning}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-blue-200/50 disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, #2266EE 0%, #26FFFF 100%)" }}
              >
                {assigning ? "Assigning…" : "Assign"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} />{" "}
          {error instanceof Error ? error.message : "Failed to load applications"}
          <button
            onClick={() => void activeQuery.refetch()}
            className="ml-auto text-xs font-bold underline"
          >
            Retry
          </button>
        </div>
      )}

      {activeTab === "pending" ? (
        <PendingTable
          requests={pending}
          isLoading={isLoading}
          currentUserId={currentUser?.id}
          onApprove={handleApprove}
          onReject={handleReject}
          entityLabel="application"
        />
      ) : activeTab === "assignments" ? (
        <PendingTable
          requests={assignPending}
          isLoading={isLoading}
          currentUserId={currentUser?.id}
          onApprove={handleApproveAssign}
          onReject={handleRejectAssign}
          entityLabel="assignment"
        />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={glass}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100/80">
                {["Code", "Name", "Status"].map((h) => (
                  <th
                    key={h}
                    className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5">
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : applications.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center">
                        <AppWindow size={20} className="text-blue-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">No applications found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                applications.map((a, i) => (
                  <motion.tr
                    key={a.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">
                      {a.code}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">
                      {a.name}
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <StatusBadge status={a.auth_status ?? a.status ?? ""} />
                    </td>
                    <td className="px-5 py-3.5 text-center">
                      <div className="flex flex-wrap justify-center gap-2">
                        <button
                          onClick={() => void openAction(a, "edit")}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => void openAction(a, "delete")}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200"
                        >
                          Delete
                        </button>
                        <button
                          onClick={() => void openAction(a, "activate")}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200"
                        >
                          Activate
                        </button>
                        <button
                          onClick={() => void openAction(a, "deactivate")}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-bold border border-slate-200"
                        >
                          Deactivate
                        </button>
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
          onClose={() => {
            setSelectedApplication(null);
            setSelectedAction(null);
          }}
          onSubmit={() => void submitAction()}
          checkerConfig={{
            checker_mode: "ANY",
            checker_assignments: [],
            required_checker_count: 1,
          }}
          setCheckerConfig={() => {}}
          candidates={users.map((u) => ({
            id: u.id,
            name: u.username,
            institution_id: u.institution?.id,
          }))}
          makerInstitutionId={currentUser?.institution?.id}
          currentMakerId={currentUser?.id}
          showCheckerConfig={false}
        >
          <div className="space-y-3">
            {selectedAction === "edit" && (
              <input
                value={actionName}
                onChange={(e) => setActionName(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm"
                placeholder="Application name"
              />
            )}
            <textarea
              value={actionRemark}
              onChange={(e) => setActionRemark(e.target.value)}
              placeholder="Remark"
              className="w-full rounded-xl border px-3 py-2 text-sm min-h-24"
            />
            <div className="rounded-2xl border border-slate-100 p-4">
              <h3 className="text-xs font-bold mb-3">Lifecycle</h3>
              <AuditTimeline
                entries={auditEntries}
                isLoading={auditLoading}
                onContinueRejectedAdd={(entry) => {
                  setContinueTarget(entry);
                  setContinueMode("edit");
                  setContinueJson(JSON.stringify(entry.after_data ?? {}, null, 2));
                }}
              />
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
          checkerConfig={{
            checker_mode: "ANY",
            checker_assignments: [],
            required_checker_count: 1,
          }}
          setCheckerConfig={() => {}}
          candidates={users.map((u) => ({
            id: u.id,
            name: u.username,
            institution_id: u.institution?.id,
          }))}
          makerInstitutionId={currentUser?.institution?.id}
          currentMakerId={currentUser?.id}
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setContinueMode("edit")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border"
              >
                Edit continuation
              </button>
              <button
                type="button"
                onClick={() => setContinueMode("delete")}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border"
              >
                Delete continuation
              </button>
            </div>
            {continueMode === "edit" && (
              <textarea
                value={continueJson}
                onChange={(e) => setContinueJson(e.target.value)}
                className="w-full rounded-xl border px-3 py-2 text-sm min-h-40 font-mono"
              />
            )}
            <textarea
              value={actionRemark}
              onChange={(e) => setActionRemark(e.target.value)}
              placeholder="Remark"
              className="w-full rounded-xl border px-3 py-2 text-sm min-h-24"
            />
          </div>
        </LifecycleMutationDialog>
      )}
    </div>
  );
}
