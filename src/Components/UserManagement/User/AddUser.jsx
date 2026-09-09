import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { UserForm } from "./UserForm";

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
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100"
          >
            {t("common:cancel")}
          </button>
          <button
            type="submit"
            form="user-form"
            disabled={submitting}
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {submitting ? t("saving") : t("addUser")}
          </button>
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
