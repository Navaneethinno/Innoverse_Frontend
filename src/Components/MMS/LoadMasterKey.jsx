import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { useAuth } from "@/Hooks/useAuth";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { inputClass, labelClass } from "../Finance/Deposits/depositShared";
import { mmsDate } from "./mmsShared";

// Load a device's master key (TMK; a POS terminal or an ATM): two key custodians, each signed in as
// themselves, enter one 32-hex component; the second (another user, within 15
// minutes of the first) completes it. Only check values come back: the
// custodian compares them with their key form. The component is never kept:
// the field is cleared after every call.
// `load(component)` makes the call; the reply holds the device as
// `terminal` or `atm`.
export function LoadMasterKey({ device, load, onLoaded }) {
  const { t } = useTranslation("mms");
  const me = useAuth((state) => state.user?.username ?? state.user?.user_name);
  const [component, setComponent] = useState("");
  const [answer, setAnswer] = useState(null);
  const [busy, setBusy] = useState(false);
  // A first component waiting for the second (who, its check value, until when).
  const pending = device.keys?.tmk_pending ?? null;
  const left = useSecondsLeft(pending?.expires_at);
  const waiting = pending && left > 0 ? pending : null;
  const mineWaiting = waiting && waiting.entered_by === me;
  const submit = async () => {
    setBusy(true);
    // Sent as the second: if it comes back incomplete, the first was lost
    // (expired, or the key service restarted) and this one is the new first.
    const asSecond = Boolean(waiting && !mineWaiting);
    try {
      const row = rowsOf(await load(component))[0] ?? {};
      setAnswer({ ...row, nowFirst: asSecond && !row.complete });
      onLoaded();
    } catch (error) {
      setAnswer(null);
      notifications.error(error.message);
    } finally {
      setComponent("");
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-2 rounded-xl border border-border p-3">
      <p className="text-xs font-bold">{t("loadMasterKey")}</p>
      <p className="text-[11px] text-muted-foreground">{t("loadMasterKeyHint")}</p>
      {waiting && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          {t("tmkWaiting", { by: waiting.entered_by, at: mmsDate(waiting.entered_at), kcv: waiting.component_kcv, left: `${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}` })}
          {mineWaiting && <span className="mt-1 block">{t("tmkWaitingMine")}</span>}
        </p>
      )}
      {!mineWaiting && (
      <div className="flex flex-wrap items-end gap-2">
        <label className={`${labelClass} min-w-72 flex-1`}>
          {t("keyComponent")}
          <input
            type="password"
            autoComplete="new-password"
            spellCheck={false}
            className={`${inputClass} mt-1 font-mono`}
            maxLength={32}
            value={component}
            onChange={(e) => setComponent(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ""))}
            placeholder="32 hex"
          />
        </label>
        <Button size="sm" loading={busy} disabled={component.length !== 32} onClick={() => void submit()}>
          {t("enterComponent")}
        </Button>
      </div>
      )}
      {answer && (
        <p className={`rounded-lg px-3 py-2 text-xs font-semibold ${answer.complete ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
          {answer.complete
            ? t("tmkComplete", { kcv: answer.component_kcv, tmk: (answer.terminal ?? answer.atm)?.keys?.tmk_kcv ?? "—" })
            : t(answer.nowFirst ? "tmkNowFirst" : "tmkFirstDone", { kcv: answer.component_kcv })}
        </p>
      )}
    </div>
  );
}

// Seconds until `until` (an ISO time), ticking each second; 0 once past.
function useSecondsLeft(until) {
  const end = until ? Date.parse(until) : 0;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!end) return undefined;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [end]);
  return end ? Math.max(0, Math.round((end - now) / 1000)) : 0;
}
