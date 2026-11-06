import { useTranslation } from "react-i18next";
import { Section, labelClass } from "@/Components/InnoCBS/Deposits/depositShared";
import { Field, RowsEditor } from "@/Components/InnoCBS/Loans/loanShared";
import { expiryRulesApi } from "@/Services/Expiry/expiry.api";
import { SectionScreen } from "@/Components/InnoCBS/Settings/SectionScreen";
import { cn } from "@/Utils/Lib/utils";
const DOCUMENT_KINDS = ["ID_DOCUMENT", "CORP_DOCUMENT"];
const DAYS = ["warn_days", "remind_days", "grace_days"];
// The rules as the server takes them: days as numbers. The whole list is
// sent; a kind left out falls back to its default.
const toBody = (rules) =>
  rules.map((r) => ({
    kind: r.kind,
    document_type_id: Number(r.document_type_id) || 0,
    ...Object.fromEntries(DAYS.map((k) => [k, Number(r[k]) || 0])),
    action: r.action,
    notify_party: Boolean(r.notify_party),
    notify_staff: Boolean(r.notify_staff),
  }));
// Checked before proposing (the server checks the same).
function rulesProblem(t, rules) {
  for (const r of rules) {
    if (DAYS.some((k) => r[k] === "" || Number(r[k]) > 365)) return t("daysRange");
    if (Number(r.remind_days) > 0 && Number(r.remind_days) >= Number(r.warn_days))
      return t("remindBeforeWarn");
    if (DOCUMENT_KINDS.includes(r.kind) && r._typed && !Number(r.document_type_id))
      return t("chooseDocumentType");
  }
  const typed = rules.filter((r) => Number(r.document_type_id));
  if (new Set(typed.map((r) => `${r.kind}-${r.document_type_id}`)).size !== typed.length)
    return t("typeOnce");
  return "";
}
// The form's rules with days as text, for the inputs.
const asFormRules = (rules) =>
  (rules ?? []).map((r) => ({
    ...r,
    ...Object.fromEntries(DAYS.map((k) => [k, String(r[k] ?? 0)])),
    document_type_id: String(r.document_type_id ?? 0),
    _typed: Boolean(r._typed || Number(r.document_type_id)),
  }));
