import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/Components/Common/Button";
import { CountryMultiSelect } from "@/Components/Common/CountryMultiSelect";
import { DateInput } from "@/Components/Common/DateInput";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Modal } from "@/Components/Common/Modal";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { InstitutionField, inputClass, labelClass } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { useCountries } from "@/Hooks/Master/masterHooks";
import { useAuth } from "@/Hooks/useAuth";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { amlBlacklistApi } from "@/Services/InnoAML/aml.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { countryNameOf } from "../Shared/amlShared";
import { BIRTH_DATE, ENTITY_TYPES, IDENTIFIER_TYPES, MAX_ALIASES, MAX_IDENTIFIERS, REASONS, identifierProblem } from "./blacklistShared";

const tomorrow = () => new Date(Date.now() + 864e5).toISOString().slice(0, 10);
const lines = (text) =>
  String(text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

// Add or change one blacklist entry. Nothing is screened until a checker
// approves it (with Self on the menu it applies at once). Names may be in
// any script: an Arabic name is matched against Latin spellings too.
export function BlacklistForm({ editing, onClose, onSaved }) {
  const { t } = useTranslation(["aml", "common"]);
  const canChoose = useCanChooseInstitution();
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const { countries } = useCountries();
  const [form, setForm] = useState(() => ({
    inst_profile_id: editing?.inst_profile_id ?? (canChoose ? "" : (myInstitution ?? "")),
    entity_type: editing?.entity_type ?? "PERSON",
    name: editing?.name ?? "",
    aliases: (editing?.aliases ?? []).join("\n"),
    birth_date: editing?.birth_date ?? "",
    // Stored as ISO codes; the picker works with English country names.
    countries: (editing?.countries ?? []).map((c) => countryNameOf(c, "en")),
    identifiers: (editing?.identifiers ?? []).map((i) => ({ type: i.type ?? "OTHER", number: i.number ?? "", country: i.country ?? "" })),
    reason: editing?.reason ?? "",
    remarks: editing?.remarks ?? "",
    expires_on: editing?.expires_on ?? "",
    comment: "",
  }));
  const [saving, setSaving] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const setIdentifier = (index, patch) => setForm((f) => ({ ...f, identifiers: f.identifiers.map((i, j) => (j === index ? { ...i, ...patch } : i)) }));
  const person = form.entity_type === "PERSON";

  const problem = () => {
    if (canChoose && !editing && !form.inst_profile_id) return t("aml:selectInstitutionFirst");
    if (!form.name.trim()) return t("aml:nameRequired");
    if (!form.reason) return t("aml:reasonRequiredField");
    if (lines(form.aliases).length > MAX_ALIASES) return t("aml:tooManyAliases", { max: MAX_ALIASES });
    if (person && form.birth_date.trim() && !BIRTH_DATE.test(form.birth_date.trim())) return t("aml:birthDateFormat");
    const bad = form.identifiers.map(identifierProblem).find(Boolean);
    if (bad) return t(`aml:${bad}`);
    return null;
  };

  const save = async () => {
    const issue = problem();
    if (issue) {
      notifications.error(issue);
      return;
    }
    setSaving(true);
    try {
      const body = {
        entity_type: form.entity_type,
        name: form.name.trim(),
        aliases: lines(form.aliases),
        birth_date: person && form.birth_date.trim() ? form.birth_date.trim() : null,
        countries: form.countries,
        identifiers: form.identifiers.map((i) => ({ type: i.type, number: i.number.trim(), ...(i.country ? { country: i.country } : {}) })),
        reason: form.reason,
        remarks: form.remarks.trim(),
        expires_on: form.expires_on || null,
        comment: form.comment.trim(),
        ...(editing ? { id: editing.id } : canChoose ? { inst_profile_id: Number(form.inst_profile_id) } : {}),
      };
      const response = await (editing ? amlBlacklistApi.edit : amlBlacklistApi.add)(body);
      notifications.success(apiMessage(response, t("aml:blacklistSubmitted")));
      onSaved();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="xl"
      title={editing ? t("aml:editBlacklistEntry") : t("aml:addBlacklistEntry")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("common:cancel")}
          </Button>
          <Button loading={saving} disabled={saving} onClick={() => void save()}>
            {t("aml:submitForApproval")}
          </Button>
        </>
      }
    >
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        {!editing && <InstitutionField value={form.inst_profile_id} onChange={set("inst_profile_id")} />}
        <div>
          <p className={labelClass}>{t("aml:entityType")}</p>
          <SegmentedSwitch className="mt-1.5" value={form.entity_type} onChange={set("entity_type")} options={ENTITY_TYPES.map((v) => ({ value: v, label: t(`aml:entity_${v}`) }))} />
        </div>
        <label className={labelClass}>
          {t("aml:name")} <span className="text-red-500">*</span>
          <input dir="auto" value={form.name} maxLength={300} onChange={(e) => set("name")(e.target.value)} className={inputClass} placeholder="Khalid Omar Al-Farouq" />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("aml:anyScriptHint")}</span>
        </label>
        <label className={labelClass}>
          {t("aml:blReason")} <span className="text-red-500">*</span>
          <FilterSelect className="mt-1.5" value={form.reason} onChange={set("reason")} options={[{ value: "", label: t("aml:selectReason") }, ...REASONS.map((r) => ({ value: r, label: t(`aml:blReason_${r}`) }))]} />
        </label>
        <label className={labelClass}>
          {t("aml:aliases")}
          <textarea dir="auto" value={form.aliases} onChange={(e) => set("aliases")(e.target.value)} className={`${inputClass} min-h-20`} placeholder={"Abu Omar\nKhaled Farouk"} />
          <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("aml:aliasesHint", { max: MAX_ALIASES })}</span>
        </label>
        <div className="grid content-start gap-4">
          {person && (
            <label className={labelClass}>
              {t("aml:birthDate")}
              <input value={form.birth_date} maxLength={10} onChange={(e) => set("birth_date")(e.target.value.replace(/[^\d-]/g, ""))} className={inputClass} placeholder="1980-05-01" />
              <span className="mt-1 block text-[11px] font-normal text-muted-foreground">{t("aml:birthDateHint")}</span>
            </label>
          )}
          <label className={labelClass}>
            {t("aml:blExpiresOn")}
            <DateInput className={inputClass} value={form.expires_on} min={tomorrow()} onChange={(e) => set("expires_on")(e.target.value)} placeholder={t("aml:neverExpires")} />
          </label>
        </div>
        <label className={`${labelClass} md:col-span-2`}>
          {t("aml:countries")}
          <CountryMultiSelect className="mt-1.5" countries={countries} value={form.countries} onChange={set("countries")} placeholder={t("aml:selectCountries")} />
        </label>

        <div className="md:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <p className={labelClass}>{t("aml:identifiers")}</p>
            {form.identifiers.length < MAX_IDENTIFIERS && (
              <button type="button" onClick={() => setForm((f) => ({ ...f, identifiers: [...f.identifiers, { type: "PHONE", number: "", country: "" }] }))} className="flex items-center gap-1 text-xs font-bold text-primary">
                <Plus size={13} /> {t("aml:addIdentifier")}
              </button>
            )}
          </div>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{t("aml:identifiersHint")}</p>
          {form.identifiers.length > 0 && (
            <ul className="mt-2 space-y-2">
              {form.identifiers.map((i, index) => {
                const issue = i.number.trim() ? identifierProblem(i) : null;
                return (
                  <li key={index} className="grid gap-2 rounded-xl border p-2 sm:grid-cols-[11rem_1fr_11rem_auto] sm:items-start">
                    <FilterSelect size="sm" value={i.type} onChange={(v) => setIdentifier(index, { type: v })} options={IDENTIFIER_TYPES.map((v) => ({ value: v, label: t(`aml:idType_${v}`) }))} />
                    <span>
                      <input value={i.number} maxLength={100} onChange={(e) => setIdentifier(index, { number: e.target.value })} placeholder={i.type === "EMAIL" ? "name@example.com" : i.type === "PHONE" ? "+966 55 123 4567" : "K1234567"} className="w-full rounded-lg border px-2.5 py-1.5 text-sm" />
                      {issue && <span className="mt-0.5 block text-[11px] font-semibold text-red-600">{t(`aml:${issue}`)}</span>}
                    </span>
                    <FilterSelect
                      size="sm"
                      value={i.country}
                      onChange={(v) => setIdentifier(index, { country: v })}
                      options={[{ value: "", label: t("aml:anyCountry") }, ...countries.map((c) => ({ value: c.name, label: c.name }))]}
                    />
                    <button type="button" aria-label={t("common:delete")} onClick={() => setForm((f) => ({ ...f, identifiers: f.identifiers.filter((_, j) => j !== index) }))} className="justify-self-end rounded-lg p-1.5 text-red-600 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <label className={labelClass}>
          {t("aml:remarks")}
          <textarea value={form.remarks} onChange={(e) => set("remarks")(e.target.value)} className={`${inputClass} min-h-16`} />
        </label>
        <label className={labelClass}>
          {t("aml:commentForChecker")}
          <textarea value={form.comment} maxLength={2000} onChange={(e) => set("comment")(e.target.value)} className={`${inputClass} min-h-16`} placeholder={t("aml:commentForCheckerHint")} />
        </label>
      </div>
    </Modal>
  );
}
