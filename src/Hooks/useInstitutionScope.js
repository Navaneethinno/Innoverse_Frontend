import { useAuth } from "@/Hooks/useAuth";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";

// Whether this user picks an institution (service provider) or is always in
// its own (bank, fintech): institution pickers, filters, columns and fields
// render only when it's true.
export function useCanChooseInstitution() {
  return canChooseInstitution(useAuth((state) => state.user?.scope));
}
