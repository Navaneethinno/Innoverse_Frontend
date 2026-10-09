import { CircleDot, Clock3, ListChecks } from "lucide-react";

// ListPanel tabs. All / Pending (waiting for a checker): lists whose
// pending records come from their own call.
export const PENDING_TABS = [
  ["all", "statusAll", ListChecks],
  ["pending", "statusPending", Clock3],
];

// "All" (value "") then one tab per status code; labelKey(code) is the
// i18n key, with its namespace ("loans:loanStatus_ACTIVE").
export const statusTabs = (statuses, labelKey) => [["", "statusAll", ListChecks], ...statuses.map((code) => [code, labelKey(code), CircleDot])];
