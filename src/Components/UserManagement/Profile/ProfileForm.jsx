import { ProfilePermissionTree } from "@/Components/Profiles/ProfilePermissionTree";

export function EMPTY_FORM() {
  return { profile_name: "", inst_profile_id: "", menu_info: [] };
}

export function profileId(profile) {
  return profile?.profile_id ?? profile?.id;
}

// Shared create/edit form fields for a Profile — extracted out of the old
// monolithic ProfilesPage.jsx so AddProfile/EditProfile both render the same
// markup. Still uses the existing ProfilePermissionTree.jsx building block
// for the menu/action grant tree (not duplicated here).
export function ProfileForm({ form, setForm, institutions, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="space-y-4" id="profile-form">
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
    </form>
  );
}
