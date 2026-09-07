import { Modal } from "@/Components/Common/Modal";
import { ProfileForm } from "./ProfileForm";

// Edit-profile modal — split out of the old monolithic ProfilesPage.jsx.
export function EditProfile({ open, onClose, form, setForm, institutions, onSubmit, submitting }) {
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit profile"
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="profile-form"
            disabled={submitting}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save changes"}
          </button>
        </>
      }
    >
      <ProfileForm form={form} setForm={setForm} institutions={institutions} onSubmit={onSubmit} />
    </Modal>
  );
}
