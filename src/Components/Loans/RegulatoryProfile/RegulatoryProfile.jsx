import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, Pencil, Scale, Send, XCircle } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { Toggle } from "@/Components/Common/Toggle";
import { InstitutionField } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { accountDate } from "@/Components/Epurse/Accounts/accountShared";
import { usePagePermission } from "@/Hooks/usePermission";
import { recordOf, regulatoryProfileApi } from "@/Services/Loans/loans.api";
import { useMasterCurrencies } from "@/Hooks/Institution/institutionCurrencyHooks";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { ActionButtons, Facts, NarrationDialog, Problems, Section, dayDate, labelClass, ratePct } from "../../TermDeposits/depositShared";
import { Field, MiniTable, RowsEditor, loanLabel, useInstitutionScope } from "../loanShared";

const BOOLS = ["regulatory_reporting_enabled", "credit_bureau_check_required", "standing_instruction_recovery_enabled"];

// The profile as the server takes it: amounts and percents as strings,
// days and ids as numbers, the classification as a whole table.
const toBody = (p) => ({
  country_id: p.country_id ? Number(p.country_id) : null,
  license_category: p.license_category,
  policy_version: String(p.policy_version ?? "").trim(),
  effective_from: p.effective_from,
  regulatory_reporting_enabled: Boolean(p.regulatory_reporting_enabled),
  reporting_threshold: String(p.reporting_threshold ?? "0") || "0",
  reporting_currency_code: p.reporting_currency_code ? Number(p.reporting_currency_code) : null,
  reporting_frequency: p.reporting_frequency,
  credit_bureau_check_required: Boolean(p.credit_bureau_check_required),
  standing_instruction_recovery_enabled: Boolean(p.standing_instruction_recovery_enabled),
  consumer_disclosure_template_code: String(p.consumer_disclosure_template_code ?? "").trim(),
  classification: (p.classification ?? []).map((c) => ({ risk_class: c.risk_class, minimum_days_past_due: Number(c.minimum_days_past_due) || 0, provision_percent: String(c.provision_percent ?? "0") || "0" })),
});

// The classification table's own rules, checked before saving: starts at 0
// days, days rise, provisions never fall (0-100), each class once.
function classificationProblem(t, rows) {
  if (!rows?.length) return t("classNeedsRows");
  if (Number(rows[0].minimum_days_past_due) !== 0) return t("classStartsAtZero");
  if (new Set(rows.map((r) => r.risk_class)).size !== rows.length) return t("classOnce");
  for (let i = 1; i < rows.length; i++) {
    if (Number(rows[i].minimum_days_past_due) <= Number(rows[i - 1].minimum_days_past_due)) return t("classDaysRise");
    if (Number(rows[i].provision_percent) < Number(rows[i - 1].provision_percent)) return t("classProvisionNeverFalls");
  }
  if (rows.some((r) => Number(r.provision_percent) > 100)) return t("classProvisionMax");
  return "";
}

