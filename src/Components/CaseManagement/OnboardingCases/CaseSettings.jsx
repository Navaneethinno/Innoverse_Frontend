import { PageTitle } from "@/Components/Common/PageTitle";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowLeft, Check, Clock, History, Send, X } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { Spinner } from "@/Components/Common/Spinner";
import { Switch } from "@/Components/UI/switch";
import { InstitutionField } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { useAuth } from "@/Hooks/useAuth";
import { usePagePermission } from "@/Hooks/usePermission";
import { caseSettingsApi } from "@/Services/CaseManagement/onboardingCases.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { caseDate } from "./caseShared";

const PARTS = [
  ["email_subject", 255, false],
  ["email_body", 8000, true],
  ["sms_body", 480, true],
];
const inputClass = "mt-1.5 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary";
const labelClass = "text-sm font-semibold text-slate-700";

// The templates as the edit call takes them: only the parts that have text,
// only the events that have any (an empty part uses the default).
const cleanTemplates = (templates) =>
  Object.fromEntries(
    Object.entries(templates ?? {})
      .map(([event, parts]) => [event, Object.fromEntries(Object.entries(parts ?? {}).filter(([, v]) => String(v ?? "").trim()))])
      .filter(([, parts]) => Object.keys(parts).length),
  );

const toForm = (s) => ({
  auto_approve_enabled: Boolean(s?.auto_approve_enabled),
  review_sla_hours: s?.review_sla_hours ?? 48,
  info_request_due_days: s?.info_request_due_days ?? 30,
  notify_customer: s?.notify_customer !== false,
  templates: s?.templates ?? {},
});

