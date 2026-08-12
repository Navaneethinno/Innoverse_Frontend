import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Users, AlertCircle, Check, ClipboardCheck } from "lucide-react";
import { useUserStore } from "../../features/users/user.store";
import { useProfileStore } from "../../features/profiles/profile.store";
import { useAuthStore } from "../../features/auth/auth.store";
import { Skeleton } from "../../components/ui/skeleton";
import { notifications } from "../../lib/notifications";
import { cn } from "../../lib/utils";
import { toast } from "sonner";
import type { CreateUserPayload } from "../../features/users/user.types";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

const EMPTY_FORM: CreateUserPayload = { username: "", password: "", profile_id: "", remark: "" };

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";

  const { users, pendingUsers, isLoading, error, fetchUsers, fetchPendingUsers, createUser, approveUser, rejectUser } = useUserStore();
  const { profiles, fetchProfiles } = useProfileStore();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "pending">("all");

  useEffect(() => {
    void fetchUsers();
    void fetchProfiles();
    void fetchPendingUsers();
  }, [fetchUsers, fetchProfiles, fetchPendingUsers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.profile_id) {
      notifications.error("Username, password and profile are required");
      return;
    }
    setSubmitting(true);
    const result = await createUser({
      username: form.username,
      password: form.password,
      profile_id: form.profile_id,
      remark: form.remark || null,
    });
    setSubmitting(false);
    if (result) {
      notifications.success("User creation request submitted for approval");
      setForm(EMPTY_FORM);
      setShowForm(false);
      void fetchPendingUsers();
    } else {
      notifications.error(useUserStore.getState().error ?? "Failed to create user");
    }
  };

  const handleApprove = async (request_id: string) => {
    const ok = await approveUser(request_id);
    if (ok) toast.success("User request approved");
    else toast.error(useUserStore.getState().error ?? "Failed to approve");
  };

  const handleReject = async (request_id: string) => {
    const ok = await rejectUser(request_id);
    if (ok) toast.success("User request rejected");
    else toast.error(useUserStore.getState().error ?? "Failed to reject");
  };

  const visibleProfiles = profiles.filter((p) =>
    isPlatformOwner ? true : String(p.institution?.id) === String(currentUser?.institution?.id)
  );

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Management</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Users</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">{users.length} total</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
          style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
        >
          <Plus size={14} /> New User
        </motion.button>
      </motion.div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)" }}>
        {(["all", "pending"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
              activeTab === tab ? "text-white shadow-md" : "text-slate-500 hover:text-indigo-600"
            )}
            style={activeTab === tab ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)" } : {}}
          >
            {tab === "pending" && (
              <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-700 text-[9px] font-black flex items-center justify-center">
                {pendingUsers.length}
              </span>
            )}
            {tab === "all" ? "All Users" : "Pending Approvals"}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-6 mb-6" style={glass}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-800">New User</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Username</label>
                <input
                  value={form.username}
                  onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Password</label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Profile</label>
                <select
                  value={String(form.profile_id)}
                  onChange={(e) => setForm((f) => ({ ...f, profile_id: e.target.value }))}
                  className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
                >
                  <option value="">Select profile…</option>
                  {visibleProfiles.map((p) => (
                    <option key={p.id} value={String(p.id)}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Remark</label>
                <input
                  value={form.remark ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, remark: e.target.value }))}
                  placeholder="Optional remark"
                  className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                  style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                  Cancel
                </button>
                <motion.button
                  type="submit" disabled={submitting}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
                >
                  {submitting ? "Submitting…" : "Submit for Approval"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={() => void fetchUsers()} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      {activeTab === "all" ? (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glass}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100/80">
                {["Username", "Profile", "Institution", "Status", "Created At"].map((h) => (
                  <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-24 mx-auto" /></td>
                    ))}
                  </tr>
                ))
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                        <Users size={20} className="text-indigo-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">No users found</p>
                      <p className="text-xs text-slate-400">Submit a request to create one</p>
                    </div>
                  </td>
                </tr>
              ) : (
                users.map((u, i) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                    className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                  >
                    <td className="px-5 py-3.5 text-xs font-bold text-slate-700 text-center">{u.username}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.profile?.name ?? "-"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.institution?.name ?? "-"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.auth_status ?? u.status ?? "-"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{u.created_at ?? "-"}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </motion.div>
      ) : (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glass}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100/80">
                {["Action", "Username", "Maker", "Approvals", "Actions"].map((h) => (
                  <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <tr key={i} className="border-b border-slate-50">
                    {Array.from({ length: 5 }).map((_, j) => (
                      <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-24 mx-auto" /></td>
                    ))}
                  </tr>
                ))
              ) : pendingUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-16 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <ClipboardCheck size={20} className="text-emerald-400" />
                      </div>
                      <p className="text-sm font-bold text-slate-600">All caught up</p>
                      <p className="text-xs text-slate-400">No pending user requests</p>
                    </div>
                  </td>
                </tr>
              ) : (
                pendingUsers.map((req, i) => {
                  const after = (req.after_data ?? {}) as Record<string, unknown>;
                  const isMaker = String(req.maker?.id) === String(currentUser?.id);
                  return (
                    <motion.tr
                      key={req.request_id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                      className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                    >
                      <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">{req.action}</td>
                      <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">{String(after.username ?? req.entity_id)}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{req.maker?.name ?? "—"}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{req.approval_count} / {req.required_checker_count}</td>
                      <td className="px-5 py-3.5 text-center">
                        {isMaker ? (
                          <span className="text-[11px] text-slate-400 italic">You submitted this</span>
                        ) : (
                          <div className="flex items-center justify-center gap-2">
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => void handleReject(req.request_id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-red-500 border border-red-200/60 hover:bg-red-50/60 transition-colors"
                            >
                              <X size={11} /> Reject
                            </motion.button>
                            <motion.button
                              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                              onClick={() => void handleApprove(req.request_id)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold text-white shadow-md shadow-emerald-200/50"
                              style={{ background: "linear-gradient(135deg, #6EDFC4 0%, #3BBFA0 100%)" }}
                            >
                              <Check size={11} /> Approve
                            </motion.button>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </motion.div>
      )}
    </div>
  );
}
