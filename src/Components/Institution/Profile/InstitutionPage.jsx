import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowLeft, CheckCircle2, Clock3, Pencil, Save, Send, X } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { PageSkeleton } from "@/Components/Common/PageSkeleton";
import { PendingChangesDiff, usePendingChanges } from "@/Components/Common/PendingChangesDiff";
import { RowActions } from "@/Components/Common/RowActions";
import { AuditTimeline, inputClass, labelClass } from "@/Components/Finance/Deposits/depositShared";
import { Tabs } from "@/Components/Finance/Loans/loanShared";
import { StatusBadge } from "@/Components/MakerChecker/StatusBadge";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { institutionsApi } from "@/Services/Institution/institutions.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { INSTITUTION_DRAFT_STATUS_CODE } from "@/Utils/Constant";
import { setInstitutionFilter } from "@/Utils/Lib/institutionFilter";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { SECTION_ICONS, SectionFacts, SectionForm, SetupChecklist, bodyOf, problemsOf, useProfileOptions } from "./profileShared";
import { useInstitutionActions } from "./useInstitutionActions";

// One institution (profile/get): header with its actions, a banner while a
// change waits for approval, then Setup, Profile and History. Edit turns
// the Profile tab into the same section cards, editable.
export function InstitutionPage() {
  const { t } = useTranslation(["institutions", "common"]);
  const { id } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const chooser = useCanChooseInstitution();
  const sections = useProfileOptions();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState(null);
  const [editing, setEditing] = useState(params.get("edit") === "1");
  const [values, setValues] = useState(null);
  const [errors, setErrors] = useState({});
  const [badSections, setBadSections] = useState(() => new Set());
  const [narration, setNarration] = useState("");
  const [busy, setBusy] = useState(false);
  const [audit, setAudit] = useState(null);

  const load = useCallback(async () => {
    try {
      const row = rowsOf(await institutionsApi.get({ id: Number(id) }))[0];
      setData(row ?? null);
      return row;
    } catch (e) {
      notifications.error(e.message);
      return null;
    }
  }, [id]);
  const actions = useInstitutionActions(() => void load());

  useEffect(() => {
    void load();
  }, [load]);
  // Setup opens first until the institution is ready.
  useEffect(() => {
    if (data && !tab) setTab(data.setup && !data.setup.ready ? "setup" : "profile");
  }, [data, tab]);
  useEffect(() => {
    if (tab !== "history" || audit) return;
    institutionsApi
      .audit({ id: Number(id), page: 1, limit: 100 })
      .then((r) => setAudit(rowsOf(r).map((e) => ({ action: e.process_status_name ?? e.status_name, process_status_name: e.auth_status, actor: e.updated_by ?? e.created_by, at: e.updated_time ?? e.created_time, narration: e.narration }))))
      .catch((e) => {
        notifications.error(e.message);
        setAudit([]);
      });
  }, [tab, audit, id]);

  // Opened with ?edit=1 (the list's Edit): the form starts filled.
  useEffect(() => {
    if (editing && !values && sections && data) {
      setValues(bodyOf(sections, data.profile ?? {}));
      setTab("profile");
    }
  }, [editing, values, sections, data]);

  const pendingChanges = usePendingChanges(institutionsApi.pending, data?.pending ? Number(id) : null, Boolean(data?.pending));

  if (!sections || !data) return <PageSkeleton />;
  const p = data.profile ?? {};
  const isDraft = Number(p.status) === INSTITUTION_DRAFT_STATUS_CODE;
  const locked = data.locked_fields ?? [];
  const buttons = actions.buttonsFor(p);

  const startEdit = () => {
    setValues(bodyOf(sections, p));
    setErrors({});
    setBadSections(new Set());
    setEditing(true);
    setTab("profile");
  };

  const stopEdit = () => {
    setEditing(false);
    setValues(null);
    setNarration("");
    if (params.get("edit")) setParams({}, { replace: true });
  };

  const showProblems = (problems) => {
    const { byField, sections: bad } = problemsOf(problems);
    setErrors(byField);
    setBadSections(bad);
    const first = sections.find((s) => bad.has(s.key));
    if (first) document.getElementById(`section-${first.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // Save: the whole form checked, then edit (sent for approval unless the
  // user may skip the checker). A draft can stay a draft.
  const save = async (isDraft = false) => {
    setBusy(true);
    try {
      const body = bodyOf(sections, values);
      const check = rowsOf(await institutionsApi.validate({ id: Number(id), ...body }))[0];
      if (!check?.valid) return showProblems(check?.problems);
      const reply = await institutionsApi.edit({ id: Number(id), ...body, ...(narration.trim() ? { narration: narration.trim() } : {}), expected_updated_time: p.updated_time, ...(isDraft ? { is_draft: true } : {}) });
      notifications.success(reply?.message ?? t("institutions:saved"));
      stopEdit();
      await load();
    } catch (e) {
      showProblems(e.fieldProblems);
      if (e.status === 409) {
        notifications.error(t("institutions:changedElsewhere"));
        const row = await load();
        if (row) setValues(bodyOf(sections, row.profile));
      } else notifications.error(e.message);
    } finally {
      setBusy(false);
    }
  };

  // A checklist step opens its page with this institution picked.
  const openStep = (s) => {
    if (chooser) setInstitutionFilter(String(p.id));
    navigate(`/${s.menu}`);
  };

  return (
    <div className="pb-8 pt-4">
      <button type="button" onClick={() => navigate("/institution/profile")} className="mb-2 flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-primary">
        <ArrowLeft size={13} /> {t("institutions:backToList")}
      </button>

      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight text-slate-800">{p.name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full bg-muted px-2 py-0.5 font-mono font-bold">{p.code}</span>
            {p.type_name && <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">{p.type_name}</span>}
            {p.status_name && <StatusBadge status={String(p.status_name).toUpperCase()} />}
            {p.auth_status && <StatusBadge status={String(p.auth_status).toUpperCase()} variant="subtle" />}
          </div>
        </div>
        {!editing && (
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && actions.can.canEdit && (
              <Button size="sm" icon={Pencil} onClick={() => navigate(`/institutions/create?draft=${p.id}`)}>
                {t("institutions:continueSetup")}
              </Button>
            )}
            {!isDraft && buttons.edit && !data.pending && (
              <Button size="sm" icon={Pencil} onClick={startEdit}>
                {t("common:edit")}
              </Button>
            )}
            <RowActions
              buttons={{ ...buttons, view: false, edit: false, audit: false }}
              onSubmit={() => actions.open("submit", p)}
              onAuthorize={() => actions.open("auth", p)}
              onDeauthorize={() => actions.open("deauth", p)}
              onDeactivate={() => actions.open("deactivate", p)}
              onReactivate={() => actions.open("reactivate", p)}
              onDelete={() => actions.open("delete", p)}
            />
          </div>
        )}
      </div>

      {params.get("sent") && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
          <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
          <p className="flex-1">{t("institutions:sentBanner")}</p>
          <button type="button" aria-label={t("common:close")} onClick={() => setParams({}, { replace: true })}>
            <X size={14} />
          </button>
        </div>
      )}
      {data.pending && (
        <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
          <p className="flex items-center gap-2 text-sm font-bold text-amber-800">
            <Clock3 size={16} /> {t("institutions:changeWaiting")}
          </p>
          <PendingChangesDiff {...pendingChanges} />
        </div>
      )}

      <Tabs tabs={[{ key: "setup" }, { key: "profile" }, { key: "history" }]} value={tab} onChange={setTab} labelOf={(k) => t(`institutions:tab_${k}`)} />

      {tab === "setup" && <SetupChecklist setup={data.setup} onOpen={openStep} />}

      {tab === "profile" &&
        (editing && values ? (
          <div className="grid gap-5 lg:grid-cols-[12rem_minmax(0,1fr)]">
            <nav className="hidden h-fit gap-1 lg:sticky lg:top-4 lg:grid">
              {sections.map((s) => {
                const Icon = SECTION_ICONS[s.icon];
                return (
                  <a key={s.key} href={`#section-${s.key}`} className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-muted", badSections.has(s.key) ? "text-red-700" : "text-muted-foreground")}>
                    {Icon && <Icon size={14} />} {s.title}
                  </a>
                );
              })}
            </nav>
            <div className="grid min-w-0 gap-4">
              {sections.map((s) => (
                <section key={s.key} id={`section-${s.key}`} className={cn("scroll-mt-4 rounded-2xl border bg-card p-5", badSections.has(s.key) ? "border-red-300" : "border-border")}>
                  <h2 className="text-base font-black">{s.title}</h2>
                  {s.description && <p className="mb-4 mt-1 text-xs text-muted-foreground">{s.description}</p>}
                  <SectionForm section={s} values={values} setValues={setValues} errors={errors} lockedFields={locked} phoneCodes={p.phone_codes ?? []} />
                </section>
              ))}
              <label className={labelClass}>
                {t("institutions:reasonForChange")}
                <textarea className={cn(inputClass, "mt-1.5 min-h-20")} maxLength={500} value={narration} onChange={(e) => setNarration(e.target.value)} />
              </label>
              <div className="sticky bottom-0 flex flex-wrap justify-end gap-2 rounded-2xl border border-border bg-card/95 p-3 backdrop-blur">
                <Button variant="ghost" disabled={busy} onClick={stopEdit}>
                  {t("common:cancel")}
                </Button>
                {isDraft && (
                  <Button variant="secondary" icon={Save} loading={busy} onClick={() => void save(true)}>
                    {t("institutions:saveAsDraft")}
                  </Button>
                )}
                <Button icon={Send} loading={busy} onClick={() => void save()}>
                  {t("institutions:saveChanges")}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {sections.map((s) => (
              <div key={s.key} className="rounded-2xl border border-border bg-card p-4">
                <p className="mb-3 text-sm font-bold">{s.title}</p>
                <SectionFacts section={s} values={p} />
              </div>
            ))}
          </div>
        ))}

      {tab === "history" && (audit ? <AuditTimeline audit={audit} empty={t("institutions:noHistory")} /> : <PageSkeleton />)}

      {actions.dialogs}
    </div>
  );
}
