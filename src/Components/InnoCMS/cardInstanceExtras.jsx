import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, KeyRound, Settings2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { Toggle } from "@/Components/Common/Toggle";
import { Facts, Problems, Section, inputClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { money } from "@/Components/InnoCBS/Accounts/accountShared";
import { cardsApi } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { Labelled } from "./cardOpsShared";
import { cardErrorText } from "./CardReturns";

const SWITCHES = ["atm", "pos", "ecom", "contactless", "international"];
const LIMITS = ["per_txn_limit", "daily_limit"];

// A card's controls (channels on or off, limits): View reads them, Edit sets
// the whole set (an empty limit is none).
export function CardControls({ card, canEdit }) {
  const { t } = useTranslation("cards");
  const [controls, setControls] = useState(null);
  const [editing, setEditing] = useState(false);
  const load = useCallback(() => {
    cardsApi
      .controls({ id: card.id })
      .then((r) => {
        const row = rowsOf(r)[0] ?? {};
        setControls(row.controls ?? row);
      })
      .catch((e) => notifications.error(e.message));
  }, [card.id]);
  useEffect(load, [load]);
  if (!controls) return null;
  const yes = (v) => t(v ? "ctl_on" : "ctl_off");
  return (
    <Section
      title={t("ctl_title")}
      className="mb-4"
      action={
        canEdit && (
          <Button size="sm" variant="secondary" icon={Settings2} onClick={() => setEditing(true)}>
            {t("ctl_edit")}
          </Button>
        )
      }
    >
      <Facts rows={[...SWITCHES.map((k) => [t(`ctl_${k}`), yes(controls[k]), controls[k] ? undefined : "text-red-700"]), ...LIMITS.map((k) => [t(`ctl_${k}`), controls[k] ? money(controls[k], card.currency_code) : t("ctl_noLimit")])]} />
      {editing && (
        <ControlsDialog
          card={card}
          controls={controls}
          onClose={() => setEditing(false)}
          onSaved={(next) => {
            setEditing(false);
            if (next) setControls(next);
            else load();
          }}
        />
      )}
    </Section>
  );
}

function ControlsDialog({ card, controls, onClose, onSaved }) {
  const { t } = useTranslation(["cards", "common"]);
  const [form, setForm] = useState(() => ({ ...Object.fromEntries(SWITCHES.map((k) => [k, Boolean(controls[k])])), ...Object.fromEntries(LIMITS.map((k) => [k, controls[k] ?? ""])) }));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const body = { ...form, ...Object.fromEntries(LIMITS.map((k) => [k, String(form[k] ?? "").trim()])) };
      const response = await cardsApi.controls_set({ id: card.id, controls: body });
      notifications.success(response?.message ?? t("ctl_saved"));
      const row = rowsOf(response)[0];
      onSaved(row?.controls ?? null);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={t("ctl_title")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} onClick={save}>
            {t("ctl_save")}
          </Button>
        </>
      }
    >
      <div className="grid gap-3">
        {SWITCHES.map((k) => (
          <Toggle key={k} checked={form[k]} onChange={(v) => setForm((f) => ({ ...f, [k]: v }))} label={t(`ctl_${k}`)} showLabel />
        ))}
        {LIMITS.map((k) => (
          <Labelled key={k} label={t(`ctl_${k}`)} hint={t("ctl_limitHint")}>
            <input className={inputClass} inputMode="decimal" placeholder={k === "daily_limit" ? "2000" : "500"} value={form[k]} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value.replace(/[^\d.]/g, "") }))} />
          </Labelled>
        ))}
        <Problems message={error} />
      </div>
    </Modal>
  );
}

// Card number reveal (right: menu 260): a reason, a code emailed to the
// user, then the number for `show_seconds`. The number lives only in this
// dialog's state and is gone when it closes or the time runs out.
export function RevealDialog({ card, onClose }) {
  const { t } = useTranslation(["cards", "common"]);
  const [step, setStep] = useState("reason");
  const [reason, setReason] = useState("");
  const [challenge, setChallenge] = useState(null);
  const [code, setCode] = useState("");
  const [shown, setShown] = useState(null);
  const [left, setLeft] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const timer = useRef(null);

  const hide = useCallback(() => {
    window.clearInterval(timer.current);
    setShown(null);
    setLeft(0);
  }, []);
  useEffect(() => {
    const onLeave = () => document.visibilityState === "hidden" && hide();
    document.addEventListener("visibilitychange", onLeave);
    return () => {
      document.removeEventListener("visibilitychange", onLeave);
      hide();
    };
  }, [hide]);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const row = rowsOf(await cardsApi.reveal_start({ id: card.id, reason: reason.trim() }))[0] ?? {};
      setChallenge({ reveal_id: row.reveal_id, ...(row.challenge ?? {}) });
      setCode("");
      setStep("code");
    } catch (e) {
      setError(cardErrorText(t, e));
    } finally {
      setBusy(false);
    }
  };
  const reveal = async () => {
    setBusy(true);
    setError("");
    try {
      const row = rowsOf(await cardsApi.reveal({ reveal_id: challenge.reveal_id, mfa_token: challenge.mfa_token, code }))[0] ?? {};
      const seconds = Number(row.show_seconds) || 60;
      setShown(row.pan);
      setLeft(seconds);
      setStep("shown");
      window.clearInterval(timer.current);
      timer.current = window.setInterval(() => setLeft((s) => (s <= 1 ? 0 : s - 1)), 1000);
    } catch (e) {
      setError(cardErrorText(t, e));
      // An expired code: start again with a new reason and code.
      if (e?.code === "card.reveal_expired") setStep("reason");
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (step === "shown" && left === 0) {
      hide();
      setStep("done");
    }
  }, [left, step, hide]);

  const len = Number(challenge?.code_length) || 6;
  const reasonShort = reason.trim().length < 10;
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      icon={KeyRound}
      title={t("rev_title")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t(step === "shown" || step === "done" ? "rev_close" : "cancel")}
          </Button>
          {step === "reason" && (
            <Button loading={busy} disabled={reasonShort} disabledReason={t("rev_reasonShort")} onClick={start}>
              {t("rev_sendCode")}
            </Button>
          )}
          {step === "code" && (
            <Button icon={Eye} loading={busy} disabled={code.length !== len} disabledReason={t("rev_codeLength", { count: len })} onClick={reveal}>
              {t("rev_show")}
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-3">
        <p className="font-mono text-sm">{card.pan_masked}</p>
        {step === "reason" && (
          <Labelled label={t("rev_reason")} hint={t("rev_reasonHint")} required>
            <textarea className={`${inputClass} min-h-16`} maxLength={300} placeholder="Customer called to confirm the card number for a chargeback" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Labelled>
        )}
        {step === "code" && (
          <>
            <p className="text-sm text-muted-foreground">{t("rev_codeSent", { to: challenge?.sent_to ?? "", minutes: Math.round((Number(challenge?.expires_in) || 300) / 60) })}</p>
            <Labelled label={t("rev_code")} required>
              <input className={`${inputClass} font-mono tracking-[0.4em]`} inputMode="numeric" autoComplete="one-time-code" maxLength={len} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </Labelled>
          </>
        )}
        {step === "shown" && shown && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-center dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="select-all font-mono text-xl font-black tracking-widest">{shown}</p>
            <p className="mt-1 text-xs font-semibold text-amber-800 dark:text-amber-200">{t("rev_hidesIn", { count: left })}</p>
          </div>
        )}
        {step === "done" && <p className="text-sm text-muted-foreground">{t("rev_hidden")}</p>}
        <Problems message={error} />
      </div>
    </Modal>
  );
}
