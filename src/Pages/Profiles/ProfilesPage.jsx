import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AlertCircle, Eye, History, Pencil, Plus, Search, ShieldCheck, ShieldOff, Trash2, X } from "lucide-react";
import { Skeleton } from "@/Components/UI/skeleton";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { ProfileAuditModal } from "@/Components/Profiles/ProfileAuditModal";
import { ProfilePermissionTree } from "@/Components/Profiles/ProfilePermissionTree";
import {
  useHasProfileAction,
  useProfileAuthMutation,
  useProfileCreateMutation,
  useProfileDeauthMutation,
  useProfileDeleteAuthMutation,
  useProfileDeleteMutation,
  useProfileMenuItem,
  useProfileUpdateMutation,
  useProfilesQuery,
} from "@/Hooks/Profiles/profileHooks";
import { useActiveInstitutionsQuery } from "@/Hooks/Institutions/institutionHooks";
import { cn } from "@/Utils/Lib/cn";
import { notifications } from "@/Utils/Lib/notifications";

const glass = {
  background: "var(--glass-bg)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid var(--glass-border)",
  boxShadow: "var(--glass-shadow)",
};

// Fixed action ids for the checker's own Authorize/Deauthorize buttons, per
// payse's AuthProfile.jsx (action_id: 5 for authorize, 4 for deauthorize) —
// these identify the CHECKER's own action against the "Profiles" menu item,
// not any grant inside the profile record being approved. See
// profiles.api.js's auth/deauth comments for the full reasoning.
const AUTHORIZE_ACTION_ID = 5;
const DEAUTHORIZE_ACTION_ID = 4;

// Same tolerant-alias tab pattern as InstitutionListPage.jsx — no dedicated
// pending-add/pending-edit endpoint exists for Profile either, so tabs are
// client-side filters over the single /profile/list response. Exact
// auth_status strings unverified live for this entity; both the guessed and
// the institution-confirmed values are accepted per tab.
const TAB_STATUS_ALIASES = {
  ACTIVE: ["ACTIVE", "AUTHORIZED"],
  NEW_AUTH: ["NEW_AUTH", "NEW_WAIT_AUTH"],
  EDIT_AUTH: ["EDIT_AUTH", "EDIT_WAIT_AUTH"],
  INACTIVE: ["INACTIVE", "DEACTIVATED"],
};
const TABS = [
  { value: "all", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "NEW_AUTH", label: "Pending Add" },
  { value: "EDIT_AUTH", label: "Pending Edit" },
  { value: "INACTIVE", label: "Inactive" },
];

// Kept intentionally short — this is the list overview, not the detail
// view. Everything else (institution type/timezone/KYC, IDs, process
// status, created/updated audit trail, deauth narration, menu/action
// grants) is still available per-row via the Audit action (History icon),
// so nothing is lost — it's just not forced into every list row.
const PROFILE_COLUMNS = [
  { key: "profile_name", label: "Profile Name" },
  { key: "institution_name", label: "Institution Name" },
  { key: "code", label: "Institution Code", institution: true },
  { key: "auth_status", label: "Authorization Status" },
];

function renderProfileValue(profile, key) {
  const value = profile[key];
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (key === "auth_status") {
    return value == null ? "—" : <StatusBadge status={String(value)} />;
  }
  if (key === "menu_actions") {
    return Array.isArray(value) && value.length > 0 ? (
      <ul className="space-y-1 text-left">
        {value.map((menu, index) => (
          <li key={`${menu.menu_id}-${index}`}>
            <span className="font-semibold">Menu {menu.menu_id ?? "—"}:</span>{" "}
            {Array.isArray(menu.actions) && menu.actions.length > 0
              ? menu.actions.join(", ")
              : "No actions"}
          </li>
        ))}
      </ul>
    ) : "No menu actions";
  }
  return value == null || value === "" ? "—" : String(value);
}

function profileHasAction(profile, actionId) {
  return (profile.menu_actions ?? []).some((menu) =>
    Array.isArray(menu.actions) && menu.actions.some((action) => Number(action) === actionId),
  );
}

function profileId(profile) {
  return profile?.profile_id ?? profile?.id;
}

function EMPTY_FORM() {
  return { profile_name: "", inst_profile_id: "", menu_info: [] };
}

