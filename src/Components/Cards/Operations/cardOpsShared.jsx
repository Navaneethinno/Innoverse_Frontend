import { useState } from "react";
import { useTranslation } from "react-i18next";
import { UserRound, X } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { cn } from "@/Utils/Lib/utils";
import { OwnerFinder } from "../../TermDeposits/Deposits/OpenDeposit";
import { inputClass, labelClass } from "../../TermDeposits/depositShared";

// Pieces shared by the Card Operations screens (Cards, Card Requests, Card
// Orders, Card Stock).

// A status / mode code as words, from the cards namespace ("ops_ACTIVE",
// "opt_COURIER"...), else the code made readable.
const readable = (code) => {
  const text = String(code ?? "").replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
};
export const cardWord = (t, prefix, code) => (code ? t(`cards:${prefix}_${code}`, { defaultValue: readable(code) }) : "—");

const TONE = {
  ACTIVE: "bg-emerald-50 text-emerald-700",
  ISSUED: "bg-emerald-50 text-emerald-700",
  FULFILLED: "bg-emerald-50 text-emerald-700",
  RECEIVED: "bg-emerald-50 text-emerald-700",
  AVAILABLE: "bg-emerald-50 text-emerald-700",
  PENDING_ACTIVATION: "bg-amber-50 text-amber-900",
  PENDING: "bg-amber-50 text-amber-900",
  SUBMITTED: "bg-amber-50 text-amber-900",
  ASSIGNED: "bg-blue-50 text-blue-700",
  IN_PRODUCTION: "bg-blue-50 text-blue-700",
  GENERATED: "bg-blue-50 text-blue-700",
  PREFILED: "bg-blue-50 text-blue-700",
  IN_INVENTORY: "bg-blue-50 text-blue-700",
  BATCH_RECEIVED: "bg-blue-50 text-blue-700",
  PAN_GENERATED: "bg-blue-50 text-blue-700",
  BLOCKED: "bg-orange-50 text-orange-700",
  LOST: "bg-red-50 text-red-700",
  STOLEN: "bg-red-50 text-red-700",
  HOTLISTED: "bg-red-50 text-red-700",
  REJECTED: "bg-red-50 text-red-700",
  CANCELLED: "bg-red-50 text-red-700",
};

// One status as a pill; `prefix` picks its words (ops, iss, req, ord, inv).
export function CardPill({ prefix, code }) {
  const { t } = useTranslation("cards");
  if (!code) return <span className="text-xs text-muted-foreground">—</span>;
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold", TONE[code] ?? "bg-muted text-muted-foreground")}>{cardWord(t, prefix, code)}</span>;
}

// The masked card number and expiry, in the card font.
export function CardNumber({ card, className }) {
  return (
    <span className={cn("whitespace-nowrap font-mono text-xs font-bold", className)}>
      {card.pan_masked}
      {card.expiry && <span className="ml-1.5 font-sans text-[10px] font-semibold text-muted-foreground">{card.expiry}</span>}
    </span>
  );
}

// The card holder: find a customer or merchant by name or wallet number
// (the Open Deposit finder), shown once picked with a way to change it.
// onChange({ entity_type, entity_id, name }) or null.
export function HolderPicker({ value, onChange }) {
  const { t } = useTranslation("cards");
  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
        <span className="flex min-w-0 items-center gap-2 text-sm font-bold">
          <UserRound size={15} className="shrink-0 text-primary" /> <span className="truncate">{value.name}</span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary">
          <X size={13} /> {t("change")}
        </button>
      </div>
    );
  }
  return <OwnerFinder onPick={(entity, account) => onChange({ ...entity, name: account?.owner?.name ?? "" })} />;
}

// A labelled field.
export function Labelled({ label, hint, children, className }) {
  return (
    <label className={cn(labelClass, "block", className)}>
      {label}
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{hint}</span>}
    </label>
  );
}

// Delivery of a physical card: the mode and the address / pick-up point.
export function DeliveryFields({ modes, value, onChange }) {
  const { t } = useTranslation("cards");
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Labelled label={t("deliveryMode")}>
        <FilterSelect value={value.delivery_mode} onChange={(v) => onChange({ ...value, delivery_mode: v })} options={(modes ?? ["BRANCH_PICKUP", "COURIER", "AGENT"]).map((m) => ({ value: m, label: cardWord(t, "opt", m) }))} />
      </Labelled>
      <Labelled label={t("deliveryRef")} hint={t("deliveryRefHint")}>
        <input className={inputClass} value={value.delivery_ref} onChange={(e) => onChange({ ...value, delivery_ref: e.target.value })} />
      </Labelled>
    </div>
  );
}

// A server-paged list: the DataTable with its pager wired up.
export function PagedTable({ columns, rows, total, page, limit, setPage, setLimit, loading, title, emptyTitle, emptyDescription, rowKey = (r) => r.id }) {
  return (
    <DataTable
      columns={columns}
      rows={rows}
      rowKey={rowKey}
      isLoading={loading}
      title={title}
      emptyTitle={emptyTitle}
      emptyDescription={emptyDescription}
      serverSorted
      serverPagination={{
        page,
        totalPages: Math.max(1, Math.ceil(total / limit)),
        totalRecords: total,
        onPageChange: setPage,
        limit,
        onLimitChange: (n) => {
          setLimit(Math.min(n, 100));
          setPage(1);
        },
      }}
    />
  );
}

// Page state for a server-paged, filtered list.
export function usePagedFilters(blank) {
  const [filters, setFilters] = useState(blank);
  const [applied, setApplied] = useState(blank);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const set = (key) => (value) => setFilters((f) => ({ ...f, [key]: value }));
  const apply = (next = filters) => {
    setApplied(next);
    setPage(1);
  };
  return { filters, set, applied, apply, page, setPage, limit, setLimit };
}

// Only the filters that have a value, numbers as numbers.
export const filterBody = (applied, numeric = []) =>
  Object.fromEntries(
    Object.entries(applied)
      .filter(([, v]) => v !== "" && v !== false && v != null)
      .map(([k, v]) => [k, numeric.includes(k) ? Number(v) : typeof v === "string" ? v.trim() : v]),
  );
