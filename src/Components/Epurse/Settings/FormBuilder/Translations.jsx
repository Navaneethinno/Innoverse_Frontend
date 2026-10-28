import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Languages, Upload } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { Modal } from "@/Components/Common/Modal";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { SearchBox } from "@/Components/Common/SearchBox";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { TabButton } from "@/Components/Common/ListView";
import { Section } from "@/Components/Finance/Deposits/depositShared";
import { corpOnboardingDefinitionApi, onboardingDefinitionApi, rowsOf, translationApi } from "@/Services/Epurse/onboarding.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { canChooseInstitution } from "@/Utils/Lib/institutionScope";
import { useInstitutionFilter } from "@/Utils/Lib/institutionFilter";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { inputClass } from "./FieldOptionsEditor";

// Onboarding texts in the institution's other languages. English is the
// base text (the fields already sent); each other language the institution
// offers takes its own text beside it, and a missing one shows in English.

// The institution these calls are for: the top bar's choice for a System or
// service-provider user (none chosen: nothing to load), else the user's own.
function useTranslationScope() {
  const chosen = useInstitutionFilter();
  const chooser = canChooseInstitution();
  return { needsInstitution: chooser && !chosen, body: chooser && chosen ? { inst_profile_id: Number(chosen) } : {} };
}

// The institution's languages other than English: [{ code, name, native_name }].
export function useTranslationLanguages() {
  const scope = useTranslationScope();
  const [languages, setLanguages] = useState([]);
  const key = JSON.stringify(scope.body);
  useEffect(() => {
    if (scope.needsInstitution) {
      setLanguages([]);
      return undefined;
    }
    let live = true;
    translationApi
      .languages(JSON.parse(key))
      .then((r) => live && setLanguages(rowsOf(r).filter((l) => !l.base)))
      .catch(() => live && setLanguages([]));
    return () => {
      live = false;
    };
  }, [key, scope.needsInstitution]);
  return { languages, scope };
}

const languageLabel = (l) => (l.native_name && l.native_name !== l.name ? `${l.name} (${l.native_name})` : l.name ?? l.code);

// A record's `translations` with empty texts left out ({} when none).
export function cleanTranslations(value) {
  const out = {};
  for (const [lang, texts] of Object.entries(value ?? {})) {
    const kept = {};
    for (const [k, v] of Object.entries(texts ?? {})) {
      if (v && typeof v === "object") {
        const choices = Object.fromEntries(Object.entries(v).filter(([, text]) => String(text ?? "").trim()));
        if (Object.keys(choices).length) kept[k] = choices;
      } else if (String(v ?? "").trim()) kept[k] = String(v).trim();
    }
    if (Object.keys(kept).length) out[lang] = kept;
  }
  return out;
}

