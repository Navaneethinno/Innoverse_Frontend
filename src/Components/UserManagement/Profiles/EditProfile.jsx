import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { ProfileForm } from "./ProfileForm";
import { Button } from "@/Components/Common/Button";

// Edit-profile modal — split out of the old monolithic ProfilesPage.jsx.
export function EditProfile({ open, onClose, form, setForm, institutions, onSubmit, submitting }) {
  const { t } = useTranslation("profiles");
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("editProfile")}
      size="lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-bold text-muted-foreground hover:bg-slate-100"
          >
            {t("common:cancel")}
          </button>
          <Button
            type="submit"
            form="profile-form"
            data-mode="draft"
            disabled={submitting}
            variant="secondary"
            size="sm"
          >
            {t("saveAsDraft", "Save as draft")}
          </Button>
          <Button
            type="submit"
            form="profile-form"
            data-mode="submit"
            disabled={submitting}
            size="sm"
          >
            {submitting ? t("saving") : t("saveChanges")}
          </Button>
        </>
      }
    >
      <ProfileForm form={form} setForm={setForm} institutions={institutions} onSubmit={onSubmit} />
    </Modal>
  );
}
