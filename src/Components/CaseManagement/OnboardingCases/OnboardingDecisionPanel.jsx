import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Clock, Send, X } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { useAuth } from "@/Hooks/useAuth";
import { useFeatures } from "@/Hooks/useFeatures";
import { caseSettingsApi } from "@/Services/CaseManagement/onboardingCases.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { actorText } from "@/Utils/Lib/actor";
import { NoReviewOutcome } from "./CaseSettings";
import { caseDate } from "./caseShared";

// On Onboarding Configuration, for an institution without Onboarding Cases
// (features.onboarding_review false): the one decision setting it has,
// no_review_outcome, through the same /case/setting routes (maker-checker).
// `can`: the page's rights (Edit to propose, Authorize to decide).
export function OnboardingDecisionPanel({ can }) {
  const { t } = useTranslation(["cases", "common"]);
  const { onboarding_review: hasReview } = useFeatures();
  const me = useAuth((s) => s.user);
  const [data, setData] = useState(null);
  const [value, setValue] = useState("REJECT");
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);

  const apply = (response) => {
    const d = rowsOf(response)[0] ?? null;
    setData(d);
    setValue(d?.settings?.no_review_outcome ?? "REJECT");
  };
  const load = useCallback(async () => {
    try {
      apply(await caseSettingsApi.get({}));
    } catch (error) {
      notifications.error(error.message);
    }
  }, []);
  useEffect(() => {
    if (!hasReview) void load();
  }, [hasReview, load]);
  if (hasReview || !data) return null;

  const run = async (verb, body) => {
    setBusy(true);
    try {
      const response = await caseSettingsApi[verb](body);
      apply(response);
      setNarration("");
      if (response?.message) notifications.success(response.message);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };
  const pending = data.pending;
  const own = pending && String(pending.proposed_by?.id) === String(me?.id);
  const saved = data.settings?.no_review_outcome ?? "REJECT";
  const inputClass = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";

  return (
    <div className="mb-4 rounded-2xl border border-border bg-card p-4">
      <p className="mb-2 text-sm font-bold">{t("onboardingDecision")}</p>
      <NoReviewOutcome value={pending?.settings?.no_review_outcome ?? value} pending={Boolean(pending)} disabled={!can("Edit") || Boolean(pending)} onChange={setValue} />
      {pending ? (
        <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3">
          <p className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <Clock size={13} /> {t("settingsPending", { name: actorText(pending, "proposed_by", "—"), date: caseDate(pending.proposed_at) })}
          </p>
          {can("Authorize") && !own && (
            <div className="mt-2 grid gap-2 sm:grid-cols-[1fr_auto_auto]">
              <input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder={t("narration")} className={inputClass} />
              <Button variant="secondary" size="sm" icon={X} disabled={!narration.trim()} disabledReason={t("common:blockedFillRequired")} loading={busy} onClick={() => void run("deauth", { narration: narration.trim() })}>{t("rejectChange")}</Button>
              <Button size="sm" icon={Check} disabled={!narration.trim()} disabledReason={t("common:blockedFillRequired")} loading={busy} onClick={() => void run("auth", { narration: narration.trim() })}>{t("authoriseChange")}</Button>
            </div>
          )}
          {own && <p className="mt-1 text-xs text-amber-800">{t("ownChangePending")}</p>}
        </div>
      ) : (
        can("Edit") && (
          <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
            <input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder={t("narrationPlaceholder")} className={inputClass} />
            <Button size="sm" icon={Send} disabled={value === saved} disabledReason={t("common:blockedNoChanges")} loading={busy} onClick={() => void run("edit", { no_review_outcome: value, narration: narration.trim() })}>{t("proposeChange")}</Button>
          </div>
        )
      )}
    </div>
  );
}
