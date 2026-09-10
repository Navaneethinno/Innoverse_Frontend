import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { UserForm } from "./UserForm";

// Edit/View-user modal — split out of the old monolithic UsersPage.jsx.
// `viewingOnly` renders the same form read-only (this covers the "View"
// row action too, same as the original inline behaviour).
export function EditUser({
  open,
  onClose,
  editing,
  viewingOnly,
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
      title={viewingOnly ? t("viewUser") : t("editUser")}
      size="lg"
      footer={
        !viewingOnly && (
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
              data-mode="draft"
              disabled={submitting}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 disabled:opacity-50"
            >
              {t("saveAsDraft", "Save as draft")}
            </button>
            <button
              type="submit"
              form="user-form"
              data-mode="submit"
              disabled={submitting}
              className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
            >
              {submitting ? t("saving") : t("saveChanges")}
            </button>
          </>
        )
      }
    >
      <UserForm
        form={form}
        setForm={setForm}
        editing={editing}
        readOnly={viewingOnly}
        onSubmit={onSubmit}
        institutions={institutions}
        profiles={profiles}
        passwordPolicies={passwordPolicies}
        selectedPolicy={selectedPolicy}
      />
    </Modal>
  );
}
