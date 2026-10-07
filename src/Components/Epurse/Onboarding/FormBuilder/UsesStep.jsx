import { useEffect, useRef, useState } from "react";
import { AlertTriangle, ChevronDown, Plus, X } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { useOpenMenu } from "@/Pages/Sidebar/menuContext";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { UiTooltip } from "@/Components/Common/UiTooltip";
import { cn } from "@/Utils/Lib/cn";

// Step 4 of the definition wizard ("Admin portal: simpler Uses step"): the
// same form.uses as before, built from a few plain questions instead of one
// box per role. Every question only offers fields of the types it accepts,
// hides itself when none fit, and starts from a suggestion on a new form.
const LISTS = ["DROPDOWN", "RADIO", "CHECKBOXES"];
const COMPARABLE = ["TEXT", "NUMBER", "DATE", "PHONE", "EMAIL", "DROPDOWN", "RADIO"];
const COUNTRY_SOURCES = new Set(["master.country", "master.nationality"]);
// The digital product's residency rule reads the list field with this role.
const RESIDENCY_SOURCE = "master.residency_type";
const DOC_TYPE_SOURCE = "cust_master_config.indv_document_type";
const SCREENING = ["screening_name", "screening_birth_date", "screening_country", "screening_gender", "screening_alt_name"];
const DUPLICATE = ["duplicate_key", "duplicate_key_2", "duplicate_key_3"];
const KYC = ["kyc_document_type", "kyc_document_front", "kyc_document_back"];
const RELATED = ["related_party_name", "related_party_role", "related_party_birth_date", "related_party_country"];
const IDV = ["idv_front", "idv_back", "idv_selfie", "idv_face_side", "idv_id_number"];

// Identity verification: the photos are single-image files in a one-row
// section; the side choice is a list whose fixed choices include the values
// front and back.
const isSingleFile = (f) => f.field_type === "FILE" && !f.multiRow && f.options?.sides !== "front_back";
const isLiveness = (f) => f.options?.capture === "liveness";
const choiceValues = (f) => (f.choices ?? f.options?.choices ?? []).map((c) => String(c?.value ?? c?.code ?? c).toLowerCase());
const isSideChoice = (f) => (f.field_type === "RADIO" || f.field_type === "DROPDOWN") && !f.multiRow && ["front", "back"].every((v) => choiceValues(f).includes(v));

const text = (f) => `${f.key} ${f.name ?? ""} ${f.label ?? ""}`.toLowerCase();
const isList = (f) => LISTS.includes(f.field_type);
const isCountryList = (f) => isList(f) && COUNTRY_SOURCES.has(f.source_table);
const isDocTypeList = (f) => isList(f) && (f.source_table === DOC_TYPE_SOURCE || /document_type/.test(f.key));

// Name suggestion: a full name field, else first + last, else the first
// text field about a name (not a parent's).
function suggestName(fields) {
  const texts = fields.filter((f) => f.field_type === "TEXT" && !/father|mother|parent|spouse/.test(text(f)));
  const full = texts.find((f) => /full_?name/.test(text(f)));
  if (full) return [full.key];
  const firstName = texts.find((f) => /first/.test(text(f)));
  const lastName = texts.find((f) => /last|surname/.test(text(f)));
  if (firstName || lastName) return [firstName, lastName].filter(Boolean).map((f) => f.key);
  const any = texts.find((f) => /name/.test(text(f)));
  return any ? [any.key] : [];
}
const only = (list) => (list.length === 1 ? [list[0].key] : []);

