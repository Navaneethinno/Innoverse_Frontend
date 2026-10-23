import { useCallback, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertCircle, ArrowLeft, ArrowRight, Check, ClipboardCheck, Pencil, Save, Send } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PageTitle } from "@/Components/Common/PageTitle";
import { inputClass, labelClass } from "@/Components/Finance/Deposits/depositShared";
import { institutionsApi } from "@/Services/Institution/institutions.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { SECTION_ICONS, SectionFacts, SectionForm, bodyOf, defaultsOf, problemsOf, useProfileOptions } from "./profileShared";

const REVIEW = "review";

// Create an institution (or continue a draft: ?draft=<id>), one section of
// profile/options per step, then Review & submit. Continue checks the step
// with profile/validate; Save as draft keeps what is there (only Identity
// is checked for a draft).
export function InstitutionWizard() {
  const { t } = useTranslation(["institutions", "common"]);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const sections = useProfileOptions();
  const [draftId, setDraftId] = useState(params.get("draft") ? Number(params.get("draft")) : null);
  const [values, setValues] = useState(null);
  const [record, setRecord] = useState(null);
  const [step, setStep] = useState(0);
  const [passed, setPassed] = useState(() => new Set());
  const [errors, setErrors] = useState({});
  const [badSections, setBadSections] = useState(() => new Set());
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);

  // A draft's saved values (and updated_time, sent back on edit).
  const load = useCallback(async (id) => {
    const row = rowsOf(await institutionsApi.get({ id }))[0];
    setRecord(row);
    return row?.profile ?? {};
  }, []);

  useEffect(() => {
    if (!sections) return;
    if (!draftId) {
      setValues((v) => v ?? defaultsOf(sections));
      return;
    }
    load(draftId)
      .then((profile) => setValues((v) => v ?? { ...defaultsOf(sections), ...bodyOf(sections, profile) }))
      .catch((e) => notifications.error(e.message));
  }, [sections, draftId, load]);

  if (!sections || !values) return <PageSkeleton />;

  const steps = [...sections.map((s) => s.key), REVIEW];
  const current = steps[step];
  const section = sections.find((s) => s.key === current);
  const body = () => bodyOf(sections, values);

  const showProblems = (problems) => {
    const { byField, sections: bad } = problemsOf(problems);
    setErrors(byField);
    setBadSections(bad);
    return bad;
  };

  const goTo = (i) => {
    setErrors({});
    setStep(i);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Continue: this step checked on its own.
  const next = async () => {
    setBusy(true);
    try {
      const reply = rowsOf(await institutionsApi.validate({ ...body(), section: current, ...(draftId ? { id: draftId } : {}) }))[0];
      if (!reply?.valid) {
        showProblems(reply?.problems);
        return;
      }
      setBadSections((s) => new Set([...s].filter((k) => k !== current)));
      setPassed((s) => new Set(s).add(current));
      goTo(step + 1);
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  const save = async (isDraft) => {
    const payload = { ...body(), ...(narration.trim() ? { narration: narration.trim() } : {}) };
    if (draftId) {
      await institutionsApi.edit({ id: draftId, ...payload, is_draft: isDraft, expected_updated_time: record?.profile?.updated_time });
      return draftId;
    }
    const reply = await institutionsApi.add({ ...payload, is_draft: isDraft });
    return rowsOf(reply)[0]?.id ?? null;
  };

  const fail = (e) => {
    const bad = showProblems(e.fieldProblems);
    const first = steps.findIndex((k) => bad.has(k));
    if (first >= 0) goTo(first);
    if (e.status === 409) {
      notifications.error(t("institutions:changedElsewhere"));
      if (draftId) load(draftId).catch(() => {});
    } else notifications.error(e.message);
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      const id = await save(true);
      if (id) {
        setDraftId(id);
        await load(id);
      }
      notifications.success(t("institutions:draftSaved"));
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  // Review & submit: the whole form checked first; the first section with
  // a problem opens.
  const submit = async () => {
    setBusy(true);
    try {
      const reply = rowsOf(await institutionsApi.validate({ ...body(), ...(draftId ? { id: draftId } : {}) }))[0];
      if (!reply?.valid) {
        const bad = showProblems(reply?.problems);
        const first = steps.findIndex((k) => bad.has(k));
        goTo(first >= 0 ? first : 0);
        return;
      }
      const id = draftId ? await save(true) : await save(false);
      if (draftId) await institutionsApi.submit({ id });
      navigate(`/institutions/${id}?sent=1`);
    } catch (e) {
      fail(e);
    } finally {
      setBusy(false);
    }
  };

  const titleOf = (key) => (key === REVIEW ? t("institutions:reviewSubmit") : sections.find((s) => s.key === key)?.title);
  const filled = sections.filter((s) => s.fields.some((f) => values[f.key] != null && values[f.key] !== "" && !(Array.isArray(values[f.key]) && !values[f.key].length)));

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={() => navigate("/institution/profile")} className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={13} /> {t("institutions:backToList")}
      </button>
      <PageTitle>{draftId ? t("institutions:continueSetup") : t("institutions:newInstitution")}</PageTitle>
      <p className="mb-5 mt-1 text-sm text-muted-foreground">{t("institutions:wizardSubtitle")}</p>

      {/* Phone width: "Step 2 of 7" and a dropdown instead of the stepper. */}
      <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
        <p className="text-xs font-bold text-muted-foreground">{t("institutions:stepOf", { step: step + 1, total: steps.length })}</p>
        <FilterSelect className="w-56" value={current} onChange={(k) => (steps.indexOf(k) <= step || passed.has(k) ? goTo(steps.indexOf(k)) : null)} options={steps.map((k) => ({ value: k, label: titleOf(k) }))} />
      </div>

      <div className="grid gap-5 lg:grid-cols-[13rem_minmax(0,1fr)] xl:grid-cols-[13rem_minmax(0,1fr)_16rem]">
        <ol className="hidden h-fit gap-1 lg:grid">
          {steps.map((k, i) => {
            const Icon = k === REVIEW ? ClipboardCheck : SECTION_ICONS[sections.find((s) => s.key === k)?.icon] ?? ClipboardCheck;
            const reachable = i <= step || passed.has(k);
            const state = badSections.has(k) ? "error" : i === step ? "current" : passed.has(k) ? "done" : "todo";
            return (
              <li key={k}>
                <button
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(i)}
                  className={cn(
                    "flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm font-semibold transition-colors disabled:cursor-default",
                    state === "current" && "bg-[var(--primary-light)] text-primary",
                    state === "done" && "text-foreground hover:bg-muted",
                    state === "error" && "text-red-700 hover:bg-red-50",
                    state === "todo" && "text-muted-foreground",
                  )}
                >
                  <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px]", state === "done" && "border-emerald-500 bg-emerald-500 text-white", state === "error" && "border-red-500 text-red-600", state === "current" && "border-primary text-primary", state === "todo" && "border-border")}>
                    {state === "done" ? <Check size={13} /> : state === "error" ? <AlertCircle size={13} /> : <Icon size={12} />}
                  </span>
                  {titleOf(k)}
                </button>
              </li>
            );
          })}
        </ol>

        <div className="h-fit min-w-0 rounded-2xl border border-border bg-card p-5">
          {section ? (
            <>
              <h2 className="text-lg font-black text-foreground">{section.title}</h2>
              {section.description && <p className="mb-4 mt-1 text-sm text-muted-foreground">{section.description}</p>}
              <SectionForm section={section} values={values} setValues={setValues} errors={errors} phoneCodes={record?.profile?.phone_codes ?? []} />
            </>
          ) : (
            <>
              <h2 className="mb-4 text-lg font-black text-foreground">{t("institutions:reviewSubmit")}</h2>
              <div className="grid gap-3">
                {sections.map((s, i) => (
                  <div key={s.key} className={cn("rounded-xl border p-4", badSections.has(s.key) ? "border-red-300" : "border-border")}>
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <p className="text-sm font-bold">{s.title}</p>
                      <button type="button" onClick={() => goTo(i)} className="flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                        <Pencil size={12} /> {t("common:edit")}
                      </button>
                    </div>
                    <SectionFacts section={s} values={values} />
                  </div>
                ))}
                <label className={labelClass}>
                  {t("institutions:narrationOptional")}
                  <textarea className={cn(inputClass, "mt-1.5 min-h-20")} maxLength={500} value={narration} onChange={(e) => setNarration(e.target.value)} />
                </label>
              </div>
            </>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
            <Button variant="ghost" icon={ArrowLeft} disabled={step === 0 || busy} onClick={() => goTo(step - 1)}>
              {t("common:back")}
            </Button>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" icon={Save} loading={busy} onClick={() => void saveDraft()}>
                {t("institutions:saveAsDraft")}
              </Button>
              {current === REVIEW ? (
                <Button icon={Send} loading={busy} onClick={() => void submit()}>
                  {t("institutions:submitForApproval")}
                </Button>
              ) : (
                <Button icon={ArrowRight} loading={busy} onClick={() => void next()}>
                  {t("institutions:continue")}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* What has been filled so far; nothing for a value not yet chosen. */}
        <aside className="hidden h-fit rounded-2xl border border-border bg-card p-4 xl:block">
          <p className="mb-3 text-xs font-black uppercase tracking-wider text-muted-foreground">{t("institutions:summary")}</p>
          <div className="grid gap-4">
            {filled.map((s) => (
              <div key={s.key}>
                <p className="mb-1 text-xs font-bold text-foreground">{s.title}</p>
                <SectionFacts section={s} values={values} compact />
              </div>
            ))}
            {!filled.length && <p className="text-xs text-muted-foreground">{t("institutions:nothingChosen")}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
