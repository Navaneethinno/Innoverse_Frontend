import { useTranslation } from "react-i18next";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { NarrationDialog, Section } from "@/Components/InnoCBS/Deposits/depositShared";
import { actorText } from "@/Utils/Lib/actor";
import { cn } from "@/Utils/Lib/utils";

// A setup under maker-checker (fee schedule, loan product, providers...):
// what is in effect and, while a change waits, the proposal beside it; or
// the draft. `render(config, other)` draws one version, `other` being what
// it replaces so the drawing can mark the differences. `below` follows the
// version when nothing waits.
export function VersionSections({ record, render, side = false, below, className = "mb-4" }) {
  const { t } = useTranslation("deposits");
  const { config, draft, pending } = record;
  if (!pending) {
    return (
      <Section title={draft ? t("draftConfig") : t("inEffect")} className={className}>
        {render(draft ?? config)}
        {below}
      </Section>
    );
  }
  return (
    <div className={cn("grid gap-4", side && config && "xl:grid-cols-2", className)}>
      {config && (
        <Section title={t("inEffect")} className="min-w-0">
          {render(config)}
        </Section>
      )}
      <Section
        title={t("proposedBy", {
          action: t(`pending_${pending.action}`, { defaultValue: pending.action }),
          name: actorText(pending, "proposed_by", "—"),
          date: accountDate(pending.proposed_at),
        })}
        className="min-w-0 border-amber-300 ring-1 ring-amber-200"
      >
        {pending.config ? render(pending.config, config) : <p className="text-sm text-muted-foreground">{t(`pendingHint_${pending.action}`, { defaultValue: "" })}</p>}
      </Section>
    </div>
  );
}

// The confirm for one maker-checker verb, with its narration. The screen's
// `t` supplies confirm_<verb> and confirmHint_<verb>; `labels` the button
// words (approve, reject, and the verb itself otherwise).
export function VerbDialog({ dialog, t, labels = {}, busy, onClose, onSave }) {
  if (!dialog) return null;
  const { approve = "approve", reject = "reject", prefix = "" } = labels;
  return (
    <NarrationDialog
      title={t(`confirm_${dialog}`)}
      hint={t(`confirmHint_${dialog}`)}
      confirmLabel={t(dialog === "auth" ? approve : dialog === "deauth" ? reject : `${prefix}${dialog}`)}
      variant={["delete", "deauth", "deactivate"].includes(dialog) ? "danger" : "primary"}
      required={dialog === "deauth"}
      busy={busy}
      onClose={onClose}
      onSave={onSave}
    />
  );
}
