import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { UserForm } from "./UserForm";
import { Button } from "@/Components/Common/Button";

// Edit/View-user modal — split out of the old monolithic UsersPage.jsx.
// `viewingOnly` renders the same form read-only (this covers the "View"
// row action too, same as the original inline behaviour).
export function EditUser({
  open,
  onClose,
  editing,
  viewingOnly,
  noDetails = false,
  onAddDetails = null,
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
              {submitting ? t("saving") : t("saveChanges")}
            </Button>
          </>
        )
      }
    >
      {viewingOnly && noDetails && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <span className="font-semibold">{t("noDetailsYet")}</span>
          <Button size="sm" disabled={!onAddDetails} disabledReason={t("noDetailsRight")} onClick={() => onAddDetails?.()}>
            {t("addDetails")}
          </Button>
        </div>
      )}
      <UserForm
        hideDetails={viewingOnly && noDetails}
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
