import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarClock, CheckCircle2, Pencil, Send, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { Toggle } from "@/Components/Common/Toggle";
import { accountDate } from "@/Components/Finance/Accounts/accountShared";
import {
  ActionButtons,
  AuditTimeline,
  NarrationDialog,
  Problems,
  Section,
  labelClass,
} from "@/Components/Finance/Deposits/depositShared";
import { Field, RowsEditor, useInstitutionScope } from "@/Components/Finance/Loans/loanShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { expiryRulesApi } from "@/Services/Expiry/expiry.api";
import { recordOf } from "@/Services/Loans/loans.api";
import { notifications } from "@/Utils/Lib/notifications";
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

// GLOBAL SETTINGS > Expiry Rules (menu 197): per kind of date (customers'
// and companies' documents, module subscriptions, the licence, staff
// passwords) when to warn, when to remind, the grace after the date and what
// happens then. One document under maker-checker; Self applies at once.
export function ExpiryRules() {
  const { t } = useTranslation(["expiry", "loans"]);
  const can = usePagePermission();
  const { chooser, institution, scope } = useInstitutionScope();
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [showPending, setShowPending] = useState(true);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (chooser && !institution) return;
    try {
      setData(recordOf(await expiryRulesApi.get(scope())));
    } catch (e) {
      setData({ missing: true });
      notifications.error(e.message);
    }
  }, [chooser, institution, scope]);
  useEffect(() => {
    setData(null);
    setForm(null);
    void load();
  }, [load]);

  const act = async (verb, body = {}) => {
    setBusy(true);
    setError("");
    try {
      const response = await expiryRulesApi[verb](scope(body));
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      setForm(null);
      await load();
    } catch (e) {
      setDialog(null);
      if (verb === "edit") setError(e.message);
      else notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const a = data?.actions ?? {};
  const pending = data?.pending?.setup ?? null;
  const shown = form ?? (pending && showPending ? pending : data?.setup);
  const rules = (shown?.rules ?? []).map((r) => ({
    ...r,
    ...Object.fromEntries(DAYS.map((k) => [k, String(r[k] ?? 0)])),
    document_type_id: String(r.document_type_id ?? 0),
    _typed: Boolean(r._typed || Number(r.document_type_id)),
  }));
  const problem = form ? rulesProblem(t, rules) : "";
  const editing = Boolean(form);
  const kinds = data?.options?.kinds ?? [...new Set(rules.map((r) => r.kind))];
  // Replace one kind's rules (its general rule first, then per-type rules).
  const setKind = (kind, next) =>
    setForm((f) => ({ ...f, rules: [...f.rules.filter((r) => r.kind !== kind), ...next] }));
  const counts = data?.counts ?? {};

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle icon={CalendarClock}>{t("rulesTitle")}</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">{t("rulesSubtitle")}</p>
        </div>
        {data && !data.missing && !form && (
          <ActionButtons
            busy={busy}
            buttons={[
              a.edit &&
                can("Edit") && {
                  key: "edit",
                  label: t("loans:edit"),
                  icon: Pencil,
                  run: () => {
                    setForm(structuredClone(pending ?? data.setup));
                    setError("");
                  },
                },
              a.deauth &&
                can("Authorize") && {
                  key: "deauth",
                  label: t("loans:reject"),
                  icon: XCircle,
                  variant: "danger",
                  run: () => setDialog("deauth"),
                },
              a.auth &&
                can("Authorize") && {
                  key: "auth",
                  label: t("loans:approve"),
                  icon: CheckCircle2,
                  variant: "primary",
                  run: () => setDialog("auth"),
                },
            ]}
          />
        )}
      </div>

      {chooser && !institution ? null : !data ? (
        <PageSkeleton />
      ) : data.missing ? null : (
        <div className="grid gap-4">
          {(counts.EXPIRING > 0 || counts.IN_GRACE > 0) && (
            <p className="rounded-xl bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
              {t("documentCounts", { expiring: counts.EXPIRING ?? 0, grace: counts.IN_GRACE ?? 0 })}
            </p>
          )}
          {!data.id && !pending && (
            <p className="text-xs text-muted-foreground">{t("onDefaults")}</p>
          )}
          {pending && !form && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm text-amber-900">
              <span>
                {t("pendingBy", {
                  name: data.pending.proposed_by?.name ?? data.pending.proposed_by ?? "—",
                  date: accountDate(data.pending.proposed_at),
                })}
              </span>
              <Toggle
                showLabel
                label={t("showProposed")}
                checked={showPending}
                onChange={setShowPending}
              />
            </div>
          )}

          {kinds.map((kind) => (
            <KindCard
              key={kind}
              kind={kind}
              rules={rules.filter((r) => r.kind === kind)}
              actions={data.options?.actions?.[kind] ?? []}
              documentTypes={data.document_types?.[kind] ?? []}
              // Only the System user sets the module grace; its action is fixed.
              disabled={!editing || (kind === "MODULE_SUBSCRIPTION" && !a.edit_module_grace)}
              onChange={(next) => setKind(kind, next)}
            />
          ))}

          {form ? (
            <>
              {problem && (
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">
                  {problem}
                </p>
              )}
              {error && <Problems message={error} />}
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" onClick={() => setForm(null)}>
                  {t("loans:cancel")}
                </Button>
                <Button icon={Send} disabled={Boolean(problem)} onClick={() => setDialog("edit")}>
                  {t("loans:proposeChanges")}
                </Button>
              </div>
            </>
          ) : (
            <Section title={t("loans:history")}>
              <AuditTimeline audit={data.history ?? []} />
            </Section>
          )}
        </div>
      )}

      {dialog && (
        <NarrationDialog
          title={t(`confirm_${dialog}`)}
          hint={t(`confirmHint_${dialog}`)}
          confirmLabel={t(
            dialog === "auth"
              ? "loans:approve"
              : dialog === "deauth"
                ? "loans:reject"
                : "loans:proposeChanges",
          )}
          variant={dialog === "deauth" ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) =>
            act(dialog, {
              ...(dialog === "edit" ? { rules: toBody(form.rules) } : {}),
              ...(narration ? { narration } : {}),
            })
          }
        />
      )}
    </div>
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
