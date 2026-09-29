import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";

// Shows its content only to a user who works across institutions (service
// provider). A bank / fintech user only ever sees its own institution, so
// an institution name, field or filter means nothing to them.
export function InstitutionOnly({ children }) {
  return useCanChooseInstitution() ? children : null;
}
