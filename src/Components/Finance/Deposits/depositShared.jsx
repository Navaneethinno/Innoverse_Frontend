import { useState } from "react";
import { PagedList } from "@/Components/Common/Pager";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import { Modal } from "@/Components/Common/Modal";
import { PROBLEM_BULLET } from "@/Services/api/apiErrors";
import { cn } from "@/Utils/Lib/utils";
import { formatNumber } from "@/Utils/Lib/numberFormat";

// Pieces shared by the Term Deposits screens (products, deposits, balance
// adjustments, scheduled jobs).

export const inputClass = "w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary disabled:bg-muted/40";
export const labelClass = "text-xs font-semibold text-slate-700";

export { dayDate } from "@/Components/Finance/Accounts/accountShared";

// A rate in percent a year, as many decimals as it has (up to 6).
export const ratePct = (value) => (value == null || value === "" ? "—" : `${formatNumber(value, { min: 0, max: 6 })}%`);

// An amount typed by staff: digits and one point, at most `decimals`
// decimals (the currency's). Kept a string, as the server wants it.
export const amountInput = (value, decimals = 2) => {
  const clean = String(value ?? "").replace(/[^\d.]/g, "");
  // A leading 0 goes once a digit is typed after it ("05" -> "5", "0.5" stays).
  const [whole, ...rest] = clean.split(".").map((part, i) => (i === 0 ? part.replace(/^0+(?=\d)/, "") : part));
  return rest.length ? `${whole}.${rest.join("").slice(0, decimals)}` : whole;
};

// A percent being typed: like a rate (6 decimals), never above 100.
export const percentInput = (value) => {
  const clean = amountInput(value, 6);
  return Number(clean) > 100 ? "100" : clean;
};

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

// A record's history (an `audit` reply, newest first) as a timeline.
export function AuditTimeline({ audit, empty }) {
  const { t } = useTranslation("deposits");
  return (
    <PagedList items={audit}>
      {(page) => (
        <ol className="relative grid gap-3 border-l border-border pl-4">
          {page.map((e, i) => (
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
      )}
    </PagedList>
  );
}
