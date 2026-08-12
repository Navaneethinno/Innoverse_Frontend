import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, Layers, AlertCircle } from "lucide-react";
import { useProfileStore } from "../../features/profiles/profile.store";
import { useAuthStore } from "../../features/auth/auth.store";
import { useInstitutionStore } from "../../features/institution/institution.store";
import { Skeleton } from "../../components/ui/skeleton";
import { notifications } from "../../lib/notifications";
import type { CreateProfilePayload } from "../../features/profiles/profile.types";
import type { Permission, SetPermissionsPayload } from "../../features/profiles/profile.types";

const glass = {
  background: "rgba(255,255,255,0.65)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.85)",
  boxShadow: "0 4px 24px rgba(108,127,255,0.08), 0 1px 3px rgba(108,127,255,0.04)",
};

const AVAILABLE_PERMISSIONS: Permission[] = [
  { menu_code: "USERS",        action_code: "VIEW" },
  { menu_code: "USERS",        action_code: "ADD" },
  { menu_code: "PROFILES",     action_code: "VIEW" },
  { menu_code: "PROFILES",     action_code: "ADD" },
  { menu_code: "INSTITUTIONS", action_code: "VIEW" },
  { menu_code: "INSTITUTIONS", action_code: "ADD" },
  { menu_code: "INSTITUTIONS", action_code: "AUTHORIZE" },
  { menu_code: "APPLICATIONS", action_code: "VIEW" },
  { menu_code: "APPLICATIONS", action_code: "ADD" },
  { menu_code: "KYC",          action_code: "VIEW" },
  { menu_code: "KYC",          action_code: "ADD" },
];

const permKey = (p: Permission) => `${p.menu_code}/${p.action_code}`;

