import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal } from "@/Components/Common/Modal";
import { Spinner } from "@/Components/Common/Spinner";
import { InstitutionOnly } from "@/Components/Common/InstitutionOnly";
import { ViewItem } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { amlBlacklistApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { formatDay } from "@/Utils/Lib/dateFormat";
import { notifications } from "@/Utils/Lib/notifications";
import { NameText, when } from "../Shared/amlShared";
import { CountryList, EntryStatus, identifierText } from "./blacklistShared";

const FIELDS = ["entity_type", "name", "aliases", "birth_date", "countries", "identifiers", "reason", "remarks", "expires_on"];
const show = (value) => (Array.isArray(value) ? value.map((v) => (typeof v === "object" ? identifierText(v) : v)).join(", ") : (value ?? "")) || "-";

// What a waiting edit changes: one line per field that differs.
function ProposalChanges({ entry, data }) {
  const { t } = useTranslation("aml");
  const changed = FIELDS.filter((k) => JSON.stringify(data?.[k] ?? null) !== JSON.stringify(entry?.[k] ?? null));
  if (!changed.length) return <p className="text-xs text-muted-foreground">{t("noFieldChanges")}</p>;
  return (
    <dl className="grid gap-1 text-xs sm:grid-cols-[auto_1fr]">
      {changed.map((k) => (
        <div key={k} className="contents">
          <dt className="font-semibold text-muted-foreground">{t(`blField_${k}`)}</dt>
          <dd dir="auto" className="break-words">
            <span className="text-muted-foreground line-through">{show(entry?.[k])}</span> → <b>{show(data?.[k])}</b>
          </dd>
        </div>
      ))}
    </dl>
  );
}

// One change in the entry's history (or the one waiting).
function Change({ change, entry }) {
  const { t } = useTranslation("aml");
  return (
    <li className="rounded-xl border p-2.5 text-xs">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">{t(`blAction_${change.action}`, { defaultValue: change.action })}</span>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold">{t(`blChangeState_${change.state}`, { defaultValue: change.state })}</span>
        <span className="text-muted-foreground">
          {change.proposed_by} · {when(change.proposed_at)}
          {change.decided_by && ` → ${change.decided_by} · ${when(change.decided_at)}`}
        </span>
      </div>
      {change.comment && <p className="mt-1 whitespace-pre-wrap">{change.comment}</p>}
      {change.decision_note && <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{t("checkerNote")}: {change.decision_note}</p>}
      {change.action === "EDIT" && change.data && entry && (
        <div className="mt-2 rounded-lg bg-muted/50 p-2">
          <ProposalChanges entry={entry} data={change.data} />
        </div>
      )}
    </li>
  );
}

// One entry (blacklist/get): its fields, the change waiting and every
// change before it.
export function BlacklistDetail({ id, onClose }) {
  const { t } = useTranslation(["aml", "common"]);
  const [entry, setEntry] = useState(null);
  useEffect(() => {
    let cancelled = false;
    amlBlacklistApi
      .get({ id })
      .then((r) => !cancelled && setEntry(rowsOf(r)[0] ?? null))
      .catch((error) => {
        notifications.error(error.message);
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);
  const history = [...(entry?.history ?? [])].reverse();
  return (
    <Modal open onClose={onClose} size="lg" title={t("aml:blacklistEntry")}>
      {!entry ? (
        <div className="flex justify-center py-10">
          <Spinner size={22} />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-3 rounded-2xl border border-destructive/30 bg-[color-mix(in_srgb,var(--destructive)_6%,transparent)] p-4">
            <NameText name={entry.name} latin={entry.name_latin} className="text-lg font-black text-slate-800" />
            <EntryStatus entry={entry} />
          </div>
          <dl className="grid gap-3 sm:grid-cols-2">
            <InstitutionOnly>
              <ViewItem label={t("aml:institution")}>{entry.inst_profile_name}</ViewItem>
            </InstitutionOnly>
            <ViewItem label={t("aml:entityType")}>{t(`aml:entity_${entry.entity_type}`, { defaultValue: entry.entity_type })}</ViewItem>
            <ViewItem label={t("aml:blReason")}>{t(`aml:blReason_${entry.reason}`, { defaultValue: entry.reason })}</ViewItem>
            {entry.entity_type === "PERSON" && <ViewItem label={t("aml:birthDate")}>{entry.birth_date || "-"}</ViewItem>}
            <ViewItem label={t("aml:countries")}>
              <CountryList codes={entry.countries} />
            </ViewItem>
            <ViewItem label={t("aml:blExpiresOn")}>{entry.expires_on ? formatDay(entry.expires_on) : t("aml:neverExpires")}</ViewItem>
            <ViewItem label={t("aml:addedBy")}>
              {entry.created_by} · {when(entry.created_at)}
            </ViewItem>
            {entry.aliases?.length > 0 && (
              <div className="rounded-xl border p-3 sm:col-span-2">
                <dt className="text-xs text-muted-foreground">{t("aml:aliases")}</dt>
                <dd className="mt-1 flex flex-wrap gap-1">
                  {entry.aliases.map((a) => (
                    <span key={a} dir="auto" className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">
                      {a}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {entry.identifiers?.length > 0 && (
              <div className="rounded-xl border p-3 sm:col-span-2">
                <dt className="text-xs text-muted-foreground">{t("aml:identifiers")}</dt>
                <dd className="mt-1 grid gap-1 text-sm">
                  {entry.identifiers.map((i, index) => (
                    <span key={index} className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold">{t(`aml:idType_${i.type}`, { defaultValue: i.type })}</span>
                      <span className="font-mono font-semibold">{i.number}</span>
                      {i.country && <span className="text-xs text-muted-foreground">{i.country}</span>}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {entry.remarks && (
              <div className="sm:col-span-2">
                <ViewItem label={t("aml:remarks")}>{entry.remarks}</ViewItem>
              </div>
            )}
            {entry.batch_id && <ViewItem label={t("aml:importBatch")}>{entry.batch_id}</ViewItem>}
          </dl>

          {entry.pending?.state === "PENDING" && (
            <div className="rounded-xl border border-amber-300 bg-amber-50/60 p-3">
              <p className="mb-2 text-xs font-bold text-amber-800">{t("aml:waitingForApproval")}</p>
              <ul>
                <Change change={entry.pending} entry={entry} />
              </ul>
            </div>
          )}

          {history.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-bold uppercase text-muted-foreground">{t("aml:changeHistory")}</p>
              <ol className="space-y-2">
                {history.map((c) => (
                  <Change key={c.id} change={c} />
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