function suggestUses(fields, kind) {
  const uses = {};
  const put = (role, keys) => keys.length && (uses[role] = keys);
  const name = suggestName(fields);
  put("display_name", name);
  put("screening_name", name);
  const dates = fields.filter((f) => f.field_type === "DATE");
  const birth = dates.find((f) => /birth|dob/.test(text(f)));
  put("screening_birth_date", birth ? [birth.key] : only(dates));
  const countries = fields.filter(isCountryList);
  const nationality = countries.find((f) => /national/.test(text(f)));
  put("screening_country", nationality ? [nationality.key] : only(countries));
  const gender = fields.find((f) => isList(f) && /gender|sex/.test(text(f)));
  if (gender) put("screening_gender", [gender.key]);
  if (kind !== "corporate") put("residency", only(fields.filter((f) => isList(f) && f.source_table === RESIDENCY_SOURCE)));
  put("contact_phone", only(fields.filter((f) => f.field_type === "PHONE")));
  put("contact_email", only(fields.filter((f) => f.field_type === "EMAIL")));
  const docType = fields.find(isDocTypeList);
  const docNumber = docType && fields.find((f) => f.section === docType.section && f.field_type === "TEXT" && /number|no\b/.test(text(f)));
  if (docType && docNumber) put("duplicate_key", [docType.key, docNumber.key]);
  if (kind === "individual") {
    const kycSections = kycCandidateSections(fields);
    if (kycSections.length === 1) Object.assign(uses, kycFor(fields, kycSections[0]));
  }
  return uses;
}

// Repeatable sections with a document-type list and at least one file.
function kycCandidateSections(fields) {
  const sections = [...new Set(fields.filter((f) => f.multiRow).map((f) => f.section))];
  return sections.filter((s) => fields.some((f) => f.section === s && isDocTypeList(f)) && fields.some((f) => f.section === s && f.field_type === "FILE"));
}
function kycFor(fields, section) {
  const inSection = fields.filter((f) => f.section === section);
  const types = inSection.filter(isDocTypeList);
  const files = inSection.filter((f) => f.field_type === "FILE");
  const out = {};
  if (types.length === 1) out.kyc_document_type = [types[0].key];
  const front = files.find((f) => /front/.test(text(f))) ?? (files.length >= 1 ? files[0] : null);
  const back = files.find((f) => /back|verso/.test(text(f)) && f.key !== front?.key) ?? (files.length === 2 ? files.find((f) => f.key !== front?.key) : null);
  if (front) out.kyc_document_front = [front.key];
  if (back) out.kyc_document_back = [back.key];
  return out;
}

// Problems name the role they are about ("display_name" or "display name").
const problemsFor = (problems, roles, phrase) =>
  (problems ?? [])
    .map((p) => (typeof p === "string" ? p : (p?.message ?? "")))
    .filter((p) => roles.some((r) => p.toLowerCase().includes(r) || p.toLowerCase().includes(r.replace(/_/g, " "))) || (phrase && p.toLowerCase().includes(phrase)));

