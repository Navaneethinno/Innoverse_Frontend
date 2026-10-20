import { useTranslation } from "react-i18next";
import { countryNameOf } from "../Shared/amlShared";

export const ENTITY_TYPES = ["PERSON", "ORGANIZATION"];
export const REASONS = ["FRAUD", "REGULATOR", "COURT_ORDER", "INTERNAL", "OTHER"];
export const IDENTIFIER_TYPES = ["NATIONAL_ID", "PASSPORT", "TRADE_LICENCE", "TAX_ID", "PHONE", "EMAIL", "ACCOUNT", "OTHER"];
export const MAX_ALIASES = 50;
export const MAX_IDENTIFIERS = 20;

const TONES = {
  ACTIVE: "bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)] text-destructive",
  PENDING: "bg-amber-50 text-amber-700",
  EXPIRED: "bg-muted text-muted-foreground",
  REMOVED: "bg-muted text-muted-foreground",
  REJECTED: "bg-muted text-muted-foreground",
};

// An entry's status; an ACTIVE one past its date reads as expired.
export function EntryStatus({ entry }) {
  const { t } = useTranslation("aml");
  const status = entry.expired && entry.status === "ACTIVE" ? "EXPIRED" : entry.status;
  return (
    <span className="inline-grid justify-items-center gap-0.5">
      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${TONES[status] ?? TONES.REMOVED}`}>{t(`blStatus_${status}`, { defaultValue: status })}</span>
      {entry.pending?.state === "PENDING" && entry.status !== "PENDING" && (
        <span className="whitespace-nowrap text-[10px] font-semibold text-amber-700">{t(`blWaiting_${entry.pending.action}`, { defaultValue: entry.pending.action })}</span>
      )}
    </span>
  );
}

// An identifier as "Passport K1234567 · SA".
export const identifierText = (i) => [i.type && `${i.type.replaceAll("_", " ").toLowerCase()}`, i.number, i.country].filter(Boolean).join(" ");

export function CountryList({ codes }) {
  const { i18n } = useTranslation();
  if (!codes?.length) return "-";
  return codes.map((c) => countryNameOf(c, i18n.language)).join(", ");
}

// A phone needs 7+ digits, an email an @, the rest 4+ letters or digits.
export const identifierProblem = (i) => {
  const number = String(i.number ?? "").trim();
  if (!number) return "identifierNumberRequired";
  if (i.type === "PHONE") return number.replace(/\D/g, "").length >= 7 ? null : "identifierPhoneShort";
  if (i.type === "EMAIL") return number.includes("@") ? null : "identifierEmailInvalid";
  return number.replace(/[^\p{L}\p{N}]/gu, "").length >= 4 ? null : "identifierTooShort";
};

export const BIRTH_DATE = /^\d{4}(-(0[1-9]|1[0-2])(-(0[1-9]|[12]\d|3[01]))?)?$/;
