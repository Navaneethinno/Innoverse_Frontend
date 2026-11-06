import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { UserForm } from "./UserForm";
import { Button } from "@/Components/Common/Button";

// Create-user modal — split out of the old monolithic UsersPage.jsx. All
// state/mutations still live in the parent (User.jsx); this file only owns
// the "Add user" modal chrome, matching payse's AddUser.jsx convention.
export function AddUser({
  open,
  onClose,
  form,
  setForm,
  onSubmit,
  institutions,
  profiles,
  passwordPolicies,
  selectedPolicy,
  submitting,
}) {
  const { t } = useTranslation("users");
  if (!open) return null;
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("addUser")}
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
            form="user-form"
            data-mode="draft"
            disabled={submitting}
            variant="secondary"
            size="sm"
          >
            {t("saveAsDraft", "Save as draft")}
          </Button>
          <Button
            type="submit"
            form="user-form"
            data-mode="submit"
            disabled={submitting}
            size="sm"
          >
            {submitting ? t("saving") : t("addUser")}
          </Button>
        </>
      }
    >
      <UserForm
        form={form}
        setForm={setForm}
        editing={null}
        readOnly={false}
        onSubmit={onSubmit}
        institutions={institutions}
        profiles={profiles}
        passwordPolicies={passwordPolicies}
        selectedPolicy={selectedPolicy}
      />
    </Modal>
  );
}