export function ProfilesPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isPlatformOwner = currentUser?.institution?.type === "PLATFORM_OWNER";

  const { profiles, isLoading, error, fetchProfiles, createProfile, setPermissions } = useProfileStore();
  const { institutions, fetchInstitutions } = useInstitutionStore();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateProfilePayload>({ code: "", name: "", institution_id: "" });
  const [submitting, setSubmitting] = useState(false);
  const [permTarget, setPermTarget] = useState<string | number | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<Permission[]>([]);

  useEffect(() => {
    void fetchProfiles();
    if (isPlatformOwner) void fetchInstitutions();
  }, [fetchProfiles, fetchInstitutions, isPlatformOwner]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code || !form.name) {
      notifications.error("Code and name are required");
      return;
    }
    setSubmitting(true);
    const payload: CreateProfilePayload = {
      code: form.code,
      name: form.name,
      institution_id: isPlatformOwner ? form.institution_id : (currentUser?.institution?.id ?? ""),
    };
    const result = await createProfile(payload);
    setSubmitting(false);
    if (result) {
      notifications.success("Profile creation request submitted for approval");
      setForm({ code: "", name: "", institution_id: "" });
      setShowForm(false);
    } else {
      notifications.error(useProfileStore.getState().error ?? "Failed to create profile");
    }
  };

  const togglePerm = (perm: Permission) => {
    const key = permKey(perm);
    setSelectedPerms((prev) =>
      prev.some((p) => permKey(p) === key)
        ? prev.filter((p) => permKey(p) !== key)
        : [...prev, perm]
    );
  };

  const handleSavePermissions = async () => {
    if (!permTarget) return;
    const payload: SetPermissionsPayload = { permissions: selectedPerms };
    const ok = await setPermissions(permTarget, payload);
    if (ok) {
      notifications.success("Permissions update request submitted");
      setPermTarget(null);
    } else {
      notifications.error(useProfileStore.getState().error ?? "Failed to update permissions");
    }
  };

  // Group permissions by menu_code for display
  const grouped = AVAILABLE_PERMISSIONS.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.menu_code] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div className="pt-4 pb-8">
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-1">Management</p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">Profiles</h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">{profiles.length} total</p>
        </div>
        {isPlatformOwner && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200/50"
            style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
          >
            <Plus size={14} /> New Profile
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
              <h2 className="text-sm font-bold text-slate-800">New Profile</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
                <X size={14} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(["code", "name"] as const).map((key) => (
                <div key={key}>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">{key}</label>
                  <input
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                    style={{ background: "rgba(255,255,255,0.80)", border: "1px solid rgba(108,127,255,0.15)" }}
                  />
                </div>
              ))}
              {isPlatformOwner && (
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-widest mb-1">Institution</label>
                  <select
                    value={String(form.institution_id)}
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
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
                <motion.button
                  type="submit" disabled={submitting}
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50 disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
                >
                  {submitting ? "Creating…" : "Create Profile"}
                </motion.button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Permissions dialog */}
      <AnimatePresence>
        {permTarget !== null && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setPermTarget(null)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="relative rounded-2xl p-6 w-full max-w-md overflow-y-auto max-h-[80vh]"
              style={{ background: "rgba(255,255,255,0.96)", border: "1px solid rgba(255,255,255,0.95)", boxShadow: "0 24px 64px rgba(108,127,255,0.16)" }}
            >
              <h3 className="text-sm font-bold text-slate-800 mb-1">Set Permissions</h3>
              <p className="text-xs text-slate-400 mb-4">Full replace — send the complete desired set.</p>
              <div className="space-y-4 mb-5">
                {Object.entries(grouped).map(([menu, perms]) => (
                  <div key={menu}>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{menu}</p>
                    <div className="flex flex-wrap gap-2">
                      {perms.map((perm) => {
                        const active = selectedPerms.some((p) => permKey(p) === permKey(perm));
                        return (
                          <button
                            key={permKey(perm)}
                            type="button"
                            onClick={() => togglePerm(perm)}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                            style={active
                              ? { background: "linear-gradient(135deg, #6C7FFF, #B39DFA)", color: "white", border: "none" }
                              : { background: "rgba(255,255,255,0.80)", color: "#64748b", border: "1px solid rgba(108,127,255,0.15)" }
                            }
                          >
                            {perm.action_code}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setPermTarget(null)} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors border border-slate-200/60">Cancel</button>
                <button
                  onClick={() => void handleSavePermissions()}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white shadow-md shadow-indigo-200/50"
                  style={{ background: "linear-gradient(135deg, #6C7FFF 0%, #B39DFA 100%)" }}
                >
                  Save
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {error}
          <button onClick={() => void fetchProfiles()} className="ml-auto text-xs font-bold underline">Retry</button>
        </div>
      )}

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-2xl overflow-hidden" style={glass}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {["Code", "Name", "Institution", "Permissions", "Actions"].map((h) => (
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
            ) : profiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center">
                      <Layers size={20} className="text-indigo-400" />
                    </div>
                    <p className="text-sm font-bold text-slate-600">No profiles found</p>
                    <p className="text-xs text-slate-400">Create one to get started</p>
                  </div>
                </td>
              </tr>
            ) : (
              profiles.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.04 }}
                  className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                >
                  <td className="px-5 py-3.5 text-xs font-bold text-slate-700 font-mono text-center">{p.code}</td>
                  <td className="px-5 py-3.5 text-xs font-semibold text-slate-800 text-center">{p.name}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">{p.institution?.name ?? "-"}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500 text-center">
                    {p.permissions?.length
                      ? p.permissions.map((perm) => `${perm.menu_code}/${perm.action_code}`).join(", ")
                      : "-"}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    <button
                      onClick={() => { setPermTarget(p.id); setSelectedPerms(p.permissions ?? []); }}
                      className="px-3 py-1.5 rounded-xl text-[11px] font-bold text-indigo-600 border border-indigo-200/60 hover:bg-indigo-50/60 transition-colors"
                    >
                      Permissions
                    </button>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}