function Card({ title, summary, open, onToggle, problems, children }) {
  return (
    <div className={cn("rounded-2xl border bg-white/70", problems?.length && "border-red-200")}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 px-4 py-3 text-left">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-800">{title}</p>
          {!open && summary && <p className="mt-0.5 truncate text-xs text-muted-foreground">{summary}</p>}
        </div>
        {problems?.length > 0 && <AlertTriangle size={15} className="shrink-0 text-red-500" />}
        <ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="flex flex-col gap-4 border-t px-4 py-4">{children}</div>}
      {problems?.length > 0 && (
        <ul className="list-disc border-t border-red-100 bg-red-50 px-4 py-2 pl-8 text-xs text-red-700">
          {problems.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

// Chips in the order picked: the number on a chip is its place in the join.
function OrderedChips({ fields, value, onChange, disabled, isDisabled }) {
  return (
    <div className="flex flex-wrap gap-2">
      {fields.map((f) => {
        const index = value.indexOf(f.key);
        const reason = isDisabled?.(f);
        const chip = (
          <button
            key={f.key}
            type="button"
            disabled={disabled || (index < 0 && Boolean(reason))}
            onClick={() => onChange(index >= 0 ? value.filter((k) => k !== f.key) : [...value, f.key])}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition",
              index >= 0 ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "text-slate-600 hover:bg-muted",
              "disabled:cursor-not-allowed disabled:opacity-40",
            )}
          >
            {index >= 0 && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--primary)] text-[10px] text-white">{index + 1}</span>}
            {f.label}
          </button>
        );
        return reason && index < 0 ? (
          <UiTooltip key={f.key} label={reason}>
            <span>{chip}</span>
          </UiTooltip>
        ) : (
          chip
        );
      })}
    </div>
  );
}

function Pick({ label, fields, value, onChange, disabled, emptyLabel, optional }) {
  return (
    <label className="text-sm font-semibold text-slate-700">
      {label}
      <FilterSelect
        className="mt-1.5"
        disabled={disabled}
        value={value ?? ""}
        onChange={(v) => onChange(v ? [v] : [])}
        options={[{ value: "", label: emptyLabel }, ...fields.map((f) => ({ value: f.key, label: `${f.label} · ${f.sectionName}` }))]}
      />
      {optional && <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{optional}</span>}
    </label>
  );
}

export function UsesStep({ kind, fields, uses, onChange, readOnly, problems, guardian, onGuardianChange }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const openMenu = useOpenMenu();
  const corporate = kind === "corporate";
  const current = uses ?? {};
  const isNew = Object.keys(current).length === 0;
  const get = (role) => current[role] ?? [];
  const set = (patch) => {
    const next = { ...current, ...patch };
    for (const [role, keys] of Object.entries(next)) if (!keys?.length) delete next[role];
    onChange(next);
  };

  // A new form starts from suggestions (once, only while nothing is set).
  const suggested = useRef(false);
  useEffect(() => {
    if (suggested.current || readOnly || !isNew || !fields.length) return;
    suggested.current = true;
    const suggestion = suggestUses(fields, kind);
    if (Object.keys(suggestion).length) onChange(suggestion);
  }, [fields, isNew, kind, onChange, readOnly]);

  const [open, setOpen] = useState(() => (isNew ? new Set(["name", "screening"]) : new Set()));
  const toggle = (id) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const [screeningOn, setScreeningOn] = useState(() => isNew || SCREENING.some((r) => get(r).length));
  const [skipDuplicates, setSkipDuplicates] = useState(() => !isNew && !get("duplicate_key").length);
  const [extraDuplicateRules, setExtraDuplicateRules] = useState(() => DUPLICATE.filter((r) => get(r).length).length);
  const [kycSection, setKycSection] = useState(null);
  const [relatedSection, setRelatedSection] = useState(null);

  if (!fields.length) return <p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-700">{t("addSectionsFirst")}</p>;

  const byKey = new Map(fields.map((f) => [f.key, f]));
  const labels = (keys) => keys.map((k) => byKey.get(k)?.label ?? k).join(" + ");
  const ofType = (types, pool = fields) => pool.filter((f) => types.includes(f.field_type));
  const texts = ofType(["TEXT"]);
  const dates = ofType(["DATE"]);
  const countries = fields.filter(isCountryList);
  const lists = fields.filter(isList);
  const phones = ofType(["PHONE"]);
  const residencies = corporate ? [] : lists.filter((f) => f.source_table === RESIDENCY_SOURCE);
  const emails = ofType(["EMAIL"]);
  const comparable = ofType(COMPARABLE);
  const addFieldFirst = (type) => (
    <button type="button" onClick={() => openMenu("formfields")} className="text-left text-xs font-semibold text-[var(--primary)] hover:underline">
      {t("addTypeFieldFirst", { type })}
    </button>
  );

  // 1. Name, plus the pre-fill line.
  const nameKeys = get("display_name");
  const nameCard = (
    <Card
      key="name"
      title={t("usesNameTitle")}
      summary={nameKeys.length ? t("usesNameSummary", { list: labels(nameKeys) }) : t("usesNotSet")}
      open={open.has("name")}
      onToggle={() => toggle("name")}
      problems={problemsFor(problems, ["display_name", "contact_phone", "contact_email", "residency"])}
    >
      {texts.length ? (
        <OrderedChips fields={texts} value={nameKeys} disabled={readOnly} onChange={(keys) => set({ display_name: keys })} />
      ) : (
        addFieldFirst("TEXT")
      )}
      <p className="text-[11px] text-muted-foreground">{t("usesNameHint")}</p>
      {!nameKeys.length && <p className="text-xs font-semibold text-amber-700">{t("usesNameRequired")}</p>}
      {(phones.length > 0 || emails.length > 0) && (
        <div className="rounded-xl bg-muted/50 p-3">
          <p className="mb-2 text-xs font-semibold text-slate-700">{t("usesPrefill")}</p>
          <div className="grid gap-3 md:grid-cols-2">
            {phones.length > 0 && <Pick label={t("usesPhone")} fields={phones} value={get("contact_phone")[0]} disabled={readOnly} emptyLabel={t("usesDontPrefill")} onChange={(keys) => set({ contact_phone: keys })} />}
            {emails.length > 0 && <Pick label={t("usesEmail")} fields={emails} value={get("contact_email")[0]} disabled={readOnly} emptyLabel={t("usesDontPrefill")} onChange={(keys) => set({ contact_email: keys })} />}
          </div>
        </div>
      )}
      {residencies.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          <Pick label={t("usesResidency")} fields={residencies} value={get("residency")[0]} disabled={readOnly} emptyLabel={t("usesResidencyNone")} onChange={(keys) => set({ residency: keys })} />
        </div>
      )}
    </Card>
  );

  // 2. Screening.
  const setScreening = (on) => {
    setScreeningOn(on);
    if (!on) set(Object.fromEntries(SCREENING.map((r) => [r, []])));
    else if (!get("screening_name").length && nameKeys.length) set({ screening_name: nameKeys });
  };
  const screeningCard = (
    <Card
      key="screening"
      title={corporate ? t("usesScreenCompanyTitle") : t("usesScreenTitle")}
      summary={screeningOn ? (get("screening_name").length ? t("usesScreenSummary", { list: labels(get("screening_name")) }) : t("usesScreenNoName")) : t("usesScreenOff")}
      open={open.has("screening")}
      onToggle={() => toggle("screening")}
      problems={problemsFor(problems, SCREENING)}
    >
      <CheckboxPill className="self-start" checked={screeningOn} disabled={readOnly} onChange={setScreening} label={t("usesScreenToggle")} />
      {!screeningOn ? (
        <p className="flex items-center gap-2 text-xs font-semibold text-amber-700">
          <AlertTriangle size={14} /> {t("usesScreenOffWarning")}
        </p>
      ) : (
        <>
          <div>
            <p className="mb-1.5 text-sm font-semibold text-slate-700">{t("usesScreenName")}</p>
            {texts.length ? <OrderedChips fields={texts} value={get("screening_name")} disabled={readOnly} onChange={(keys) => set({ screening_name: keys })} /> : addFieldFirst("TEXT")}
            {!get("screening_name").length && <p className="mt-1 text-xs font-semibold text-amber-700">{t("usesScreenNoName")}</p>}
          </div>
          {corporate && texts.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-semibold text-slate-700">{t("usesTradingName")}</p>
              <OrderedChips fields={texts} value={get("screening_alt_name")} disabled={readOnly} onChange={(keys) => set({ screening_alt_name: keys })} />
            </div>
          )}
          <div className="grid gap-3 md:grid-cols-3">
            {dates.length > 0 && <Pick label={t("usesBirthDate")} fields={dates} value={get("screening_birth_date")[0]} disabled={readOnly} emptyLabel={t("usesNotScreened")} onChange={(keys) => set({ screening_birth_date: keys })} />}
            {countries.length > 0 && <Pick label={t("usesCountry")} fields={countries} value={get("screening_country")[0]} disabled={readOnly} emptyLabel={t("usesNotScreened")} onChange={(keys) => set({ screening_country: keys })} />}
            {!corporate && lists.length > 0 && <Pick label={t("usesGender")} fields={lists} value={get("screening_gender")[0]} disabled={readOnly} emptyLabel={t("usesNotScreened")} onChange={(keys) => set({ screening_gender: keys })} />}
          </div>
        </>
      )}
    </Card>
  );

  // 3. Duplicates: up to three rules, each all in one section.
  const shownRules = Math.max(1, extraDuplicateRules);
  const duplicateSummary = skipDuplicates
    ? t("usesDuplicatesOff")
    : DUPLICATE.map((r) => get(r))
        .filter((k) => k.length)
        .map((k) => labels(k))
        .join(" · ") || t("usesNotSet");
  const duplicateCard = comparable.length > 0 && (
    <Card key="duplicates" title={t("usesDuplicateTitle")} summary={duplicateSummary} open={open.has("duplicates")} onToggle={() => toggle("duplicates")} problems={problemsFor(problems, DUPLICATE)}>
      <CheckboxPill
        className="self-start"
        checked={skipDuplicates}
        disabled={readOnly}
        onChange={(on) => {
          setSkipDuplicates(on);
          if (on) {
            set(Object.fromEntries(DUPLICATE.map((r) => [r, []])));
            setExtraDuplicateRules(0);
          }
        }}
        label={t("usesDontCheckDuplicates")}
      />
      {!skipDuplicates && (
        <>
          {DUPLICATE.slice(0, shownRules).map((role, index) => {
            const keys = get(role);
            const section = keys.length ? byKey.get(keys[0])?.section : null;
            return (
              <div key={role} className="rounded-xl border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-700">{index === 0 ? t("usesDuplicateRule") : t("usesDuplicateRuleOr")}</p>
                  {index > 0 && !readOnly && (
                    <button
                      type="button"
                      aria-label={t("remove")}
                      onClick={() => {
                        // Later rules move up so there's no gap.
                        const rest = DUPLICATE.map((r) => get(r)).filter((_, i) => i !== index);
                        set(Object.fromEntries(DUPLICATE.map((r, i) => [r, rest[i] ?? []])));
                        setExtraDuplicateRules(shownRules - 1);
                      }}
                      className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <OrderedChips fields={comparable} value={keys} disabled={readOnly} isDisabled={(f) => (section && f.section !== section ? t("usesSameSectionOnly") : null)} onChange={(next) => set({ [role]: next })} />
              </div>
            );
          })}
          {shownRules < 3 && !readOnly && (
            <button type="button" onClick={() => setExtraDuplicateRules(shownRules + 1)} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
              <Plus size={13} /> {t("usesAddDuplicateRule")}
            </button>
          )}
        </>
      )}
    </Card>
  );

  // 4. KYC documents (individual only, when a fitting section exists).
  const kycSections = kycCandidateSections(fields);
  const kycSectionKey = kycSection ?? byKey.get(get("kyc_document_type")[0])?.section ?? (kycSections.length === 1 ? kycSections[0] : null);
  const inKyc = fields.filter((f) => f.section === kycSectionKey);
  const sectionName = (key) => fields.find((f) => f.section === key)?.sectionName ?? key;
  const kycCard = !corporate && kycSections.length > 0 && (
    <Card
      key="kyc"
      title={t("usesKycTitle")}
      summary={get("kyc_document_type").length ? t("usesKycSummary", { section: sectionName(kycSectionKey) }) : t("usesNotSet")}
      open={open.has("kyc")}
      onToggle={() => toggle("kyc")}
      problems={problemsFor(problems, KYC)}
    >
      <label className="text-sm font-semibold text-slate-700">
        {t("usesKycSection")}
        <FilterSelect
          className="mt-1.5"
          disabled={readOnly}
          value={kycSectionKey ?? ""}
          onChange={(key) => {
            setKycSection(key || null);
            set({ kyc_document_type: [], kyc_document_front: [], kyc_document_back: [], ...(key ? kycFor(fields, key) : {}) });
          }}
          options={[{ value: "", label: t("usesKycNone") }, ...kycSections.map((s) => ({ value: s, label: sectionName(s) }))]}
        />
      </label>
      {kycSectionKey && (
        <div className="grid gap-3 md:grid-cols-3">
          <Pick label={t("usesKycType")} fields={inKyc.filter(isDocTypeList)} value={get("kyc_document_type")[0]} disabled={readOnly} emptyLabel={t("select")} onChange={(keys) => set({ kyc_document_type: keys })} />
          <Pick label={t("usesKycFront")} fields={ofType(["FILE"], inKyc)} value={get("kyc_document_front")[0]} disabled={readOnly} emptyLabel={t("select")} onChange={(keys) => set({ kyc_document_front: keys })} />
          <Pick label={t("usesKycBack")} fields={ofType(["FILE"], inKyc)} value={get("kyc_document_back")[0]} disabled={readOnly} emptyLabel={t("usesNoBack")} onChange={(keys) => set({ kyc_document_back: keys })} optional={t("usesOptional")} />
        </div>
      )}
    </Card>
  );

  // Corporate: related people, from one repeatable section.
  const repeatableSections = [...new Set(fields.filter((f) => f.multiRow).map((f) => f.section))];
  const relatedKey = relatedSection ?? byKey.get(get("related_party_name")[0])?.section ?? null;
  const inRelated = fields.filter((f) => f.section === relatedKey);
  const relatedCard = corporate && repeatableSections.length > 0 && (
    <Card
      key="related"
      title={t("usesRelatedTitle")}
      summary={get("related_party_name").length ? t("usesRelatedSummary", { section: sectionName(relatedKey) }) : t("usesNotSet")}
      open={open.has("related")}
      onToggle={() => toggle("related")}
      problems={problemsFor(problems, RELATED)}
    >
      <label className="text-sm font-semibold text-slate-700">
        {t("usesRelatedSection")}
        <FilterSelect
          className="mt-1.5"
          disabled={readOnly}
          value={relatedKey ?? ""}
          onChange={(key) => {
            setRelatedSection(key || null);
            set(Object.fromEntries(RELATED.map((r) => [r, []])));
          }}
          options={[{ value: "", label: t("usesRelatedNone") }, ...repeatableSections.map((s) => ({ value: s, label: sectionName(s) }))]}
        />
      </label>
      {relatedKey && (
        <div className="grid gap-3 md:grid-cols-2">
          <Pick label={t("usesRelatedName")} fields={ofType(["TEXT"], inRelated)} value={get("related_party_name")[0]} disabled={readOnly} emptyLabel={t("select")} onChange={(keys) => set({ related_party_name: keys })} />
          <Pick label={t("usesRelatedRole")} fields={inRelated.filter((f) => f.field_type === "TEXT" || isList(f))} value={get("related_party_role")[0]} disabled={readOnly} emptyLabel={t("usesNotUsed")} onChange={(keys) => set({ related_party_role: keys })} />
          <Pick label={t("usesBirthDate")} fields={ofType(["DATE"], inRelated)} value={get("related_party_birth_date")[0]} disabled={readOnly} emptyLabel={t("usesNotUsed")} onChange={(keys) => set({ related_party_birth_date: keys })} />
          <Pick label={t("usesCountry")} fields={inRelated.filter(isCountryList)} value={get("related_party_country")[0]} disabled={readOnly} emptyLabel={t("usesNotUsed")} onChange={(keys) => set({ related_party_country: keys })} />
        </div>
      )}
    </Card>
  );

  // Identity verification: OCR of the document and a face match with the
  // selfie, run when the photo section is saved. Front and selfie are
  // required once any role is set; the photos and the side choice share one
  // single-row section (the first photo picked decides which).
  const singleFiles = fields.filter(isSingleFile);
  const idvSection = byKey.get(get("idv_front")[0] ?? get("idv_selfie")[0] ?? get("idv_back")[0])?.section ?? null;
  const sameSection = (list) => (idvSection ? list.filter((f) => f.section === idvSection) : list);
  const idvSet = IDV.some((r) => get(r).length);
  const idvSummary = idvSet ? [get("idv_front"), get("idv_selfie")].map((k) => labels(k) || "—").join(" + ") : t("usesIdvOff");
  const idvCard = singleFiles.length > 0 && (
    <Card key="idv" title={t("usesIdvTitle")} summary={idvSummary} open={open.has("idv")} onToggle={() => toggle("idv")} problems={problemsFor(problems, IDV, "identity verification")}>
      <p className="text-xs text-muted-foreground">{t("usesIdvIntro")}</p>
      <div className="grid gap-3 md:grid-cols-3">
        <Pick label={t("usesIdvFront")} fields={sameSection(singleFiles)} value={get("idv_front")[0]} disabled={readOnly} emptyLabel={t("usesNotUsed")} onChange={(keys) => set({ idv_front: keys })} />
        <Pick label={t("usesIdvBack")} fields={sameSection(singleFiles)} value={get("idv_back")[0]} disabled={readOnly} emptyLabel={t("usesNoBack")} onChange={(keys) => set({ idv_back: keys })} optional={t("usesOptional")} />
        <Pick label={t("usesIdvSelfie")} fields={sameSection(singleFiles)} value={get("idv_selfie")[0]} disabled={readOnly} emptyLabel={t("usesNotUsed")} onChange={(keys) => set({ idv_selfie: keys })} />
        <Pick label={t("usesIdvFaceSide")} fields={sameSection(fields.filter(isSideChoice))} value={get("idv_face_side")[0]} disabled={readOnly} emptyLabel={t("usesIdvFaceFront")} onChange={(keys) => set({ idv_face_side: keys })} optional={t("usesOptional")} />
        <Pick label={t("usesIdvNumber")} fields={ofType(["TEXT"], fields)} value={get("idv_id_number")[0]} disabled={readOnly} emptyLabel={t("usesNotUsed")} onChange={(keys) => set({ idv_id_number: keys })} optional={t("usesOptional")} />
      </div>
      {idvSet && (!get("idv_front").length || !get("idv_selfie").length) && <p className="text-xs font-semibold text-amber-700">{t("usesIdvNeedsBoth")}</p>}
      {get("idv_selfie").length > 0 && !isLiveness(byKey.get(get("idv_selfie")[0]) ?? {}) && <p className="text-xs text-amber-700">{t("usesIdvLivenessTip")}</p>}
      {idvSet && !readOnly && (
        <button type="button" onClick={() => set(Object.fromEntries(IDV.map((r) => [r, []])))} className="w-fit text-xs font-bold text-red-600 hover:underline">
          {t("usesIdvClear")}
        </button>
      )}
    </Card>
  );

  // The guardian a minor names: their phone (one field per path that asks
  // it), who they are, and the KYC level they must hold.
  const guardianSet = get("guardian_phone").length > 0;
  const guardianCard = !corporate && (
    <Card
      key="guardian"
      title={t("usesGuardianTitle")}
      summary={guardianSet ? t("usesGuardianSummary", { list: labels(get("guardian_phone")), level: Number(guardian?.min_kyc_level) || 0 }) : t("usesNotSet")}
      open={open.has("guardian")}
      onToggle={() => toggle("guardian")}
      problems={problemsFor(problems, ["guardian_phone", "guardian_relation"])}
    >
      <p className="text-xs text-muted-foreground">{t("usesGuardianIntro")}</p>
      <div>
        <p className="mb-1.5 text-sm font-semibold text-slate-700">{t("usesGuardianPhone")}</p>
        {phones.length ? <OrderedChips fields={phones} value={get("guardian_phone")} disabled={readOnly} onChange={(keys) => set({ guardian_phone: keys })} /> : addFieldFirst("PHONE")}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <Pick label={t("usesGuardianRelation")} fields={lists} value={get("guardian_relation")[0]} disabled={readOnly} emptyLabel={t("usesNotUsed")} onChange={(keys) => set({ guardian_relation: keys })} optional={t("usesOptional")} />
        <label className="text-sm font-semibold text-slate-700">
          {t("usesGuardianLevel")}
          <input
            type="number"
            min={0}
            className="mt-1.5 w-full rounded-xl border px-3 py-2.5 text-sm font-normal disabled:bg-muted"
            disabled={readOnly}
            value={guardian?.min_kyc_level ?? 0}
            onChange={(e) => onGuardianChange?.({ ...guardian, min_kyc_level: e.target.value === "" ? 0 : Math.max(0, Number(e.target.value)) })}
          />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("usesGuardianLevelHint")}</span>
        </label>
      </div>
    </Card>
  );

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("usesIntro")}</p>
      {nameCard}
      {screeningCard}
      {duplicateCard}
      {kycCard}
      {idvCard}
      {relatedCard}
      {guardianCard}
    </div>
  );
}
