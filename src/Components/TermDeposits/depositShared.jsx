import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { Modal } from "@/Components/Common/Modal";
import { PROBLEM_BULLET } from "@/Services/api/apiErrors";
import { cn } from "@/Utils/Lib/utils";

// Pieces shared by the Term Deposits screens (products, deposits, balance
// adjustments, scheduled jobs).

export const inputClass = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-muted/40";
export const labelClass = "text-xs font-semibold text-slate-700";

export { dayDate } from "@/Components/Epurse/Accounts/accountShared";

// A rate in percent a year, as many decimals as it has (up to 6).
export const ratePct = (value) => (value == null || value === "" ? "—" : `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 6 })}%`);

// An amount typed by staff: digits and one point, at most `decimals`
// decimals (the currency's). Kept a string, as the server wants it.
export const amountInput = (value, decimals = 2) => {
  const clean = String(value ?? "").replace(/[^\d.]/g, "");
  const [whole, ...rest] = clean.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, decimals)}` : whole;
};

// "0" means no upper limit.
export const limitText = (t, value, format) => (Number(value) === 0 ? t("deposits:noLimit") : format(value));

// Label / value tiles.
export function Facts({ rows, className }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {rows.filter(Boolean).map(([label, value, tone]) => (
        <div key={label} className="min-w-0 rounded-xl border border-border bg-card px-3 py-2">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
          <dd className={cn("amount-fit mt-0.5 text-sm font-semibold text-foreground", tone)}>{value ?? "—"}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({ title, action, children, className }) {
  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-card p-4", className)}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

// The buttons a record's `actions` allows, gated by the menu permission:
// [{ key, label, icon, variant, run }] with falsy entries skipped.
export function ActionButtons({ buttons, busy }) {
  const list = buttons.filter(Boolean);
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {list.map((b) => (
        <Button key={b.key} variant={b.variant ?? "secondary"} size="sm" icon={b.icon} disabled={busy} onClick={b.run}>
          {b.label}
        </Button>
      ))}
    </div>
  );
}

// Approve / reject / cancel and the like: an optional (or required)
// narration, then the call. `children` goes above the narration; `label`
// names the text (a reason, say) when it is not a narration.
export function NarrationDialog({ title, hint, confirmLabel, variant = "primary", required = false, busy, onClose, onSave, children, size = "sm", label }) {
  const { t } = useTranslation("deposits");
  const [narration, setNarration] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      title={title}
      size={size}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant={variant} loading={busy} disabled={required && !narration.trim()} onClick={() => onSave(narration.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      {children}
      <label className={labelClass}>
        {label ?? t(required ? "narrationRequired" : "narration")}
        <textarea value={narration} maxLength={500} onChange={(e) => setNarration(e.target.value)} className={cn(inputClass, "mt-1.5 min-h-20")} />
      </label>
    </Modal>
  );
}

// A refused change, shown in its form: the headline, then the problems
// (the request helper puts them in the message, one "• " line each).
export function Problems({ message }) {
  if (!message) return null;
  const [headline, ...lines] = String(message).split(/\r?\n/);
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
      <p>{headline}</p>
      {lines.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 font-medium">
          {lines.map((l) => (
            <li key={l}>{l.replace(PROBLEM_BULLET, "")}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// A record's history (an `audit` reply, newest first) as a timeline.
export function AuditTimeline({ audit, empty }) {
  const { t } = useTranslation("deposits");
  return (
    <ol className="relative grid gap-3 border-l border-border pl-4">
      {audit.map((e, i) => (
        <li key={`${e.at}-${i}`} className="relative">
          <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
          <p className="text-xs font-bold">
            {t(`deposits:audit_${e.action}`, { defaultValue: e.action })} <span className="font-medium text-muted-foreground">· {e.process_status_name ?? e.status_name}</span>
          </p>
          <p className="text-[11px] text-muted-foreground">
            {e.actor} · {accountDate(e.at)}
          </p>
          {e.narration?.trim() && <p className="mt-0.5 text-xs italic">“{e.narration}”</p>}
        </li>
      ))}
      {!audit.length && <li className="text-sm text-muted-foreground">{empty}</li>}
    </ol>
  );
}
