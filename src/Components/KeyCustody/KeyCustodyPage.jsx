import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyRound, Lock, LockOpen, ShieldAlert } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { HexComponentInput } from "@/Components/Common/HexComponentInput";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { Facts, NarrationDialog, Section } from "@/Components/Finance/Deposits/depositShared";
import { keyCustodyApi } from "@/Services/Auth/keyCustody.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { useKeyCustody } from "./KeyCustodyProvider";

const LENGTH = 64;
// What a refusal tells the custodian, by error_code.
const REFUSALS = {
  "key.unlock_mismatch": "mismatch",
  "key.same_slot": "sameSlot",
  "key.same_custodian": "sameCustodian",
  "key.unlock_first": "unlockFirst",
};

// Key Custody (custodians only): the platform's keys are locked after every
// restart in production; one slot A and one slot B custodian each enter
// their component to unlock them. Also the key ceremony (a new master key)
// and Lock, for a suspected compromise. Components are never kept.
export function KeyCustodyPage() {
  const { t } = useTranslation("keyCustody");
  const { status, refresh } = useKeyCustody();
  const [loaded, setLoaded] = useState(false);
  const [ceremony, setCeremony] = useState(false);
  const [locking, setLocking] = useState(false);
  // The other custodian enters their part from their own session.
  useEffect(() => {
    void refresh().finally(() => setLoaded(true));
    const timer = window.setInterval(() => void refresh(), 10000);
    return () => window.clearInterval(timer);
  }, [refresh]);

  if (!loaded) return <PageSkeleton />;
  if (!status)
    return <p className="py-8 text-center text-sm text-muted-foreground">{t("notCustodian")}</p>;
  const k = status.keys ?? {};
  const you = status.you ?? {};
  const state = k.locked
    ? "locked"
    : !k.ready && !k.keys?.length
      ? "notSetUp"
      : k.ready
        ? "open"
        : "notSetUp";
  const waiting = k.unlock_waiting || k.component_waiting;
  const lock = async () => {
    try {
      const r = await keyCustodyApi.lock();
      if (r?.message) notifications.success(r.message);
      setLocking(false);
      await refresh();
    } catch (e) {
      notifications.error(e.message);
    }
  };
  const slots = ["A", "B"].map((slot) => [
    slot,
    (status.custodians ?? []).filter((c) => c.slot === slot),
  ]);

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5">
        <PageTitle icon={KeyRound}>{t("title")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm">
            {t("youHold")} <b className="font-mono text-lg">{you.slot}</b>
            {you.role === "BACKUP" && (
              <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                {t("role_BACKUP")}
              </span>
            )}
          </p>
          <StateBadge state={state} />
        </div>
        {waiting && (
          <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
            {t("oneEntered")}
          </p>
        )}

        {state === "locked" && (
          <Section title={t("unlockTitle")}>
            <p className="mb-3 text-sm text-muted-foreground">{t("unlockHint")}</p>
            <ComponentForm verb="unlock" onDone={refresh} />
          </Section>
        )}
        {state === "notSetUp" && (
          <CeremonyStart onStart={() => setCeremony(true)} open={ceremony} onDone={refresh} />
        )}
        {state === "open" && (
          <Section
            title={t("openTitle")}
            action={
              <Button variant="danger" size="sm" icon={Lock} onClick={() => setLocking(true)}>
                {t("lockKeys")}
              </Button>
            }
          >
            <Facts
              rows={[
                [
                  t("masterKcv"),
                  <b key="k" className="font-mono">
                    {k.master_kcv}
                  </b>,
                ],
                [t("created"), accountDate(k.created)],
                [t("custody"), t(`custody_${k.custody}`, { defaultValue: k.custody })],
              ]}
            />
          </Section>
        )}

        <Section title={t("custodians")}>
          <div className="grid gap-3 md:grid-cols-2">
            {slots.map(([slot, list]) => (
              <div key={slot} className="rounded-xl border border-border p-3">
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t("slotN", { slot })}
                </p>
                {list.length ? (
                  <ul className="grid gap-1.5">
                    {list.map((c) => (
                      <li
                        key={c.id ?? c.user_name}
                        className="flex flex-wrap items-center justify-between gap-2 text-sm"
                      >
                        <span>
                          <b>{c.user_name}</b>{" "}
                          <span className="text-xs text-muted-foreground">
                            {[c.inst_profile_name, c.email].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-bold",
                            c.role === "PRIMARY"
                              ? "bg-primary/10 text-primary"
                              : "bg-slate-100 text-slate-700",
                          )}
                        >
                          {t(`role_${c.role}`)}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">{t("noCustodians")}</p>
                )}
              </div>
            ))}
          </div>
        </Section>
      </div>
      {locking && (
        <NarrationDialog
          title={t("lockKeys")}
          hint={t("lockConfirm")}
          confirmLabel={t("lockNow")}
          variant="danger"
          onClose={() => setLocking(false)}
          onSave={() => void lock()}
          label={t("lockNote")}
        />
      )}
    </div>
  );
}

function StateBadge({ state }) {
  const { t } = useTranslation("keyCustody");
  const Icon = { locked: Lock, notSetUp: ShieldAlert, open: LockOpen }[state];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black",
        state === "open"
          ? "bg-emerald-50 text-emerald-700"
          : state === "locked"
            ? "bg-red-50 text-red-700"
            : "bg-amber-50 text-amber-800",
      )}
    >
      <Icon size={13} /> {t(`state_${state}`)}
    </span>
  );
}

