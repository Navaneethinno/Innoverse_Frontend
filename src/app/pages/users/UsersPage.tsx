import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Users, AlertCircle } from "lucide-react";
import { useUserStore } from "../../features/users/user.store";
import { useProfileStore } from "../../features/profiles/profile.store";
import { useAuthStore } from "../../features/auth/auth.store";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { Skeleton } from "../../components/ui/skeleton";
import { notifications } from "../../lib/notifications";
import type { CreateUserPayload } from "../../features/users/user.types";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

const EMPTY_FORM: CreateUserPayload = { username: "", password: "", profile_id: "" };

export function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";

  const { users, isLoading, error, fetchUsers, createUser } = useUserStore();
  const { profiles, fetchProfiles } = useProfileStore();
  const { institutions, fetchInstitutions } = useInstitutionStore();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    void fetchUsers();
    void fetchProfiles();
    if (isPlatformOwner) void fetchInstitutions();
  }, [fetchUsers, fetchProfiles, fetchInstitutions, isPlatformOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.username || !form.password || !form.profile_id) {
      notifications.error("Username, password and profile are required");
      return;
    }
    setSubmitting(true);
    const payload: CreateUserPayload = {
      username: form.username,
      password: form.password,
      profile_id: form.profile_id,
      ...(!isPlatformOwner && currentUser?.institution?.id
        ? { institution_id: currentUser.institution.id }
        : form.institution_id
          ? { institution_id: form.institution_id }
          : {}),
    };
    const created = await createUser(payload);
    setSubmitting(false);
    if (created) {
      notifications.success(`User created. Temporary password: 123`);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } else {
      notifications.error(useUserStore.getState().error ?? "Failed to create user");
    }
  };

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Management</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Users</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">{users.length} total</p>
        </div>
        {isPlatformOwner && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
            style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
          >
            <Plus size={14} /> New User
          </motion.button>
        )}
      </motion.div>

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
                  {profiles
                    .filter((p) => isPlatformOwner
                      ? (!form.institution_id || String(p.institution?.id) === String(form.institution_id))
                      : String(p.institution?.id) === String(currentUser?.institution?.id)
                    )
                    .map((p) => (
                      <option key={p.id} value={String(p.id)}>{p.name}</option>
                    ))}
                </select>
              </div>
              {isPlatformOwner && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Institution</label>
                  <select
                    value={String(form.institution_id ?? "")}
                    onChange={(e) => setForm((f) => ({ ...f, institution_id: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
                  >
                    <option value="">Select institution…</option>
                    {institutions.map((i) => (
                      <option key={i.id} value={String(i.id)}>{i.name}</option>
                    ))}
                  </select>
                </div>
              )}
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
                  {submitting ? "Creating…" : "Create User"}
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

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glass}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {["Username", "Profile", "Institution", "Created At"].map((h) => (
                <th key={h} className="text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-24 mx-auto" /></td>
                  ))}
                </tr>
              ))
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <Users size={20} className="text-indigo-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">No users found</p>
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
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-700 text-center">{u.username}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.profile?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{u.institution?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-400 text-center">{u.created_at ?? "-"}</td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
