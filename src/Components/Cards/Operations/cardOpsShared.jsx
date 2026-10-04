import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { UserRound, X } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { cardProductsApi } from "@/Services/Cards/cards.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { cn } from "@/Utils/Lib/utils";
import { money } from "@/Components/Epurse/Accounts/accountShared";
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
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold transition-colors duration-300", TONE[code] ?? "bg-muted text-muted-foreground")}>{cardWord(t, prefix, code)}</span>;
}

// A card drawn as a card: product, masked number, name, expiry, network.
// A card that cannot be used is greyed.
const STOPPED = ["BLOCKED", "LOST", "STOLEN", "HOTLISTED", "EXPIRED", "CLOSED"];
export function CardFace({ card, className }) {
  const { t } = useTranslation("cards");
  return (
    <div
      className={cn(
        "card-tilt relative flex aspect-[1.586] w-full max-w-[300px] flex-col justify-between overflow-hidden rounded-2xl p-4 text-white shadow-lg",
        STOPPED.includes(card.ops_status) && "opacity-60 grayscale",
        className,
      )}
      style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 55%, #1e1b4b))" }}
    >
      <span className="pointer-events-none absolute -right-10 -top-12 h-36 w-36 rounded-full bg-white/10" aria-hidden="true" />
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-sm font-bold">{card.product_code}</span>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider text-white/75">{cardWord(t, "opt", card.form_factor)}</span>
      </span>
      {card.form_factor === "PHYSICAL" && <span className="h-6 w-9 rounded-md bg-gradient-to-br from-amber-200 to-amber-400 opacity-90" aria-hidden="true" />}
      <span>
        <span className="block font-mono text-base font-semibold tracking-[0.12em] [overflow-wrap:anywhere]">{card.pan_masked}</span>
        <span className="mt-1 block truncate text-[11px] uppercase tracking-wide">{card.name_on_card || "—"}</span>
        <span className="mt-0.5 flex items-end justify-between gap-2 text-[11px]">
          <span className="font-mono">{card.expiry}</span>
          <span className="min-w-0 truncate font-black italic tracking-tight">{card.network_code}</span>
        </span>
      </span>
    </div>
  );
}

// The card a dialog is about to issue or request: the product's BIN (from
// the product's own record) then dots, and the name it will carry.
export function ProductCardPreview({ product, form, name, holder }) {
  const { t } = useTranslation("cards");
  const [refs, setRefs] = useState({});
  useEffect(() => {
    if (!product?.id) return undefined;
    let cancelled = false;
    cardProductsApi
      .get({ id: product.id })
      .then((r) => !cancelled && setRefs({ id: product.id, ...(rowsOf(r)[0]?.refs ?? {}) }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [product?.id]);
  const known = refs.id === product?.id ? refs : {};
  const bin = String(product?.bin_code ?? known.bin_code ?? "");
  const length = Math.min(19, Math.max(13, Number(product?.pan_length ?? known.pan_length) || 16));
  const pan = bin.padEnd(length, "•").slice(0, length).replace(/(.{4})(?=.)/g, "$1 ");
  return (
    <CardFace
      className="mx-auto w-full max-w-[280px] sm:w-64"
      card={{ pan_masked: pan, product_code: product?.product_code ?? t("binPreview"), form_factor: form, network_code: product?.network_code ?? known.network_code, name_on_card: name?.trim() || holder?.name?.toUpperCase() || t("binPreviewName"), expiry: "MM/YY", ops_status: "ACTIVE" }}
    />
  );
}

// A dialog's fields with the card beside them (below on a phone).
export function WithCard({ card, children }) {
  return (
    <div className="flex flex-col-reverse gap-4 sm:flex-row sm:items-start">
      <div className="grid min-w-0 flex-1 gap-3">{children}</div>
      <div className="shrink-0 sm:sticky sm:top-0">{card}</div>
    </div>
  );
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
// onChange({ entity_type, entity_id, name, acct_num, avail_bal, currency_code })
// or null; the wallet it was found by shows with the name.
export function HolderPicker({ value, onChange }) {
  const { t } = useTranslation("cards");
  if (value) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-3 py-2">
        <span className="flex min-w-0 items-center gap-2">
          <UserRound size={15} className="shrink-0 text-primary" />
          <span className="min-w-0">
            <span className="block truncate text-sm font-bold">{value.name}</span>
            {value.acct_num && (
              <span className="block truncate font-mono text-[11px] text-muted-foreground">
                {value.acct_num}
                {value.avail_bal != null && <span className="font-sans font-semibold"> · {money(value.avail_bal, value.currency_code)}</span>}
              </span>
            )}
          </span>
        </span>
        <button type="button" onClick={() => onChange(null)} className="flex items-center gap-1 text-xs font-semibold text-muted-foreground transition-colors hover:text-primary">
          <X size={13} /> {t("change")}
        </button>
      </div>
    );
  }
  return <OwnerFinder onPick={(entity, account) => onChange({ ...entity, name: account?.owner?.name ?? "", acct_num: account?.acct_num, avail_bal: account?.avail_bal, currency_code: account?.currency_code })} />;
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
