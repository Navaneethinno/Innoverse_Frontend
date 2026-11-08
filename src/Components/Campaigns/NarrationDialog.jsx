import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/Components/Common/ConfirmDialog";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";

// Confirm one action on a record with an optional narration (required to
// reject). `run(narration)` makes the call; `onDone` after it succeeds.
export function NarrationDialog({ title, confirmLabel, destructive = false, needsNarration = false, withNarration = true, run, onClose, onDone, onRefused }) {
  const { t } = useTranslation(["campaigns", "common"]);
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (needsNarration && !narration.trim()) {
      notifications.error(t("narrationRequired"));
      return;
    }
    setBusy(true);
    try {
      notifications.success(apiMessage(await run(narration.trim()), t("actionDone")));
      onDone();
    } catch (e) {
      notifications.error(e.message);
      onRefused?.(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmDialog open title={title} confirmLabel={confirmLabel} destructive={destructive} pending={busy} onClose={onClose} onConfirm={() => void go()}>
      {withNarration && (
        <textarea value={narration} onChange={(e) => setNarration(e.target.value)} placeholder={needsNarration ? t("narrationRequired") : t("narrationOptional")} className="min-h-20 w-full rounded-xl border border-border p-3 text-sm" />
      )}
    </ConfirmDialog>
  );
}
