import { PendingTag } from "@/Components/MakerChecker/PendingTag";
import { useTranslation } from "react-i18next";
import { StatusBadge } from "./StatusBadge";
import { deriveStatusFlags } from "./statusFlags";

// One Status column (lists handoff): the record's status_name, and a small
// "Pending approval" tag while a change waits for a checker, instead of
// separate process and authorisation columns.
export function StatusCell({ row }) {
  const { t } = useTranslation("common");
  const waiting = deriveStatusFlags(row).pending && !/pending/i.test(String(row?.status_name ?? ""));
  return (
    <span className="inline-flex flex-wrap items-center justify-center gap-1">
      <StatusBadge status={String(row?.status_name ?? "-")} />
      {waiting && <PendingTag>{t("pendingApproval")}</PendingTag>}
    </span>
  );
}