export function ProfilesPage() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const [auditProfile, setAuditProfile] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM());
  const [submitting, setSubmitting] = useState(false);

  const canAdd = useHasProfileAction("Add");
  const canEdit = useHasProfileAction("Edit");
  const canDelete = useHasProfileAction("Delete");
  const canAuthorize = useHasProfileAction("Authorize");

  const profilesQuery = useProfilesQuery({ page: 1, limit: 100 });
  const { data: institutions = [] } = useActiveInstitutionsQuery();
  const checkerMenuItem = useProfileMenuItem();

  const createMutation = useProfileCreateMutation();
  const updateMutation = useProfileUpdateMutation();
  const authMutation = useProfileAuthMutation();
  const deauthMutation = useProfileDeauthMutation();
  const deleteMutation = useProfileDeleteMutation();
  const deleteAuthMutation = useProfileDeleteAuthMutation();

  const profiles = useMemo(() => profilesQuery.data ?? [], [profilesQuery.data]);
  const institutionsById = new Map(institutions.map((institution) => [String(institution.id), institution]));

  const filtered = useMemo(
    () =>
      profiles.filter((p) => {
        const q = search.trim().toLowerCase();
        const matchSearch = !q || String(p.profile_name ?? "").toLowerCase().includes(q);
        const status = String(p.auth_status ?? p.status ?? "").toUpperCase();
        const matchTab =
          activeTab === "all" || (TAB_STATUS_ALIASES[activeTab] ?? [activeTab]).includes(status);
        return matchSearch && matchTab;
      }),
    [profiles, search, activeTab],
  );

  const activeCount = profiles.filter((p) =>
    TAB_STATUS_ALIASES.ACTIVE.includes(String(p.auth_status ?? p.status ?? "").toUpperCase()),
  ).length;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM());
    setShowForm(true);
  };
  const openEdit = (profile) => {
    setEditing(profile);
    setForm({
      profile_name: profile.profile_name ?? "",
      inst_profile_id: profile.inst_profile_id ?? "",
      menu_info: Array.isArray(profile.menu_info) ? profile.menu_info : [],
    });
    setShowForm(true);
  };

  const submitForm = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        profile_info: {
          profile_id: editing ? profileId(editing) : 0,
          profile_name: form.profile_name,
          inst_profile_id: form.inst_profile_id,
        },
        menu_info: form.menu_info,
      };
      if (editing) await updateMutation.mutateAsync(payload);
      else await createMutation.mutateAsync(payload);
      notifications.success(
        editing ? "Profile edit submitted for approval" : "Profile creation submitted for approval",
      );
      setShowForm(false);
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setSubmitting(false);
    }
  };

  const runAction = async () => {
    if (!action) return;
    const id = profileId(action.profile);
    const instProfileId = action.profile?.inst_profile_id;
    try {
      if (action.type === "auth")
        await authMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          menu_id: checkerMenuItem?.menu_id,
          action_id: AUTHORIZE_ACTION_ID,
        });
      if (action.type === "deauth")
        await deauthMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          menu_id: checkerMenuItem?.menu_id,
          action_id: DEAUTHORIZE_ACTION_ID,
          deauth_narration: narration,
        });
      if (action.type === "delete")
        await deleteMutation.mutateAsync({
          profile_id: id,
          inst_profile_id: instProfileId,
          del_narration: narration,
        });
      if (action.type === "deleteAuth")
        await deleteAuthMutation.mutateAsync({ profile_id: id, inst_profile_id: instProfileId });
      notifications.success("Profile action completed");
      setAction(null);
      setNarration("");
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  const actionPending =
    authMutation.isPending ||
    deauthMutation.isPending ||
    deleteMutation.isPending ||
    deleteAuthMutation.isPending;

  return (
    <div className="pt-4 pb-8">
      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-[11px] font-bold text-blue-400 uppercase tracking-widest mb-1">
            User Management
          </p>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight leading-none">
            Profiles
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 font-medium">
            {profiles.length} profiles · {activeCount} active
          </p>
        </div>
        {canAdd && (
          <motion.button
            whileHover={{ scale: 1.03, y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg shadow-blue-200/50"
            style={{ background: "#2266EE" }}
          >
            <Plus size={14} /> New Profile
          </motion.button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            type="text"
            placeholder="Search profiles…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
            style={{ background: "var(--glass-bg)", backdropFilter: "blur(12px)", border: "1px solid var(--glass-border)" }}
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setActiveTab(value)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-bold transition-all border",
                activeTab === value
                  ? "text-white border-transparent shadow-md shadow-blue-200/50"
                  : "text-slate-500 hover:text-blue-600 hover:border-blue-200",
              )}
              style={
                activeTab === value
                  ? { background: "#2266EE", border: "none" }
                  : { background: "var(--glass-bg)", backdropFilter: "blur(12px)", borderColor: "var(--glass-border)" }
              }
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {profilesQuery.error && (
        <div className="flex items-center gap-2 p-4 rounded-2xl mb-4 bg-red-50 border border-red-100 text-sm text-red-600">
          <AlertCircle size={14} /> {profilesQuery.error.message}
          <button onClick={() => void profilesQuery.refetch()} className="ml-auto text-xs font-bold underline">
            Retry
          </button>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl overflow-x-auto"
        style={glass}
      >
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-100/80">
              {[...PROFILE_COLUMNS.map(({ label }) => label), "Actions"].map((h) => (
                <th key={h} scope="col" className="whitespace-nowrap text-center px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {profilesQuery.isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-slate-50">
                  {Array.from({ length: PROFILE_COLUMNS.length + 1 }).map((_, j) => (
                    <td key={j} className="px-5 py-3.5">
                      <Skeleton className="h-4 w-24 mx-auto" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={PROFILE_COLUMNS.length + 1} className="px-5 py-16 text-center">
                  <p className="text-sm font-bold text-slate-600">No profiles found</p>
                  <p className="text-xs text-slate-400 mt-1">Adjust your search or filter criteria</p>
                </td>
              </tr>
            ) : (
              filtered.map((p, i) => {
                const id = profileId(p);
                const institution = institutionsById.get(String(p.inst_profile_id));
                const canViewProfile = profileHasAction(p, 2);
                const canEditProfile = profileHasAction(p, 3);
                const canDeleteProfile = profileHasAction(p, 4);
                const canAuthorizeProfile = profileHasAction(p, 5);
                return (
                  <motion.tr
                    key={id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-slate-50 hover:bg-white/60 transition-colors"
                  >
                    {PROFILE_COLUMNS.map(({ key, institution: isInstitutionColumn }) => (
                      <td key={key} className="px-5 py-3.5 text-xs text-slate-800 text-center whitespace-nowrap">
                        {renderProfileValue(
                          isInstitutionColumn
                            ? institution ?? {}
                            : key === "institution_name"
                              ? { institution_name: p.institution_name ?? institution?.name }
                              : p,
                          key,
                        )}
                      </td>
                    ))}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-center gap-1">
                        {canEditProfile && canEdit && (
                          <button title="Edit" onClick={() => openEdit(p)} className="rounded-lg p-2 text-blue-600 hover:bg-blue-50">
                            <Pencil size={15} />
                          </button>
                        )}
                        {canViewProfile && (
                          <button title="View / Audit" onClick={() => setAuditProfile(p)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100">
                            <Eye size={15} />
                          </button>
                        )}
                        {canAuthorizeProfile && canAuthorize && (
                          <>
                            <button
                              title="Authorize"
                              onClick={() => setAction({ type: "auth", profile: p })}
                              className="rounded-lg p-2 text-emerald-600 hover:bg-emerald-50"
                            >
                              <ShieldCheck size={15} />
                            </button>
                            <button
                              title="Deauthorize"
                              onClick={() => setAction({ type: "deauth", profile: p })}
                              className="rounded-lg p-2 text-amber-600 hover:bg-amber-50"
                            >
                              <ShieldOff size={15} />
                            </button>
                          </>
                        )}
                        {canDeleteProfile && canDelete && (
                          <button
                            title="Delete"
                            onClick={() => setAction({ type: "delete", profile: p })}
                            className="rounded-lg p-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })
            )}
          </tbody>
        </table>
      </motion.div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h2 className="text-xl font-bold">{editing ? "Edit profile" : "New profile"}</h2>
                <button onClick={() => setShowForm(false)}>
                  <X />
                </button>
              </div>
              <form onSubmit={submitForm} className="space-y-4">
                <label className="block text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Profile name</span>
                  <input
                    required
                    value={form.profile_name}
                    onChange={(e) => setForm({ ...form, profile_name: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400"
                  />
                </label>
                <label className="block text-sm text-slate-700">
                  <span className="mb-1.5 block font-medium">Institution</span>
                  <select
                    required
                    value={form.inst_profile_id}
                    onChange={(e) => setForm({ ...form, inst_profile_id: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white/80 px-3 py-2.5 outline-none focus:border-blue-400"
                  >
                    <option value="">Select institution…</option>
                    {institutions.map((inst) => {
                      const id = inst.id ?? inst.inst_id ?? inst.institution_id;
                      return (
                        <option key={id} value={id}>
                          {inst.name ?? id}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <div>
                  <p className="mb-1.5 block text-sm font-medium text-slate-700">Menu / Action grants</p>
                  <ProfilePermissionTree
                    selected={form.menu_info}
                    onChange={(menu_info) => setForm({ ...form, menu_info })}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setShowForm(false)} className="rounded-xl px-4 py-2 text-slate-600">
                    Cancel
                  </button>
                  <button
                    disabled={submitting}
                    className="rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 px-5 py-2 font-semibold text-white disabled:opacity-50"
                  >
                    {submitting ? "Saving..." : editing ? "Save changes" : "Create profile"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {action && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
          >
            <h2 className="text-lg font-bold text-slate-800 mb-3">Confirm profile action</h2>
            <p className="text-sm text-slate-600">
              {action.type} profile <strong>{action.profile?.profile_name}</strong>?
            </p>
            {["deauth", "delete"].includes(action.type) && (
              <textarea
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Reason (required)"
                className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm"
              />
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => {
                  setAction(null);
                  setNarration("");
                }}
                className="rounded-xl px-4 py-2 text-sm text-slate-600"
              >
                Cancel
              </button>
              <button
                disabled={actionPending || (["deauth", "delete"].includes(action.type) && !narration.trim())}
                onClick={() => void runAction()}
                className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {actionPending ? "Working..." : "Confirm"}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {auditProfile && (
        <ProfileAuditModal
          profile={auditProfile}
          profileId={profileId(auditProfile)}
          onClose={() => setAuditProfile(null)}
        />
      )}
    </div>
  );
}