// One block per language: an input for each English text that has one.
// texts: [{ key, label, english }]; choices: [{ value, label }] (a field's
// own fixed choices, translated by value).
export function TranslationFields({ languages, texts, choices = [], value, onChange, disabled }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  if (!languages.length) return null;
  const shown = texts.filter((x) => String(x.english ?? "").trim());
  const listed = choices.filter((c) => String(c.label ?? "").trim() && c.value !== "");
  if (!shown.length && !listed.length) return null;
  const setText = (lang, key, text) => onChange({ ...value, [lang]: { ...(value?.[lang] ?? {}), [key]: text } });
  const setChoice = (lang, choice, text) => setText(lang, "choices", { ...(value?.[lang]?.choices ?? {}), [choice]: text });
  return (
    <div className="rounded-2xl border bg-muted/40 p-4">
      <h3 className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        <Languages size={14} /> {t("formBuilder:translations")}
      </h3>
      <p className="mb-3 text-[11px] text-muted-foreground">{t("formBuilder:translationsHint")}</p>
      <div className="grid gap-4">
        {languages.map((l) => (
          <div key={l.code}>
            <p className="mb-2 text-xs font-bold text-slate-700">{languageLabel(l)}</p>
            <div className="grid gap-x-6 gap-y-3 md:grid-cols-2">
              {shown.map((x) => (
                <label key={x.key} className="text-xs font-semibold text-slate-600">
                  {x.label}
                  <input className={inputClass} disabled={disabled} placeholder={x.english} value={value?.[l.code]?.[x.key] ?? ""} onChange={(e) => setText(l.code, x.key, e.target.value)} />
                </label>
              ))}
              {listed.map((c) => (
                <label key={`choice-${c.value}`} className="text-xs font-semibold text-slate-600">
                  {t("formBuilder:choiceNamed", { name: c.label })}
                  <input className={inputClass} disabled={disabled} placeholder={c.label} value={value?.[l.code]?.choices?.[c.value] ?? ""} onChange={(e) => setChoice(l.code, String(c.value), e.target.value)} />
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Where a missing text is: section, field, list entry...
function whereOf(item, t) {
  if (item.kind === "list") return `${item.source} #${item.id}`;
  if (item.kind === "section") return item.section;
  if (item.kind === "ussd_step") return item.key ?? item.section ?? "";
  return [item.section, item.key].filter(Boolean).join(" › ") || t("formBuilder:none");
}

const KIND_ORDER = ["section", "field", "placement", "choice", "ussd_step", "list"];

// The texts still missing, grouped by kind (most first). Shared by the
// Customer types tab and the publish check.
export function MissingTexts({ items, languages }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const [kind, setKind] = useState("all");
  const counts = useMemo(() => {
    const c = {};
    for (const i of items) c[i.kind] = (c[i.kind] ?? 0) + 1;
    return c;
  }, [items]);
  const kinds = KIND_ORDER.filter((k) => counts[k]);
  const rows = kind === "all" ? items : items.filter((i) => i.kind === kind);
  const langName = (code) => languages?.find((l) => l.code === code)?.name ?? code;
  if (!items.length) return <p className="rounded-xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">{t("formBuilder:nothingMissing")}</p>;
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-1.5">
        <TabButton active={kind === "all"} onClick={() => setKind("all")}>
          {t("common:all")} · {items.length}
        </TabButton>
        {kinds.map((k) => (
          <TabButton key={k} active={kind === k} onClick={() => setKind(k)}>
            {t(`formBuilder:textKind_${k}`)} · {counts[k]}
          </TabButton>
        ))}
      </div>
      <div className="max-h-[50vh] overflow-y-auto rounded-xl border">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("formBuilder:textKind")}</th>
              <th className="px-3 py-2">{t("formBuilder:textWhere")}</th>
              <th className="px-3 py-2">{t("formBuilder:textEnglish")}</th>
              {(languages?.length ?? 0) > 1 && <th className="px-3 py-2">{t("formBuilder:language")}</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((i, n) => (
              <tr key={n} className="border-t">
                <td className="px-3 py-2 font-semibold">{t(`formBuilder:textKind_${i.kind}`, { defaultValue: i.kind })}</td>
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {whereOf(i, t)} · {i.text}
                </td>
                <td className="px-3 py-2">{i.english}</td>
                {(languages?.length ?? 0) > 1 && <td className="px-3 py-2">{langName(i.language)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Customer types tab: what is still missing for one customer type, and
// its texts as a CSV for a translator (export, then import the filled file).
function CustomerTypesTab({ languages, scope, canEdit }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const [kind, setKind] = useState("individual");
  const [definitions, setDefinitions] = useState([]);
  const [definitionId, setDefinitionId] = useState("");
  const [language, setLanguage] = useState("");
  const [missing, setMissing] = useState(null);
  const [busy, setBusy] = useState("");
  const [result, setResult] = useState(null);
  const fileRef = useRef(null);
  const key = JSON.stringify(scope.body);
  const lang = language || languages[0]?.code || "";

  useEffect(() => {
    let live = true;
    setDefinitionId("");
    setDefinitions([]);
    (kind === "individual" ? onboardingDefinitionApi : corpOnboardingDefinitionApi)
      .list({ page: 1, limit: 200, ...JSON.parse(key) })
      .then((r) => live && setDefinitions(rowsOf(r)))
      .catch((e) => live && notifications.error(e.message));
    return () => {
      live = false;
    };
  }, [kind, key]);

  const loadMissing = useCallback(() => {
    if (!definitionId) return;
    setMissing(null);
    translationApi
      .missing({ definition_id: Number(definitionId), kind, ...JSON.parse(key) })
      .then((r) => setMissing(rowsOf(r)[0]?.missing ?? []))
      .catch((e) => {
        setMissing([]);
        notifications.error(e.message);
      });
  }, [definitionId, kind, key]);
  useEffect(loadMissing, [loadMissing]);

  const run = async (label, work) => {
    setBusy(label);
    try {
      await work();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setBusy("");
    }
  };
  const exportCsv = () =>
    run("export", async () => {
      const file = rowsOf(await translationApi.exportCsv({ definition_id: Number(definitionId), kind, language: lang, ...JSON.parse(key) }))[0];
      saveBlob(new Blob([file?.csv ?? ""], { type: "text/csv;charset=utf-8" }), file?.filename ?? `onboarding_${definitionId}_${lang}.csv`);
    });
  const importCsv = (file) =>
    run("import", async () => {
      const response = await translationApi.importCsv({ definition_id: Number(definitionId), kind, language: lang, csv: await file.text(), ...JSON.parse(key) });
      const r = rowsOf(response)[0] ?? {};
      setResult({ saved: r.saved ?? 0, skipped: r.skipped ?? [] });
      notifications.success(apiMessage(response, t("formBuilder:importDone")));
      loadMissing();
    });

  const shownMissing = (missing ?? []).filter((i) => !lang || i.language === lang);
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-3">
        <label className="text-xs font-semibold text-slate-700">
          {t("formBuilder:ownershipKind")}
          <FilterSelect className="mt-1.5" value={kind} onChange={setKind} options={[{ value: "individual", label: t("formBuilder:kindIndividual") }, { value: "corporate", label: t("formBuilder:kindCorporate") }]} />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {t("formBuilder:customerType")}
          <FilterSelect
            className="mt-1.5"
            value={definitionId}
            onChange={setDefinitionId}
            options={[{ value: "", label: t("formBuilder:chooseCustomerType") }, ...definitions.map((d) => ({ value: String(d.id), label: `${d.name}${d.process_status_name ? ` · ${d.process_status_name}` : ""}` }))]}
          />
        </label>
        <label className="text-xs font-semibold text-slate-700">
          {t("formBuilder:language")}
          <FilterSelect className="mt-1.5" value={lang} onChange={setLanguage} options={languages.map((l) => ({ value: l.code, label: languageLabel(l) }))} />
        </label>
      </div>
      {definitionId && (
        <Section
          title={missing ? t("formBuilder:missingCount", { count: shownMissing.length }) : t("common:loading")}
          action={
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" icon={Download} loading={busy === "export"} disabled={Boolean(busy)} onClick={() => void exportCsv()}>
                {t("formBuilder:exportCsv")}
              </Button>
              {canEdit && (
                <>
                  <Button size="sm" icon={Upload} loading={busy === "import"} disabled={Boolean(busy)} onClick={() => fileRef.current?.click()}>
                    {t("formBuilder:importCsv")}
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (file) void importCsv(file);
                    }}
                  />
                </>
              )}
            </div>
          }
        >
          <p className="mb-3 text-[11px] text-muted-foreground">{t("formBuilder:csvHint")}</p>
          {result && (
            <div className="mb-3 rounded-xl border bg-muted/40 p-3 text-xs">
              <p className="font-semibold text-slate-700">{t("formBuilder:importSaved", { count: result.saved })}</p>
              {result.skipped.length > 0 && (
                <>
                  <p className="mt-2 font-semibold text-amber-700">{t("formBuilder:importSkipped", { count: result.skipped.length })}</p>
                  <ul className="mt-1 max-h-40 list-disc overflow-y-auto pl-5 text-muted-foreground">
                    {result.skipped.map((s, i) => (
                      <li key={i}>{t("formBuilder:importSkippedRow", { row: s.row, reason: s.reason })}</li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          )}
          {missing && <MissingTexts items={shownMissing} languages={languages} />}
        </Section>
      )}
    </div>
  );
}

// Lists tab: every translatable list with its missing count; one list's
// entries with the English beside an input. Changes apply at once.
function ListsTab({ languages, scope, canEdit }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const [language, setLanguage] = useState("");
  const [sources, setSources] = useState(null);
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState(null);
  const key = JSON.stringify(scope.body);
  const lang = language || languages[0]?.code || "";

  const loadSources = useCallback(() => {
    if (!lang) return;
    translationApi
      .sources({ language: lang, ...JSON.parse(key) })
      .then((r) => setSources(rowsOf(r)))
      .catch((e) => {
        setSources([]);
        notifications.error(e.message);
      });
  }, [lang, key]);
  useEffect(loadSources, [loadSources]);

  const q = filter.trim().toLowerCase();
  const shown = (sources ?? []).filter((s) => !q || String(s.label ?? s.source).toLowerCase().includes(q));
  return (
    <div className="grid gap-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs font-semibold text-slate-700">
          {t("formBuilder:language")}
          <FilterSelect className="mt-1.5" value={lang} onChange={setLanguage} options={languages.map((l) => ({ value: l.code, label: languageLabel(l) }))} />
        </label>
        <div className="text-xs font-semibold text-slate-700">
          {t("formBuilder:findList")}
          <SearchBox className="mt-1.5" search={filter} onSearch={setFilter} placeholder={t("formBuilder:findListPlaceholder")} />
        </div>
      </div>
      <div className="max-h-[55vh] overflow-y-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">{t("formBuilder:list")}</th>
              <th className="px-3 py-2 text-right">{t("formBuilder:entries")}</th>
              <th className="px-3 py-2 text-right">{t("formBuilder:missing")}</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {sources === null && (
              <tr>
                <td colSpan={4} className="px-3 py-4 text-center text-muted-foreground">
                  {t("common:loading")}
                </td>
              </tr>
            )}
            {shown.map((s) => (
              <tr key={s.source} className="border-t">
                <td className="px-3 py-2 font-semibold text-slate-800">{s.label ?? s.source}</td>
                <td className="px-3 py-2 text-right tabular-nums">{s.items}</td>
                <td className={`px-3 py-2 text-right tabular-nums ${s.missing ? "font-bold text-amber-700" : "text-emerald-700"}`}>{s.missing}</td>
                <td className="px-3 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => setOpen(s)}>
                    {canEdit ? t("formBuilder:translate") : t("common:view")}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {open && (
        <ListEntries
          source={open}
          language={languages.find((l) => l.code === lang)}
          scope={scope}
          canEdit={canEdit}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            loadSources();
          }}
        />
      )}
    </div>
  );
}

// One list's entries in one language. Only changed entries are sent; an
// emptied one removes its translation.
function ListEntries({ source, language, scope, canEdit, onClose, onSaved }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const [items, setItems] = useState(null);
  const [edits, setEdits] = useState({});
  const [search, setSearch] = useState("");
  const [missingOnly, setMissingOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const key = JSON.stringify(scope.body);

  useEffect(() => {
    let live = true;
    const term = search.trim();
    const timer = window.setTimeout(
      () =>
        translationApi
          .listGet({ source: source.source, language: language.code, ...(term ? { search: term } : {}), ...(missingOnly ? { missing_only: true } : {}), ...JSON.parse(key) })
          .then((r) => live && setItems(rowsOf(r)[0]?.items ?? []))
          .catch((e) => live && (setItems([]), notifications.error(e.message))),
      term ? 300 : 0,
    );
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [source.source, language.code, search, missingOnly, key]);

  const changed = Object.entries(edits).filter(([id, name]) => {
    const was = (items ?? []).find((i) => String(i.id) === id)?.name ?? "";
    return name.trim() !== (was ?? "").trim();
  });
  const save = async () => {
    setSaving(true);
    try {
      const response = await translationApi.listEdit({ source: source.source, language: language.code, items: changed.map(([id, name]) => ({ id: Number(id), name: name.trim() })), ...JSON.parse(key) });
      notifications.success(apiMessage(response, t("formBuilder:translationsSaved")));
      onSaved();
    } catch (e) {
      notifications.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      size="lg"
      onClose={onClose}
      title={`${source.label ?? source.source} · ${languageLabel(language)}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {canEdit ? t("common:cancel") : t("common:close")}
          </Button>
          {canEdit && (
            <Button disabled={!changed.length || saving} loading={saving} onClick={() => void save()}>
              {changed.length ? t("formBuilder:saveCount", { count: changed.length }) : t("common:save")}
            </Button>
          )}
        </>
      }
    >
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchBox className="min-w-0 flex-1" search={search} onSearch={setSearch} placeholder={t("formBuilder:searchEntries")} />
        <CheckboxPill checked={missingOnly} onChange={setMissingOnly} label={t("formBuilder:missingOnly")} />
      </div>
      <p className="mb-3 text-[11px] text-muted-foreground">{t("formBuilder:listTranslationHint")}</p>
      <div className="max-h-[55vh] overflow-y-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-muted text-[11px] uppercase text-muted-foreground">
            <tr>
              <th className="w-1/2 px-3 py-2">{t("formBuilder:textEnglish")}</th>
              <th className="px-3 py-2">{languageLabel(language)}</th>
            </tr>
          </thead>
          <tbody>
            {items === null && (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                  {t("common:loading")}
                </td>
              </tr>
            )}
            {items?.length === 0 && (
              <tr>
                <td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">
                  {t("formBuilder:noEntries")}
                </td>
              </tr>
            )}
            {(items ?? []).map((i) => (
              <tr key={i.id} className="border-t">
                <td className="px-3 py-1.5">{i.english}</td>
                <td className="px-3 py-1.5">
                  <input
                    className="w-full rounded-lg border border-border bg-card px-2.5 py-1.5 text-sm outline-none focus:border-primary disabled:bg-muted"
                    disabled={!canEdit}
                    placeholder={i.english}
                    value={edits[i.id] ?? i.name ?? ""}
                    onChange={(e) => setEdits((all) => ({ ...all, [i.id]: e.target.value }))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Modal>
  );
}

// The Translations window (Form Builder): customer types, then lists.
export function TranslationsModal({ canEdit, onClose }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  const { languages, scope } = useTranslationLanguages();
  const [tab, setTab] = useState("types");
  return (
    <Modal open size="xl" onClose={onClose} title={t("formBuilder:translations")}>
      {scope.needsInstitution ? (
        <p className="text-sm text-muted-foreground">{t("formBuilder:pickInstitutionFirst")}</p>
      ) : !languages.length ? (
        <p className="text-sm text-muted-foreground">{t("formBuilder:englishOnly")}</p>
      ) : (
        <>
          <p className="mb-4 text-xs text-muted-foreground">{t("formBuilder:translationsIntro", { languages: languages.map(languageLabel).join(", ") })}</p>
          <div className="mb-4 flex gap-1.5">
            <TabButton active={tab === "types"} onClick={() => setTab("types")}>
              {t("formBuilder:customerTypes")}
            </TabButton>
            <TabButton active={tab === "lists"} onClick={() => setTab("lists")}>
              {t("formBuilder:lists")}
            </TabButton>
          </div>
          {tab === "types" ? <CustomerTypesTab languages={languages} scope={scope} canEdit={canEdit} /> : <ListsTab languages={languages} scope={scope} canEdit={canEdit} />}
        </>
      )}
    </Modal>
  );
}

// A submit refused for untranslated texts (form.translations_missing):
// the texts, and "publish anyway", which sends the same call again with
// confirm_missing_translations.
export function UntranslatedConfirm({ refusal, busy, onCancel, onConfirm }) {
  const { t } = useAudienceTranslation(["formBuilder", "common"]);
  return (
    <Modal
      open
      size="lg"
      onClose={onCancel}
      title={t("formBuilder:publishWithoutTranslations")}
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            {t("common:cancel")}
          </Button>
          <Button loading={busy} disabled={busy} onClick={onConfirm}>
            {t("formBuilder:publishAnyway")}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-slate-700">{refusal.message}</p>
      <p className="mb-3 text-xs text-muted-foreground">{t("formBuilder:publishWithoutTranslationsHint")}</p>
      <MissingTexts items={refusal.items} />
    </Modal>
  );
}

// The refusal's texts, when a submit was refused for missing translations.
export const untranslatedOf = (error) => (error?.code === "form.translations_missing" ? { message: error.message, items: error.data?.missing ?? [] } : null);
