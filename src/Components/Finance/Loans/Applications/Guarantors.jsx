import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { AmountInput } from "@/Components/Common/AmountInput";
import { Button } from "@/Components/Common/Button";
import { Modal } from "@/Components/Common/Modal";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { money } from "@/Components/Finance/Accounts/accountShared";
import { cn } from "@/Utils/Lib/utils";
import { Facts, inputClass, labelClass } from "../../Deposits/depositShared";
import { AccountPick } from "../../coreBankingShared";
import { Field, MiniTable, loanLabel, useInstitutionScope } from "../loanShared";

// An application's guarantors: our customers (their pledge is held under
// lien from disbursement until the loan ends) or people outside the bank.
export function Guarantors({ rows, readiness: r, required, currency, onRemove }) {
  const { t } = useTranslation("loans");
  const list = (rows ?? []).filter((g) => g.status !== "REMOVED");
  return (
    <div className="grid gap-2">
      {Number(required) > 0 && (
        <p
          className={cn(
            "rounded-xl px-3 py-2 text-xs font-semibold",
            r.guarantors_ok ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900",
          )}
        >
          {t("guarantorsHave", { have: r.guarantors ?? list.length, need: Number(required) })}
        </p>
      )}
      <MiniTable
        rows={list}
        currency={currency}
        empty={t("noGuarantors")}
        columns={[
          {
            key: "name",
            label: t("guarantor"),
            render: (g) => (
              <span className="text-xs leading-tight">
                <b className="block">{g.name ?? g.full_name}</b>
                <span className="text-[10px] text-muted-foreground">
                  {[g.entity_id ? t("ourCustomer") : t("outsideGuarantor"), g.relationship, g.phone]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
            ),
          },
          { key: "guaranteed_amount", label: t("guaranteedAmount"), amount: true },
          {
            key: "pledge",
            label: t("pledge"),
            render: (g) =>
              Number(g.pledge_amount) > 0 ? (
                <span className="text-xs">{`${money(g.pledge_amount, currency)} · ${g.pledge_acct_num ?? ""}`}</span>
              ) : (
                "—"
              ),
          },
          {
            key: "status",
            label: t("status"),
            render: (g) => <StatusBadge status={g.status} variant="subtle" />,
          },
          {
            key: "actions",
            label: "",
            render: (g) =>
              onRemove &&
              g.status === "PROPOSED" && (
                <ActionIconButton
                  label={t("removeGuarantor")}
                  intent="delete"
                  icon={Trash2}
                  onClick={() => onRemove(g)}
                />
              ),
          },
        ]}
      />
    </div>
  );
}

// Add a guarantor: one of our customers, found through the account that
// holds their pledge, or someone outside the bank (no pledge).
export function GuarantorDialog({ currency, busy, onClose, onSave }) {
  const { t } = useTranslation("loans");
  const { scope } = useInstitutionScope();
  const [kind, setKind] = useState("customer");
  const [account, setAccount] = useState(null);
  const [f, setF] = useState({
    guaranteed_amount: "",
    pledge_amount: "",
    relationship: "",
    full_name: "",
    id_number: "",
    phone: "",
  });
  const set = (key) => (value) => setF((x) => ({ ...x, [key]: value }));
  const ready =
    Number(f.guaranteed_amount) > 0 &&
    (kind === "customer" ? account : f.full_name.trim() && f.id_number.trim());
  const save = () =>
    onSave(
      kind === "customer"
        ? {
            entity_type: account.owner.kind,
            entity_id: account.owner.id,
            guaranteed_amount: f.guaranteed_amount,
            relationship: f.relationship.trim(),
            ...(Number(f.pledge_amount) > 0
              ? { pledge_acct_id: account.id, pledge_amount: f.pledge_amount }
              : {}),
          }
        : {
            full_name: f.full_name.trim(),
            id_number: f.id_number.trim(),
            phone: f.phone.trim(),
            relationship: f.relationship.trim(),
            guaranteed_amount: f.guaranteed_amount,
          },
    );
  const amount = (key, label) => (
    <label className={labelClass}>
      {label}
      <AmountInput className={cn(inputClass, "mt-1.5")} value={f[key]} onChange={set(key)} />
    </label>
  );
  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={t("addGuarantor")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button loading={busy} disabled={!ready} onClick={save}>
            {t("addGuarantor")}
          </Button>
        </>
      }
    >
      <SegmentedSwitch
        value={kind}
        onChange={setKind}
        options={[
          { value: "customer", label: t("ourCustomer") },
          { value: "outside", label: t("outsideGuarantor") },
        ]}
      />
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {kind === "customer" ? (
          <>
            <label className={cn(labelClass, "sm:col-span-2")}>
              {t("guarantorAccount")}
              <div className="mt-1.5">
                <AccountPick
                  value={account}
                  onChange={setAccount}
                  scope={scope}
                  filter={(a) => /^CUST_/.test(a.owner?.kind ?? "")}
                />
              </div>
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                {t("guarantorAccountHint")}
              </span>
            </label>
            {amount("guaranteed_amount", t("guaranteedAmountIn", { currency }))}
            {amount("pledge_amount", t("pledgeAmountIn", { currency }))}
          </>
        ) : (
          <>
            <label className={labelClass}>
              {t("fullName")}
              <Field field={{}} value={f.full_name} onChange={set("full_name")} />
            </label>
            <label className={labelClass}>
              {t("idNumber")}
              <Field field={{}} value={f.id_number} onChange={set("id_number")} />
            </label>
            <label className={labelClass}>
              {t("phone")}
              <Field
                field={{}}
                value={f.phone}
                onChange={(v) => set("phone")(v.replace(/[^\d+]/g, ""))}
              />
            </label>
            {amount("guaranteed_amount", t("guaranteedAmountIn", { currency }))}
          </>
        )}
        <label className={labelClass}>
          {t("relationship")}
          <Field
            field={{ placeholder: t("relationshipPlaceholder") }}
            value={f.relationship}
            onChange={set("relationship")}
          />
        </label>
      </div>
    </Modal>
  );
}