// LOANS > Lending Regulatory Profile (menu 185): the institution's lending
// settings, one form with the risk classification table. A change waits
// for a checker; the history keeps every version.
export function RegulatoryProfile() {
  const { t } = useTranslation(["loans", "common"]);
  const can = usePagePermission();
  const { chooser, institution, setInstitution, scope } = useInstitutionScope();
  const { currencies: masterCurrencies } = useMasterCurrencies();
  const currencies = masterCurrencies.map((c) => ({ value: String(c.id ?? c.currency_id), label: [c.alpha_code ?? c.currency_code, c.name ?? c.currency_name].filter(Boolean).join(" · ") }));
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState("");
  const [dialog, setDialog] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (chooser && !institution) return;
    try {
      setData(recordOf(await regulatoryProfileApi.get(scope())));
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
      const response = await regulatoryProfileApi[verb](scope(body));
      if (response?.message) notifications.success(response.message);
      setDialog(null);
      setForm(null);
      setData(recordOf(response) ?? data);
      await load();
    } catch (e) {
      if (verb === "edit") setError(e.message);
      else notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const a = data?.actions ?? {};
  const options = data?.options ?? {};
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const classProblem = form ? classificationProblem(t, form.classification) : "";

  return (
    <div className="pb-8 pt-4">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Scale size={22} className="text-primary" /> {t("profileTitle")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("profileSubtitle")}</p>
        </div>
        {data && !form && (
          <ActionButtons
            busy={busy}
            buttons={[
              a.edit && can("Edit") && { key: "edit", label: t("edit"), icon: Pencil, run: () => setForm(structuredClone(data.pending?.profile ?? data.profile ?? { classification: [] })) },
              a.deauth && can("Authorize") && { key: "deauth", label: t("reject"), icon: XCircle, variant: "danger", run: () => setDialog("deauth") },
              a.auth && can("Authorize") && { key: "auth", label: t("approve"), icon: CheckCircle2, variant: "primary", run: () => setDialog("auth") },
            ]}
          />
        )}
      </div>

      {chooser && (
        <div className="mb-4 max-w-sm">
          <InstitutionField value={institution} onChange={setInstitution} />
        </div>
      )}

      {chooser && !institution ? null : !data ? (
        <PageSkeleton />
      ) : form ? (
        <div className="grid gap-4">
          <Section title={t("licenceAndPolicy")}>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className={labelClass}>
                {t("licenseCategory")}
                <Field field={{ type: "select", options: options.license_categories ?? [] }} value={form.license_category} onChange={set("license_category")} />
              </label>
              <label className={labelClass}>
                {t("policyVersion")}
                <Field field={{ placeholder: "2026.1" }} value={form.policy_version} onChange={set("policy_version")} />
              </label>
              <label className={labelClass}>
                {t("effectiveFrom")}
                <Field field={{ type: "date" }} value={form.effective_from} onChange={set("effective_from")} />
              </label>
              <label className={labelClass}>
                {t("disclosureTemplate")}
                <Field field={{ placeholder: "LOAN_DISCLOSURE_V1" }} value={form.consumer_disclosure_template_code} onChange={(v) => set("consumer_disclosure_template_code")(v.toUpperCase().replace(/[^A-Z0-9_]/g, ""))} />
              </label>
            </div>
          </Section>
          <Section title={t("reportingAndChecks")}>
            <div className="grid gap-3 md:grid-cols-3">
              {BOOLS.map((key) => (
                <Toggle key={key} showLabel label={t(key)} checked={form[key]} onChange={set(key)} />
              ))}
            </div>
            {form.regulatory_reporting_enabled && (
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className={labelClass}>
                  {t("reportingCurrency")}
                  <Field field={{ type: "select", blank: t("chooseCurrency"), options: currencies }} value={form.reporting_currency_code ? String(form.reporting_currency_code) : ""} onChange={set("reporting_currency_code")} />
                </label>
                <label className={labelClass}>
                  {t("reportingThreshold")}
                  <Field field={{ type: "amount" }} value={form.reporting_threshold} onChange={set("reporting_threshold")} />
                  <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("reportingThresholdHint")}</span>
                </label>
                <label className={labelClass}>
                  {t("reportingFrequency")}
                  <Field field={{ type: "select", options: options.reporting_frequencies ?? [] }} value={form.reporting_frequency} onChange={set("reporting_frequency")} />
                </label>
              </div>
            )}
          </Section>
          <Section title={t("classificationTitle")}>
            <p className="mb-3 text-xs text-muted-foreground">{t("classificationHint")}</p>
            <RowsEditor
              rows={form.classification ?? []}
              onChange={set("classification")}
              blank={() => ({ risk_class: "", minimum_days_past_due: "", provision_percent: "" })}
              addLabel={t("addClass")}
              columns="lg:grid-cols-3"
              fields={[
                { key: "risk_class", label: t("riskClass"), type: "select", blank: t("choose"), options: options.risk_classes ?? [] },
                { key: "minimum_days_past_due", label: t("fromDaysPastDue"), type: "int" },
                { key: "provision_percent", label: t("provisionPct"), type: "rate" },
              ]}
            />
            {classProblem && <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900">{classProblem}</p>}
          </Section>
          {error && <Problems message={error} />}
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t("cancel")}
            </Button>
            <Button icon={Send} disabled={Boolean(classProblem)} onClick={() => setDialog("edit")}>
              {t("proposeChanges")}
            </Button>
          </div>
        </div>
      ) : data.missing ? null : (
        <div className="grid gap-4">
          {data.pending ? (
            <div className="grid gap-4 xl:grid-cols-2">
              <Section title={t("inEffect")}>
                <ProfileSummary profile={data.profile} />
              </Section>
              <Section title={t("proposedBy", { name: data.pending.proposed_by?.name ?? data.pending.proposed_by ?? "—", date: accountDate(data.pending.proposed_at) })} className="border-amber-300 ring-1 ring-amber-200">
                <ProfileSummary profile={data.pending.profile} other={data.profile} />
              </Section>
            </div>
          ) : (
            <Section title={t("inEffect")}>
              <ProfileSummary profile={data.profile} />
            </Section>
          )}
          <Section title={t("history")}>
            <ol className="relative grid gap-3 border-l border-border pl-4">
              {(data.history ?? []).map((h, i) => (
                <li key={`${h.at}-${i}`} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary ring-4 ring-[var(--primary-light)]" />
                  <p className="text-xs font-bold text-foreground">
                    {loanLabel(t, h.action)} <span className="font-medium text-muted-foreground">· {h.profile?.policy_version}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {h.actor} · {accountDate(h.at)}
                  </p>
                  {h.narration?.trim() && <p className="mt-0.5 text-xs italic">“{h.narration}”</p>}
                </li>
              ))}
              {!data.history?.length && <li className="text-sm text-muted-foreground">{t("nothingYet")}</li>}
            </ol>
          </Section>
        </div>
      )}

      {dialog && (
        <NarrationDialog
          title={t(`profileConfirm_${dialog}`)}
          hint={t(`profileConfirmHint_${dialog}`)}
          confirmLabel={t(dialog === "auth" ? "approve" : dialog === "deauth" ? "reject" : "proposeChanges")}
          variant={dialog === "deauth" ? "danger" : "primary"}
          required={dialog === "deauth"}
          busy={busy}
          onClose={() => setDialog(null)}
          onSave={(narration) => act(dialog, { ...(dialog === "edit" ? toBody(form) : {}), ...(narration ? { narration } : {}) })}
        />
      )}
    </div>
  );
}

