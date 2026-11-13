import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { ProfileForm } from "./ProfileForm";
import { Button } from "@/Components/Common/Button";

// The profile form in a modal: adding a profile, or editing one (`editing`).
export function ProfileFormModal({ editing = false, open, onClose, form, setForm, institutions, onSubmit, submitting }) {
  const { t } = useTranslation("profiles");
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t(editing ? "editProfile" : "newProfile")}
      size="lg"
      footer={
        <>
          <Button
            onClick={onClose}
            variant="ghost" size="sm"
          >
            {t("common:cancel")}
          </Button>
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
            {submitting ? t("saving") : t(editing ? "saveChanges" : "createProfile")}
          </Button>
        </>
      }
    >
      <ProfileForm form={form} setForm={setForm} institutions={institutions} onSubmit={onSubmit} editing={editing} />
    </Modal>
  );
}