// Ask the credit bureau: the identity number defaults to the borrower's
// onboarding answer (a company must give it); the consent is required.
export function BureauCheckDialog({ corporate, busy, onClose, onSave }) {
  const { t } = useTranslation("loans");
  const [idNumber, setIdNumber] = useState("");
  const [consent, setConsent] = useState("");
  const ready = consent.trim() && (!corporate || idNumber.trim());
  return (
    <Modal
      open
      onClose={onClose}
      title={t("bureauCheck")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("cancel")}
          </Button>
          <Button
            loading={busy}
            disabled={!ready}
            onClick={() =>
              onSave({
                consent_reference: consent.trim(),
                ...(idNumber.trim() ? { id_number: idNumber.trim() } : {}),
              })
            }
          >
            {t("askBureau")}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted-foreground">{t("bureauCheckHint")}</p>
      <div className="grid gap-3">
        <label className={labelClass}>
          {t(corporate ? "idNumberRequired" : "idNumberOptional")}
          <Field field={{}} value={idNumber} onChange={setIdNumber} />
        </label>
        <label className={labelClass}>
          {t("consentReference")}
          <Field field={{ placeholder: "CONSENT-123" }} value={consent} onChange={setConsent} />
        </label>
      </div>
    </Modal>
  );
}

const OUTCOME_TONE = {
  CLEAR: "text-emerald-700",
  ADVERSE: "text-red-700",
  REFER: "text-amber-700",
};

// The bureau's answer: score, outcome and the borrower's credit elsewhere.
export function BureauReport({ report: b, currency, onClose }) {
  const { t } = useTranslation("loans");
  return (
    <Modal open onClose={onClose} title={t("bureauReport")} subtitle={b.reference}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className={cn("text-3xl font-black", OUTCOME_TONE[b.outcome])}>
          {loanLabel(t, b.outcome)}
        </p>
        <p className="text-right">
          <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            {t("score")}
          </span>
          <span className="text-2xl font-black tabular-nums">{b.score ?? "—"}</span>
        </p>
      </div>
      <Facts
        rows={[
          [t("activeLoansElsewhere"), b.active_loans ?? "—"],
          [t("totalOutstanding"), money(b.total_outstanding, currency)],
          [t("worstDaysPastDue"), b.worst_days_past_due ?? "—"],
          [t("defaults"), b.defaults ?? "—", Number(b.defaults) > 0 ? "text-red-700" : undefined],
        ]}
      />
      {b.summary && <p className="mt-3 rounded-xl bg-muted/50 px-3 py-2 text-xs">{b.summary}</p>}
    </Modal>
  );
}