// The profile as tiles plus the classification; with `other`, what changed
// is marked.
function ProfileSummary({ profile, other }) {
  const { t } = useTranslation("loans");
  if (!profile) return <p className="text-sm text-muted-foreground">{t("noProfileYet")}</p>;
  const yes = (v) => t(v ? "yes" : "no");
  const rows = (p) => [
    [t("licenseCategory"), loanLabel(t, p.license_category)],
    [t("policyVersion"), p.policy_version || "—"],
    [t("effectiveFrom"), dayDate(p.effective_from)],
    [t("disclosureTemplate"), p.consumer_disclosure_template_code || "—"],
    [t("regulatory_reporting_enabled"), yes(p.regulatory_reporting_enabled)],
    [t("reportingCurrency"), p.reporting_currency_code_name ?? p.reporting_currency_code ?? "—"],
    [t("reportingThreshold"), p.reporting_threshold ?? "—"],
    [t("reportingFrequency"), loanLabel(t, p.reporting_frequency)],
    [t("credit_bureau_check_required"), yes(p.credit_bureau_check_required)],
    [t("standing_instruction_recovery_enabled"), yes(p.standing_instruction_recovery_enabled)],
  ];
  const before = other ? Object.fromEntries(rows(other)) : null;
  return (
    <div className="grid gap-3">
      <Facts rows={rows(profile).map(([k, v]) => [k, v, before && String(before[k]) !== String(v) ? "text-amber-700" : undefined])} />
      <MiniTable
        rows={profile.classification}
        rowKey={(r) => r.risk_class}
        columns={[
          { key: "risk_class", label: t("riskClass"), render: (r) => <b>{loanLabel(t, r.risk_class)}</b> },
          { key: "minimum_days_past_due", label: t("fromDaysPastDue"), align: "right" },
          { key: "provision_percent", label: t("provisionPct"), align: "right", render: (r) => <span className={cn(Number(r.provision_percent) >= 50 && "font-bold text-red-700")}>{ratePct(r.provision_percent)}</span> },
        ]}
      />
    </div>
  );
}