// GLOBAL SETTINGS > Expiry Rules (menu 197): per kind of date (customers'
// and companies' documents, module subscriptions, the licence, staff
// passwords) when to warn, when to remind, the grace after the date and what
// happens then. One document under maker-checker; Self applies at once.
export function ExpiryRules() {
  const { t } = useTranslation(["expiry", "loans"]);
  return (
    <SectionScreen
      api={expiryRulesApi}
      ns="expiry"
      valueKey="setup"
      framed={false}
      fallbackTitle={t("rulesTitle")}
      subtitle={t("rulesSubtitle")}
      bodyOf={(form) => ({ rules: toBody(form.rules) })}
      problemOf={(_, form) => rulesProblem(t, asFormRules(form.rules))}
      before={(data) => (
        <>
          {(data.counts?.EXPIRING > 0 || data.counts?.IN_GRACE > 0) && (
            <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
              {t("documentCounts", { expiring: data.counts.EXPIRING ?? 0, grace: data.counts.IN_GRACE ?? 0 })}
            </p>
          )}
          {!data.id && !data.pending && <p className="text-xs text-muted-foreground">{t("onDefaults")}</p>}
        </>
      )}
    >
      {({ data, shown, editing, setForm }) => {
        const rules = asFormRules(shown?.rules);
        const kinds = data.options?.kinds ?? [...new Set(rules.map((r) => r.kind))];
        // Replace one kind's rules (its general rule first, then per-type rules).
        const setKind = (kind, next) => setForm((f) => ({ ...f, rules: [...f.rules.filter((r) => r.kind !== kind), ...next] }));
        return (
          <div className="grid gap-4">
            {kinds.map((kind) => (
              <KindCard
                key={kind}
                kind={kind}
                rules={rules.filter((r) => r.kind === kind)}
                actions={data.options?.actions?.[kind] ?? []}
                documentTypes={data.document_types?.[kind] ?? []}
                // Only the System user sets the module grace; its action is fixed.
                disabled={!editing || (kind === "MODULE_SUBSCRIPTION" && !data.actions?.edit_module_grace)}
                onChange={(next) => setKind(kind, next)}
              />
            ))}
          </div>
        );
      }}
    </SectionScreen>
  );
}
// One kind: its general rule and, for documents, rules for single types.
function KindCard({ kind, rules, actions, documentTypes, disabled, onChange }) {
  const { t } = useTranslation("expiry");
  const general = rules.find((r) => !Number(r.document_type_id) && !r._typed) ?? {
    kind,
    document_type_id: "0",
    warn_days: "0",
    remind_days: "0",
    grace_days: "0",
    action: actions[0] ?? "NOTIFY",
    notify_party: false,
    notify_staff: true,
  };
  const typed = rules.filter((r) => r !== general);
  const isDocument = DOCUMENT_KINDS.includes(kind);
  const options = actions.map((x) => ({ value: x, label: t(`action_${x}`, { defaultValue: x }) }));
  const fields = [
    { key: "warn_days", label: t("warnDays"), type: "int" },
    { key: "remind_days", label: t("remindDays"), type: "int" },
    { key: "grace_days", label: t("graceDays"), type: "int" },
    {
      key: "action",
      label: t("action"),
      type: "select",
      options,
      disabledIf: () => actions.length < 2,
      span: "lg:col-span-2",
    },
    { key: "notify_party", label: t("notifyParty"), type: "bool" },
    { key: "notify_staff", label: t("notifyStaff"), type: "bool" },
  ];
  return (
    <Section title={t(`kind_${kind}`, { defaultValue: kind })}>
      <p className="mb-3 text-xs text-muted-foreground">
        {t(`kindHint_${kind}`, { defaultValue: "" })}
      </p>
      <div className="rounded-xl border border-border bg-card p-3">
        <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
          {isDocument ? t("everyDocument") : t("rule")}
        </p>
        <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
          {fields
            .filter((f) => isDocument || f.key !== "notify_party")
            .map((f) => (
              <label
                key={f.key}
                className={cn(
                  labelClass,
                  f.type === "bool" &&
                    "flex items-center justify-between gap-2 self-end rounded-xl border border-border px-3 py-2",
                  f.span,
                )}
              >
                {f.label}
                <Field
                  field={f}
                  value={general[f.key]}
                  disabled={disabled || f.disabledIf?.(general)}
                  onChange={(v) => onChange([{ ...general, [f.key]: v }, ...typed])}
                />
              </label>
            ))}
        </div>
        <ActionHelp action={general.action} />
      </div>
      {isDocument && (typed.length > 0 || !disabled) && (
        <div className="mt-3">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
            {t("perTypeRules")}
          </p>
          <RowsEditor
            rows={typed}
            disabled={disabled}
            onChange={(next) => onChange([general, ...next])}
            blank={() => ({ ...general, document_type_id: "", _typed: true })}
            addLabel={t("addTypeRule")}
            columns="lg:grid-cols-8"
            fields={[
              {
                key: "document_type_id",
                label: t("documentType"),
                type: "select",
                options: documentTypes.map((d) => ({ value: String(d.id), label: d.name })),
              },
              ...fields,
            ]}
            renderExtra={(row) => <ActionHelp action={row.action} />}
          />
        </div>
      )}
    </Section>
  );
}
const ActionHelp = ({ action }) => {
  const { t } = useTranslation("expiry");
  const text = t(`actionHelp_${action}`, { defaultValue: "" });
  return text ? <p className="mt-2 text-[11px] text-muted-foreground">{text}</p> : null;
};
