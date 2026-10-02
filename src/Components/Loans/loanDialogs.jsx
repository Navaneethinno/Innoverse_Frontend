import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { accountDate, money } from "@/Components/Epurse/Accounts/accountShared";
import { cn } from "@/Utils/Lib/utils";
import { Problems, inputClass, labelClass } from "../TermDeposits/depositShared";
import { Field, MiniTable, loanLabel } from "./loanShared";

// Dialogs and record tables shared by Loan Applications and Loan Facilities.

export function CollateralTable({ rows, currency, onRemove }) {
  const { t } = useTranslation("loans");
  return (
    <MiniTable
      rows={rows}
      columns={[
        { key: "collateral_type", label: t("type"), render: (c) => <b>{loanLabel(t, c.collateral_type)}</b> },
        { key: "description", label: t("description") },
        { key: "declared_value", label: t("declaredValue"), align: "right", render: (c) => money(c.declared_value, currency) },
        { key: "accepted_value", label: t("acceptedValue"), align: "right", render: (c) => money(c.accepted_value, currency) },
        { key: "registry_reference", label: t("registryLien"), render: (c) => [c.registry_reference, c.lien_reference].filter(Boolean).join(" · ") || "—" },
        { key: "status", label: t("status"), render: (c) => <StatusBadge status={c.status} variant="subtle" /> },
        onRemove && { key: "remove", label: "", render: (c) => <ActionIconButton label={t("remove")} intent="delete" icon={Trash2} onClick={() => onRemove(c)} /> },
      ].filter(Boolean)}
    />
  );
}

export function FeesTable({ rows, currency }) {
  const { t } = useTranslation("loans");
  return (
    <MiniTable
      rows={rows}
      rowKey={(f, i) => `${f.fee_code}-${f.rrn ?? i}`}
      columns={[
        { key: "fee_name", label: t("fee"), render: (f) => <b>{f.fee_name ?? f.fee_code}</b> },
        { key: "collection_point", label: t("charged"), render: (f) => loanLabel(t, f.collection_point) },
        { key: "amount", label: t("amount"), align: "right", render: (f) => money(f.amount, currency) },
        { key: "rrn", label: "RRN", render: (f) => f.rrn ?? "—" },
        { key: "charged_time", label: t("when"), render: (f) => accountDate(f.charged_time) },
        { key: "refund", label: t("refund"), render: (f) => (f.refund_rrn ? <span className="font-semibold text-emerald-700">{t("refundedRrn", { rrn: f.refund_rrn })}</span> : f.refundable ? t("refundable") : "—") },
      ]}
    />
  );
}

// A dialog with one required text (consent reference, a message, reasons).
export function OneFieldDialog({ title, hint, label, placeholder, multiline, danger, busy, onClose, onSave }) {
  const { t } = useTranslation("loans");
  const [value, setValue] = useState("");
  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} disabled={!value.trim()} onClick={() => onSave(value.trim())}>
            {title}
          </Button>
        </>
      }
    >
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      <label className={labelClass}>
        {label}
        {multiline ? <textarea className={cn(inputClass, "mt-1.5 min-h-24")} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} /> : <input className={cn(inputClass, "mt-1.5")} placeholder={placeholder} value={value} onChange={(e) => setValue(e.target.value)} />}
      </label>
    </Modal>
  );
}

// A form dialog built from Field definitions; `required` keys must be set.
export function FormDialog({ title, hint, fields, initial = {}, required = [], confirmLabel, danger, busy, onClose, onSave, toBody = (f) => f, problem }) {
  const { t } = useTranslation("loans");
  const [form, setForm] = useState(initial);
  const missing = required.some((k) => String(form[k] ?? "").trim() === "");
  const extra = problem?.(form);
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button variant={danger ? "danger" : "primary"} loading={busy} disabled={missing || Boolean(extra)} onClick={() => onSave(toBody(form))}>
            {confirmLabel ?? title}
          </Button>
        </>
      }
    >
      {hint && <p className="mb-3 text-sm text-muted-foreground">{hint}</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        {fields.filter(Boolean).map((f) => (
          <label key={f.key} className={cn(labelClass, f.span ?? "")}>
            {f.label}
            {required.includes(f.key) && <span className="text-red-500"> *</span>}
            <Field field={f} value={form[f.key]} onChange={(v) => setForm((x) => ({ ...x, [f.key]: v }))} />
            {f.hint && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{f.hint}</span>}
          </label>
        ))}
      </div>
      {extra && (
        <div className="mt-3">
          <Problems message={extra} />
        </div>
      )}
    </Modal>
  );
}
