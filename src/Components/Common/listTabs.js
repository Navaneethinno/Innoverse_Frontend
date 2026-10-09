import { Clock3, ListChecks } from "lucide-react";

// ListPanel tabs. All / Pending (waiting for a checker): lists whose
// pending records come from their own call.
export const PENDING_TABS = [
  ["all", "statusAll", ListChecks],
  ["pending", "statusPending", Clock3],
];