// Onboarding Cases settings (per institution, maker-checker): auto-approve,
// review deadline, default days to answer a request, customer messages and
// their wording. A change is proposed, then authorised by another user.
export function CaseSettings({ onBack }) {
  const { t } = useTranslation(["cases", "common"]);
  const can = usePagePermission();
  const me = useAuth((s) => s.user);
  const chooser = canChooseInstitution();
  // A service provider / System user picks the institution (its own first).
  const [institution, setInstitution] = useState(chooser ? (me?.inst_profile_id ?? "") : null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [event, setEvent] = useState(null);
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);

  const scope = useCallback((body = {}) => (chooser && institution ? { ...body, inst_profile_id: Number(institution) } : body), [chooser, institution]);
  const apply = (response) => {
    const d = rowsOf(response)[0] ?? null;
    setData(d);
    setForm(toForm(d?.settings));
    setEvent((e) => e ?? d?.events?.[0] ?? null);
  };

  const load = useCallback(async () => {
    if (chooser && !institution) return;
    try {
      apply(await caseSettingsApi.get(scope()));
    } catch (error) {
      notifications.error(error.message);
    }
  }, [chooser, institution, scope]);
  useEffect(() => {
    void load();
  }, [load]);

  const run = async (verb, body) => {
    setBusy(true);
    try {
      const response = await caseSettingsApi[verb](scope(body));
      apply(response);
      setNarration("");
      if (response?.message) notifications.success(response.message);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
    }
  };

  const pending = data?.pending;
  const editable = can("Edit") && !pending;
  const changed = form && data && JSON.stringify({ ...form, templates: cleanTemplates(form.templates) }) !== JSON.stringify({ ...toForm(data.settings), templates: cleanTemplates(data.settings?.templates) });

  const propose = () => {
    const now = toForm(data.settings);
    const body = { narration: narration.trim() };
    for (const key of ["auto_approve_enabled", "review_sla_hours", "info_request_due_days", "notify_customer"]) {
      const value = key.endsWith("hours") || key.endsWith("days") ? Number(form[key]) : form[key];
      if (value !== now[key]) body[key] = value;
    }
    const templates = cleanTemplates(form.templates);
    if (JSON.stringify(templates) !== JSON.stringify(cleanTemplates(now.templates))) body.templates = templates;
    void run("edit", body);
  };

  const setPart = (part, value) => setForm((f) => ({ ...f, templates: { ...f.templates, [event]: { ...(f.templates?.[event] ?? {}), [part]: value } } }));
  const ownPending = pending && String(pending.proposed_by?.id) === String(me?.id);

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={onBack} className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={15} /> {t("backToQueue")}
      </button>
      <PageTitle>{t("settingsTitle")}</PageTitle>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{t("settingsSubtitle")}</p>

      {chooser && (
        <div className="mb-4 max-w-sm">
          <InstitutionField value={institution} onChange={setInstitution} />
        </div>
      )}
      {chooser && !institution ? null : !form ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground"><Spinner size={14} /> {t("loading")}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid content-start gap-4">
            {pending && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50/70 p-4">
                <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                  <Clock size={15} /> {t("settingsPending", { name: pending.proposed_by?.name ?? "—", date: caseDate(pending.proposed_at) })}
                </p>
                <SettingsDiff from={data.settings} to={pending.settings} />
                {can("Authorize") && !ownPending && (
                  <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto_auto] sm:items-end">
                    <input value={narration} onChange={(e) => setNarration(e.target.value)} placeholder={t("narration")} className={inputClass} />
                    <Button variant="secondary" size="sm" icon={X} disabled={!narration.trim()} loading={busy} onClick={() => void run("deauth", { narration: narration.trim() })}>{t("rejectChange")}</Button>
                    <Button size="sm" icon={Check} disabled={!narration.trim()} loading={busy} onClick={() => void run("auth", { narration: narration.trim() })}>{t("authoriseChange")}</Button>
                  </div>
                )}
                {ownPending && <p className="mt-2 text-xs text-amber-800">{t("ownChangePending")}</p>}
              </div>
            )}

            <div className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:grid-cols-2">
              <Toggle label={t("autoApprove")} hint={t("autoApproveHint")} checked={form.auto_approve_enabled} disabled={!editable} onChange={(v) => setForm({ ...form, auto_approve_enabled: v })} />
              <Toggle label={t("notifyCustomer")} hint={t("notifyCustomerHint")} checked={form.notify_customer} disabled={!editable} onChange={(v) => setForm({ ...form, notify_customer: v })} />
              <label className={labelClass}>
                {t("reviewSlaHours")}
                <input type="number" min={1} max={8760} disabled={!editable} value={form.review_sla_hours} onChange={(e) => setForm({ ...form, review_sla_hours: e.target.value })} className={inputClass} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("reviewSlaHint")}</span>
              </label>
              <label className={labelClass}>
                {t("infoRequestDueDays")}
                <input type="number" min={1} max={365} disabled={!editable} value={form.info_request_due_days} onChange={(e) => setForm({ ...form, info_request_due_days: e.target.value })} className={inputClass} />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("infoRequestDueHint")}</span>
              </label>
            </div>

            <div className="rounded-2xl border border-border bg-card p-4">
              <p className="text-sm font-bold">{t("messageTemplates")}</p>
              <p className="mb-3 text-xs text-muted-foreground">{t("messageTemplatesHint")}</p>
              <div className="mb-3 flex gap-1 overflow-x-auto border-b border-border">
                {(data.events ?? []).map((e) => (
                  <button key={e} type="button" onClick={() => setEvent(e)} className={cn("shrink-0 border-b-2 px-3 py-2 text-xs font-bold", event === e ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground")}>
                    {t(`messageEvent_${e}`, { defaultValue: e })}
                    {Object.keys(cleanTemplates(form.templates)[e] ?? {}).length > 0 && <span className="ml-1 text-primary">•</span>}
                  </button>
                ))}
              </div>
              {event &&
                PARTS.map(([part, max, multiline]) => {
                  const value = form.templates?.[event]?.[part] ?? "";
                  const fallback = data.default_templates?.[event]?.[part] ?? "";
                  const Field = multiline ? "textarea" : "input";
                  return (
                    <label key={part} className={`${labelClass} mb-3 block`}>
                      {t(`part_${part}`)}
                      <Field value={value} maxLength={max} disabled={!editable} onChange={(e) => setPart(part, e.target.value)} placeholder={fallback} className={cn(inputClass, multiline && (part === "email_body" ? "min-h-32" : "min-h-16"))} />
                      <span className="mt-1 flex justify-between text-[11px] font-normal text-muted-foreground">
                        <span>{value.trim() ? t("customWording") : t("usesDefault")}</span>
                        <span>{value.length}/{max}</span>
                      </span>
                    </label>
                  );
                })}
              <p className="text-[11px] text-muted-foreground">
                {t("placeholders")}: {(data.placeholders ?? []).map((p) => <code key={p} className="mr-1.5 rounded bg-muted px-1 py-0.5 font-mono text-[10px]">{p}</code>)}
              </p>
            </div>

            {can("Edit") && !pending && (
              <div className="grid gap-2 rounded-2xl border border-border bg-card p-4 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className={labelClass}>
                  {t("narration")}
                  <input value={narration} onChange={(e) => setNarration(e.target.value)} className={inputClass} placeholder={t("narrationPlaceholder")} />
                </label>
                <Button icon={Send} disabled={!changed} loading={busy} onClick={propose}>{t("proposeChange")}</Button>
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-4 lg:self-start">
            <p className="mb-3 flex items-center gap-2 text-sm font-bold"><History size={14} /> {t("settingsHistory")}</p>
            {data.history?.length ? (
              <ol className="grid gap-3">
                {data.history.map((h, i) => (
                  <li key={i} className="border-l-2 border-[var(--primary-light)] pl-3">
                    <p className="text-xs font-bold">{t(`historyAction_${h.action}`, { defaultValue: h.action })}</p>
                    <p className="text-[11px] text-muted-foreground">{h.actor ?? "—"} · {caseDate(h.at)}</p>
                    {h.narration && <p className="mt-0.5 text-xs">{h.narration}</p>}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted-foreground">{t("noSettingsHistory")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Toggle({ label, hint, checked, disabled, onChange }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

// What a pending change would change.
function SettingsDiff({ from, to }) {
  const { t } = useTranslation("cases");
  const rows = ["auto_approve_enabled", "review_sla_hours", "info_request_due_days", "notify_customer"].filter((k) => to && String(from?.[k]) !== String(to[k]));
  const templatesChanged = to && JSON.stringify(cleanTemplates(from?.templates)) !== JSON.stringify(cleanTemplates(to.templates));
  const show = (v) => (typeof v === "boolean" ? t(v ? "on" : "off") : String(v));
  return (
    <ul className="mt-2 grid gap-1 text-xs text-amber-900">
      {rows.map((k) => (
        <li key={k}>
          <span className="font-semibold">{t(`setting_${k}`)}:</span> {show(from?.[k])} → <span className="font-bold">{show(to[k])}</span>
        </li>
      ))}
      {templatesChanged && <li className="font-semibold">{t("templatesChanged")}</li>}
      {!rows.length && !templatesChanged && <li>{t("noSettingChanges")}</li>}
    </ul>
  );
}
