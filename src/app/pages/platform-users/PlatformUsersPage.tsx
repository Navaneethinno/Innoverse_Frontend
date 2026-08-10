import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router";
import { apiService } from "../../features/api.service";
import { useAuthStore } from "../../features/auth/auth.store";
import { notifications } from "../../lib/notifications";
import type { PlatformUser, CreatePlatformUserPayload } from "../../features/platform-users/platformUser.types";
import { Skeleton } from "../../components/ui/skeleton";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

const STATUS_STYLES: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
};

const EMPTY_FORM: CreatePlatformUserPayload = { code: "", name: "", legal_name: "", email: "", phone: "", address: "" };

export function PlatformUsersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const canAdd = user?.permissions.includes("ADD") ?? false;
  const canAuthorize = user?.permissions.includes("AUTHORIZE") ?? false;

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreatePlatformUserPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      setUsers(await apiService.getPlatformUsers());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load platform users");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name || !form.email) {
      notifications.error("Code, name and email are required");
      return;
    }
    setSubmitting(true);
    try {
      await apiService.createPlatformUser(form);
      notifications.success("Sent for approval");
      setForm(EMPTY_FORM);
      setShowForm(false);
      void load();
    } catch (e) {
      notifications.error(e instanceof Error ? e.message : "Failed to create platform user");
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key: keyof CreatePlatformUserPayload, label: string, type = "text") => (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{label}</label>
      <input
        type={type}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
      />
    </div>
  );

  return (
    <div className="pt-4 pb-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Management</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Platform Users</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">{users.length} total registered</p>
        </div>
        <div className="flex items-center gap-2">
          {canAuthorize && (
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => navigate("/platform-users/pending")}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-indigo-600 border border-indigo-200/60 hover:bg-indigo-50/60 transition-colors"
            >
              <Clock size={14} /> Pending Approvals
            </motion.button>
          )}
          {canAdd && (
            <motion.button
              whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
              style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
            >
              <Plus size={14} /> New Platform User
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Create form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="rounded-2xl p-6 mb-6"
            style={glass}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-bold text-slate-800">New Platform User</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {field("code", "Code")}
              {field("name", "Name")}
              {field("legal_name", "Legal Name")}
              {field("email", "Email", "email")}
              {field("phone", "Phone", "tel")}
              {field("address", "Address")}
              <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2">
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

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={load} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      {/* Table */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glass}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {["Code", "Name", "Legal Name", "Email", "Owner", "Created By", "Approved By", "Status", "Created At"].map((h) => (
                <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-24" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <Users size={20} className="text-indigo-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">No platform users found</p>
                    <p className="text-xs text-slate-400">Create one to get started</p>
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
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">{u.code}</td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">{u.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.legal_name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.email}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.owner?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.created_by?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.approved_by?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-center">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${STATUS_STYLES[u.status] ?? STATUS_STYLES.PENDING}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {u.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{u.created_at}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
