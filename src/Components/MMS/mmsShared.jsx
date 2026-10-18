import { useTranslation } from "react-i18next";
import { cn } from "@/Utils/Lib/utils";

// A merchant-side party is addressed by { entity_type, entity_id }.
export const partyRef = (p) => (p ? { entity_type: p.entity_type, entity_id: p.entity_id } : null);
export const partyKey = (p) => `${p?.entity_type}-${p?.entity_id}`;

// The data[0] of a paged MMS list: { items, total }.
export const pageOf = (response) => {
  const data = Array.isArray(response?.data) ? response.data[0] : response?.data;
  return { items: data?.items ?? [], total: data?.total ?? 0 };
};

const TONES = {
  PENDING: "bg-amber-50 text-amber-700",
  ACTIVE: "bg-emerald-50 text-emerald-700",
  APPROVED: "bg-emerald-50 text-emerald-700",
  REJECTED: "bg-red-50 text-red-700",
  BLOCKED: "bg-red-50 text-red-700",
  INACTIVE: "bg-slate-100 text-slate-600",
  CANCELLED: "bg-slate-100 text-slate-600",
  RETIRED: "bg-slate-100 text-slate-600",
};

// A status word (PENDING, ACTIVE, ...) as a coloured pill.
export function MmsStatus({ value }) {
  const { t } = useTranslation("mms");
  if (!value) return null;
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold", TONES[value] ?? "bg-muted text-muted-foreground")}>{t(`status_${value}`, { defaultValue: value })}</span>;
}

const TIER_TONES = { SUPER_AGENT: "bg-violet-50 text-violet-700", AGENT: "bg-sky-50 text-sky-700", MERCHANT: "bg-slate-100 text-slate-700" };

// A role: MERCHANT, AGENT or SUPER_AGENT.
export function RoleBadge({ value }) {
  const { t } = useTranslation("mms");
  if (!value) return null;
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-bold", TIER_TONES[value] ?? "bg-muted")}>{t(`role_${value}`, { defaultValue: value })}</span>;
}

export const mmsDate = (value) => (value ? new Date(value).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");
