import { useState } from "react";
import { deriveStatusFlags } from "@/Components/MakerChecker/statusFlags";
import { getMakerCheckerButtons } from "@/Components/MakerChecker/buttonVisibility";
import { useOwnIds } from "@/Hooks/useInstitutionScope";
import {
  useHasInstitutionAction,
  useInstitutionAuthMutation,
  useInstitutionDeactivateMutation,
  useInstitutionDeauthMutation,
  useInstitutionDeleteAuthMutation,
  useInstitutionDeleteMutation,
  useInstitutionReactivateMutation,
  useInstitutionSubmitMutation,
} from "@/Hooks/Institution/institutionHooks";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { institutionId } from "./profileShared";
import { AuthInstitutionProfile } from "./AuthInstitutionProfile";
import { DeauthInstitutionProfile } from "./DeauthInstitutionProfile";
import { DeleteInstitutionProfile } from "./DeleteInstitutionProfile";
import { DeactivateInstitutionProfile } from "./DeactivateInstitutionProfile";
import { ReactivateInstitutionProfile } from "./ReactivateInstitutionProfile";
import { SubmitInstitutionProfile } from "./SubmitInstitutionProfile";

// The maker-checker actions on an institution (list row and institution
// page): which buttons the user gets for a record (`buttonsFor`), `open`
// to ask for one, and `dialogs` to render once. Authorise is one grant for
// Authorise and Reject; Change Status one for Deactivate and Reactivate.
export function useInstitutionActions(onDone) {
  const can = {
    canEdit: useHasInstitutionAction("Edit"),
    canAdd: useHasInstitutionAction("Add"),
    canAuthorize: useHasInstitutionAction("Authorize"),
    canChangeStatus: useHasInstitutionAction("Change Status"),
    canDelete: useHasInstitutionAction("Delete"),
  };
  const own = useOwnIds();
  const [action, setAction] = useState(null);
  const [narration, setNarration] = useState("");
  const mutations = {
    auth: useInstitutionAuthMutation(),
    deauth: useInstitutionDeauthMutation(),
    delete: useInstitutionDeleteMutation(),
    deleteAuth: useInstitutionDeleteAuthMutation(),
    deactivate: useInstitutionDeactivateMutation(),
    reactivate: useInstitutionReactivateMutation(),
    submit: useInstitutionSubmitMutation(),
  };
  const pending = Object.values(mutations).some((m) => m.isPending);

  const buttonsFor = (inst) => {
    const buttons = getMakerCheckerButtons(inst, can);
    // The server refuses deactivating or deleting one's own institution.
    if (String(institutionId(inst)) === own.institutionId) Object.assign(buttons, { deactivate: false, delete: false });
    return buttons;
  };

  const close = () => {
    setAction(null);
    setNarration("");
  };

  const run = async () => {
    if (!action) return;
    const body = { id: institutionId(action.inst), narration: narration.trim() };
    // Approving a pending delete goes to delete_auth, not auth.
    const key = action.type === "auth" && deriveStatusFlags(action.inst).pendingDelete ? "deleteAuth" : action.type;
    try {
      const result = await mutations[key].mutateAsync(body);
      notifications.success(apiMessage(result, "Institution action completed"));
      close();
      onDone?.(action.type);
    } catch (error) {
      notifications.error(error instanceof Error ? error.message : "Action failed");
    }
  };

  const props = (type) => ({ institution: action?.type === type ? action.inst : null, narration, setNarration, pending, onClose: close, onConfirm: () => void run() });
  const dialogs = (
    <>
      <AuthInstitutionProfile {...props("auth")} />
      <DeauthInstitutionProfile {...props("deauth")} />
      <DeleteInstitutionProfile {...props("delete")} />
      <DeactivateInstitutionProfile {...props("deactivate")} />
      <ReactivateInstitutionProfile {...props("reactivate")} />
      <SubmitInstitutionProfile {...props("submit")} />
    </>
  );
  return { can, buttonsFor, open: (type, inst) => setAction({ type, inst }), dialogs };
}