// Not set up: the key ceremony, behind a warning.
function CeremonyStart({ open, onStart, onDone }) {
  const { t } = useTranslation("keyCustody");
  return (
    <Section title={t("ceremonyTitle")}>
      <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
        {t("ceremonyWarning")}
      </p>
      {open ? (
        <ComponentForm verb="component" onDone={onDone} />
      ) : (
        <Button icon={KeyRound} onClick={onStart}>
          {t("startCeremony")}
        </Button>
      )}
    </Section>
  );
}

// One custodian's component: unlock (locked keys) or the ceremony. The
// value is cleared on any reply and never kept.
function ComponentForm({ verb, onDone }) {
  const { t } = useTranslation("keyCustody");
  const [component, setComponent] = useState("");
  const [busy, setBusy] = useState(false);
  const [answer, setAnswer] = useState(null);
  const submit = async () => {
    setBusy(true);
    setAnswer(null);
    try {
      const r = await keyCustodyApi[verb](component);
      const row = (Array.isArray(r?.data) ? r.data[0] : r?.data) ?? {};
      setAnswer(
        row.complete
          ? {
              tone: "ok",
              text:
                verb === "unlock" ? t("unlocked") : t("ceremonyComplete", { kcv: row.master_kcv }),
            }
          : { tone: "wait", text: t("componentAccepted", { kcv: row.component_kcv }) },
      );
      await onDone();
    } catch (e) {
      const key = REFUSALS[e.code];
      setAnswer({ tone: "bad", text: key ? t(`refused_${key}`) : e.message });
    } finally {
      setComponent("");
      setBusy(false);
    }
  };
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start gap-2">
        <HexComponentInput
          className="min-w-72 flex-1"
          value={component}
          onChange={setComponent}
          length={LENGTH}
        />
        <Button loading={busy} disabled={component.length !== LENGTH} onClick={() => void submit()}>
          {t(verb === "unlock" ? "enterToUnlock" : "enterComponent")}
        </Button>
      </div>
      {answer && (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-sm font-semibold",
            answer.tone === "ok"
              ? "bg-emerald-50 text-emerald-800"
              : answer.tone === "wait"
                ? "bg-amber-50 text-amber-900"
                : "bg-red-50 text-red-800",
          )}
        >
          {answer.text}
        </p>
      )}
    </div>
  );
}
