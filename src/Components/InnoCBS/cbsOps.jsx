import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { RequiredMark } from "@/Components/Common/RequiredMark";
import { SimpleTable } from "@/Components/Common/SimpleTable";
import { accountDate } from "@/Components/InnoCBS/Accounts/accountShared";
import { labelClass, ratePct } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field } from "@/Components/InnoCBS/Loans/loanShared";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { partyBlockApi } from "@/Services/Merchant/ops.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";

// Shared pieces of the InnoCBS / InnoTreasury screens (Admin 19 onwards).

// A code as words: TERM_DEPOSIT -> Term deposit.
export const words = (code) => {
  const s = String(code ?? "").replace(/_/g, " ").toLowerCase();
  return s ? s[0].toUpperCase() + s.slice(1) : "";
};
// Choices from an options reply: a list of codes, or of { code, name } / { id, name }.
export const codes = (key) => (c) => (c?.[key] ?? []).map((v) => ({ value: v, label: words(v) }));
export const coded = (key) => (c) => (c?.[key] ?? []).map((x) => ({ value: x.code, label: `${x.code} · ${x.name}` }));
export const byId = (key) => (c) => (c?.[key] ?? []).map((x) => ({ value: String(x.id), label: [x.code, x.name].filter(Boolean).join(" · ") }));
// A label: its translation when one exists, else the key as words.
export const useL = () => {
  const { t } = useTranslation("record");
  return (key) => t(`ir_${key}`, { defaultValue: words(key) });
};
export const pct = (v) => (v === "" || v == null ? "—" : ratePct(v));
export const cell = (v) => <span className="text-xs">{v === "" || v == null ? "—" : v}</span>;
export const dateCell = (v) => cell(v ? accountDate(v) : null);
export const first = (r) => rowsOf(r)[0] ?? (r?.data && !Array.isArray(r.data) ? r.data : null);
// The value of a record row, in force or proposed.
export const sv = (r, key) => r?.[key] ?? r?.setup?.[key] ?? r?.pending?.setup?.[key];

// Staff find a customer or merchant by name, phone number or id; the value is
// "ENTITY_TYPE:id".
export function PartyPick({ value, onChange, preset }) {
  const L = useL();
  const [found, setFound] = useState(preset ? [preset] : []);
  const latest = useRef(0);
  const search = (text) => {
    if (!text) return;
    const ticket = ++latest.current;
    partyBlockApi
      .parties({ search: text, page_size: 20 })
      .then((r) => {
        if (ticket === latest.current) setFound(rowsOf(r).map((p) => ({ value: `${p.entity_type}:${p.entity_id}`, label: [p.name, p.phone_number, p.entity_type].filter(Boolean).join(" · ") })));
      })
      .catch((e) => notifications.error(e.message));
  };
  return <FilterSelect className="mt-1" value={value ?? ""} onChange={(v) => onChange(String(v ?? ""))} onSearch={search} options={[{ value: "", label: L("Type a name, phone or id") }, ...found]} />;
}
export const splitParty = (v) => {
  const [entity_type, id] = String(v ?? "").split(":");
  return entity_type && id ? { entity_type, entity_id: Number(id) } : {};
};

// One input of an OpDialog / form row. Types: those of Field, plus party and textarea.
export function OpInput({ f, value, onChange, choices, form }) {
  if (f.type === "party") return <PartyPick value={value} onChange={onChange} />;
  if (f.type === "textarea") return <textarea className="mt-1 min-h-16 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary" value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
  const options = typeof f.options === "function" ? f.options(choices ?? {}, form) : (f.options ?? []);
  return <Field field={{ ...f, options }} value={value} onChange={onChange} />;
}

const empty = (v) => v == null || v === "" || (Array.isArray(v) && !v.length);

// A small action form: fields, then `run(form)` (the call). The reply's
// message is shown; `onDone(reply)` afterwards.
export function OpDialog({ title, hint, fields, initial = {}, choices, confirmLabel, variant = "primary", run, onClose, onDone, children, size = "md" }) {
  const L = useL();
  const { t } = useTranslation("common");
  const [form, setForm] = useState(() => ({ ...Object.fromEntries(fields.map((f) => [f.key, f.type === "bool" ? false : f.type === "multi" ? [] : ""])), ...initial }));
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState([]);
  const shown = fields.filter((f) => !f.showIf || f.showIf(form));
  const missing = shown.some((f) => f.required && empty(form[f.key]));
  const save = async () => {
    setBusy(true);
    setProblems([]);
    try {
      const reply = await run(form);
      if (reply?.message) notifications.success(reply.message);
      onDone?.(reply);
    } catch (e) {
      const lines = (e?.data?.problems ?? []).map((p) => (typeof p === "string" ? p : p?.message)).filter(Boolean);
      setProblems(lines.length ? lines : [e.message]);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      onClose={onClose}
      size={size}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant={variant} loading={busy} disabled={missing} disabledReason={t("blockedFillRequired")} onClick={save}>
            {confirmLabel ?? L("Submit")}
          </Button>
        </>
      }
    >
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      {children?.(form, setForm)}
      <div className="grid gap-3 sm:grid-cols-2">
        {shown.map((f) =>
          f.type === "bool" ? (
            <div key={f.key} className="self-end">
              <Field field={{ type: "bool", label: f.label }} value={form[f.key]} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />
            </div>
          ) : (
            <div key={f.key} className={cn(labelClass, (f.wide || f.type === "textarea" || f.type === "party" || f.type === "multi") && "sm:col-span-2")}>
              {f.label}
              {f.required && <RequiredMark />}
              <OpInput f={f} value={form[f.key]} choices={choices} form={form} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />
              {f.hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{f.hint}</span>}
            </div>
          ),
        )}
      </div>
      {problems.length > 0 && (
        <ul className="mt-3 list-disc rounded-xl border border-red-200 bg-red-50 px-3 py-2 pl-7 text-xs font-semibold text-red-700">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

// A plain table of rows by column spec [{ key, label, render? }].
export function RowsTable({ rows, columns, empty: emptyText }) {
  const L = useL();
  if (!rows?.length) return <p className="text-xs text-muted-foreground">{emptyText ?? L("Nothing yet.")}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <SimpleTable columns={columns.map((c) => c.label)}>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id ?? i} className="border-b border-border/50 text-xs last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={cn("px-3 py-1.5", c.numeric && "tabular-nums")}>
                  {c.render ? c.render(r) : (r[c.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </SimpleTable>
    </div>
  );
}

// Event / timeline rows ({ at, actor, event, narration, detail }).
export function EventsTable({ rows }) {
  const L = useL();
  const detail = (d) => {
    if (!d) return "";
    try {
      const o = typeof d === "string" ? JSON.parse(d) : d;
      return Object.entries(o)
        .map(([k, v]) => `${words(k)}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
        .join(" · ");
    } catch {
      return String(d);
    }
  };
  return (
    <RowsTable
      rows={rows}
      columns={[
        { key: "at", label: L("when"), render: (e) => <span className="whitespace-nowrap">{accountDate(e.at)}</span> },
        { key: "event", label: L("event"), render: (e) => words(e.event) },
        { key: "actor", label: L("by") },
        { key: "detail", label: L("detail"), render: (e) => [e.narration, detail(e.detail)].filter(Boolean).join(" · ") || "—" },
      ]}
    />
  );
}
