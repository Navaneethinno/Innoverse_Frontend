import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";

// Asks before throwing away edits that haven't been saved yet.
//
//   const { guard, dialog } = useUnsavedChangesGuard(dirty);
//   <button onClick={guard(onClose)}>Close</button>
//   ...
//   {dialog}
//
// `guard(fn)` returns a handler that runs `fn` straight away when nothing is
// dirty, and otherwise opens a "Discard changes?" confirm first. While dirty,
// reloading or closing the browser tab also triggers the browser's own
// "Leave site?" prompt.
export function useUnsavedChangesGuard(dirty) {
  const { t } = useTranslation("common");
  const [pendingAction, setPendingAction] = useState(null);

  useEffect(() => {
    if (!dirty) return undefined;
    const onBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const guard = useCallback(
    (action) =>
      (...args) => {
        if (dirty) setPendingAction(() => () => action(...args));
        else action(...args);
      },
    [dirty],
  );

  const dialog = (
    <ConfirmDialog
      open={Boolean(pendingAction)}
      title={t("unsavedChangesTitle")}
      description={t("unsavedChangesDescription")}
      confirmLabel={t("discardChanges")}
      cancelLabel={t("keepEditing")}
      destructive
      onClose={() => setPendingAction(null)}
      onConfirm={() => {
        const action = pendingAction;
        setPendingAction(null);
        action?.();
      }}
    />
  );

  return { guard, dialog };
}
