import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { ProfileForm } from "./ProfileForm";

// Create-profile modal — split out of the old monolithic ProfilesPage.jsx.
export function AddProfile({ open, onClose, form, setForm, institutions, onSubmit, submitting }) {
  const { t } = useTranslation("profiles");
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("newProfile")}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="profile-form"
            disabled={submitting}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {submitting ? t("saving") : t("createProfile")}
          </button>
        </>
      }
    >
      <ProfileForm form={form} setForm={setForm} institutions={institutions} onSubmit={onSubmit} />
    </Modal>
  );
}
