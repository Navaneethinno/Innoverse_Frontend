import { AuditHistory } from "@/Components/Common/AuditModal";
import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { PROBLEM_BULLET } from "@/Services/api/apiErrors";
import { cn } from "@/Utils/Lib/utils";
import { formatNumber } from "@/Utils/Lib/numberFormat";

// Pieces shared by the Term Deposits screens (products, deposits, balance
// adjustments, scheduled jobs).

export const inputClass = "w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary disabled:bg-muted/40";
export const labelClass = "text-xs font-semibold text-slate-700";

export { dayDate } from "@/Components/InnoCBS/Accounts/accountShared";

// A rate in percent a year, as many decimals as it has (up to 6).
export const ratePct = (value) => (value == null || value === "" ? "—" : `${formatNumber(value, { min: 0, max: 6 })}%`);

export { amountInput, percentInput } from "@/Utils/Lib/amountInput";

// Label / value tiles.
export function Facts({ rows, className }) {
  return (
    <dl className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {rows.filter(Boolean).map(([label, value, tone]) => (
        <div key={label} className="min-w-0 rounded-xl border border-border bg-card px-3 py-2">
          <dt className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</dt>
          <dd className={cn("amount-fit mt-0.5 text-sm font-semibold text-foreground", tone)}>{typeof value === "string" && /^-?\d+\.\d+$/.test(value) ? Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : (value ?? "—")}</dd>
        </div>
      ))}
    </dl>
  );
}

// `collapsible` (history): closed until clicked, and what's inside isn't drawn
// until then.
export function Section({ title, action, children, className, collapsible = false }) {
  const [open, setOpen] = useState(!collapsible);
  return (
    <section className={cn("min-w-0 rounded-2xl border border-border bg-card p-4", className)}>
      {collapsible ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((x) => !x)}
          className={cn("-m-2 flex w-[calc(100%+1rem)] cursor-pointer items-center justify-between gap-2 rounded-xl p-2 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", open && "mb-1")}
        >
          <h2 className="text-sm font-bold text-foreground">{title}</h2>
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-background text-foreground">
            <ChevronDown size={16} aria-hidden className={cn("pointer-events-none transition-transform", open && "rotate-180")} />
          </span>
        </button>
      ) : (
        (title || action) && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-bold text-foreground">{title}</h2>
            {action}
          </div>
        )
      )}
      {open && children}
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
        <Button key={b.key} variant={b.variant ?? "secondary"} size="sm" icon={b.icon} disabled={busy || b.disabled} disabledReason={b.disabledReason} onClick={b.run}>
          {b.label}
        </Button>
      ))}
    </div>
  );
}

// Approve / reject / cancel and the like: an optional (or required)
// narration, then the call. `children` goes above the narration; `label`
// names the text (a reason, say) when it is not a narration.
export function NarrationDialog({ title, hint, confirmLabel, variant = "primary", required = false, busy, onClose, onSave, children, size = "sm", label, maxLength = 500 }) {
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
          <Button variant={variant} loading={busy} disabled={required && !narration.trim()} disabledReason={t("common:blockedFillRequired")} onClick={() => onSave(narration.trim())}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      {children}
      <label className={labelClass}>
        {label ?? t(required ? "narrationRequired" : "narration")}
        <textarea value={narration} maxLength={maxLength} onChange={(e) => setNarration(e.target.value)} className={cn(inputClass, "mt-1.5 min-h-20")} />
      </label>
    </Modal>
  );
}

// A refused change, shown in its form: the headline, then the problems
// (the request helper puts them in the message, one "• " line each).
// The step a problem belongs to, worked out here (the server names fields,
// not pages): a row code it mentions ("Term 12M: ..." -> the step whose
// `codes` hold 12M), else its first word ("product: ...") in `words`.
const isCodeIn = (text, code) => {
  const at = code ? text.indexOf(code) : -1;
  return at >= 0 && !/\w/.test(text[at - 1] ?? "") && !/\w/.test(text[at + code.length] ?? "");
};
export const problemStepOf = (text, { codes = {}, words = {} }) =>
  Object.keys(codes).find((step) => codes[step].some((code) => isCodeIn(text, String(code ?? "")))) ?? words[String(text).split(":")[0].trim().split(/\s+/)[0].toLowerCase()] ?? null;
const problemLines = (message) =>
  String(message ?? "")
    .split(/\r?\n/)
    .slice(1)
    .map((l) => l.replace(PROBLEM_BULLET, ""));
// `keys` (the refusal's problem_keys, same order): its `section` names the
// step outright; the text is only read when a problem has none.
export const firstProblemStep = (message, stepOf, keys = []) => problemLines(message).map((text, i) => stepOf(text, keys[i])).find(Boolean) ?? null;

// Brings a refused field into view once its step has rendered: scrolled to
// the middle of the screen, focused, and pulsed red. `field` is the
// server's field name (an input's `name`); without one, the first outlined
// (aria-invalid) input.
export function focusProblemField(field) {
  window.setTimeout(() => {
    const el = (field && document.querySelector(`[name="${CSS.escape(field)}"][aria-invalid="true"]`)) || (field && document.querySelector(`[name="${CSS.escape(field)}"]`)) || document.querySelector('[aria-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
    el.classList.remove("field-flash");
    void el.offsetWidth;
    el.classList.add("field-flash");
  }, 80);
}

// The fields the server refused in one section (to outline them).
export const problemFields = (keys, section) => (keys ?? []).filter((k) => k?.field && k.section === section).map((k) => k.field);

// A refusal's headline and problems. With `stepOf` (problem text, key ->
// step) and `onGo`, each problem whose step is known links to it ("Fix in
// <step>"). `keys` (problem_keys) say which field each problem is about;
// `fieldLabel(field)` puts the form's own label in place of the server's
// field name ("fee_code May only..." -> "Fee code: May only...").
export function Problems({ message, stepOf, onGo, stepLabel, keys = [], fieldLabel }) {
  const { t } = useTranslation("common");
  if (!message) return null;
  const [headline, ...lines] = String(message).split(/\r?\n/);
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
      <p>{headline}</p>
      {lines.length > 0 && (
        <ul className="mt-1 list-disc space-y-0.5 pl-4 font-medium">
          {lines.map((l, i) => {
            const raw = l.replace(PROBLEM_BULLET, "");
            const key = keys[i];
            const label = key?.field && fieldLabel?.(key.field);
            const text = label && raw.includes(key.field) ? raw.replace(key.field, "").replace(/^[\s:·-]+/, "") : raw;
            const target = onGo && stepOf(raw, key);
            return (
              <li key={l}>
                {target && stepLabel && <span className="font-bold">{stepLabel(target)} · </span>}
                {label && <span className="font-bold">{label}: </span>}
                {text}
                {target && (
                  <button
                    type="button"
                    onClick={() => {
                      onGo(target);
                      focusProblemField(key?.field);
                    }}
                    className="ml-2 font-bold underline underline-offset-2 hover:text-red-900"
                  >
                    {t("fixIn", { step: stepLabel(target) })}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

// A record's history (an `audit` reply): the shared history view, the
// same as the Audit window.
export function AuditTimeline({ audit, renderExtra, getActionLabel }) {
  return <AuditHistory entries={audit} renderExtra={renderExtra} getActionLabel={getActionLabel} />;
}
