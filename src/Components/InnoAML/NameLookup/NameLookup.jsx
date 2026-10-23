import { ListTable } from "@/Components/Common/ListView";
import { useServerList } from "@/Hooks/useServerList";
import { PageTitle } from "@/Components/Common/PageTitle";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { CountryMultiSelect } from "@/Components/Common/CountryMultiSelect";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { useCountries } from "@/Hooks/Master/masterHooks";
import { useAuth } from "@/Hooks/useAuth";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { amlLookupApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { InstitutionField, inputClass, labelClass } from "@/Components/GlobalSettings/Notifications/notificationShared";
import { EffectiveResult, glassCard, partyLabel, useInstitutionScope, when } from "../Shared/amlShared";
import { ScreeningDetail, ScreeningDetailModal } from "../Shared/ScreeningDetail";
import { AdverseMediaLookup } from "../AdverseMedia/AdverseMedia";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";

import { Button } from "@/Components/Common/Button";
const empty = (inst) => ({ inst_profile_id: inst ?? "", name: "", entity_type: "", birth_date: "", countries: [], gender: "", reason: "" });

// InnoAML > AML Screening > Name Lookup (menu 103): screen a name that isn't
// a customer (e.g. a payment beneficiary) against the platform lists and
// the institution's own. Each lookup is kept, with its reason.
export function NameLookup() {
  const { t } = useTranslation(["aml", "common"]);
  const can = usePagePermission("Name Lookup");
  const scope = useInstitutionScope();
  const myInstitution = useAuth((state) => state.user?.inst_profile_id);
  const [form, setForm] = useState(() => empty(myInstitution));
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState(null);
  // The screened name, reference, who screened, institution.
  const [openId, setOpenId] = useState(null);
  const { countries } = useCountries();
  // Lists screening, or the news (Adverse Media).
  const [view, setView] = useState("lists");

  const list = useServerList({ api: amlLookupApi.listPath, call: amlLookupApi.list });

  const load = list.reload;
  useLiveChannel(amlLookupApi.listPath, () => load());

  const screen = async (event) => {
    event.preventDefault();
    if (!form.name.trim()) {
      notifications.error(t("aml:nameRequired"));
      return;
    }
    setRunning(true);
    try {
      const body = {
        name: form.name.trim(),
        ...(form.entity_type ? { entity_type: form.entity_type } : {}),
        ...(form.birth_date.trim() ? { birth_date: form.birth_date.trim() } : {}),
        ...(form.countries.length ? { countries: form.countries } : {}),
        ...(form.gender ? { gender: form.gender } : {}),
        ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
        ...scope(form.inst_profile_id),
      };
      const response = await amlLookupApi.screen(body);
      notifications.success(apiMessage(response, t("aml:lookupDone")));
      setResult(rowsOf(response)[0] ?? null);
      load();
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setRunning(false);
    }
  };

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const columns = [
    { key: "screened_at", label: t("aml:screenedAt"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.screened_at)}</span> },
    { key: "name", label: t("aml:nameAndReason"), align: "left", render: (row) => <span dir="auto" className="font-semibold">{partyLabel(row)}</span> },
    { key: "inst_profile_name", label: t("aml:institution"), render: (row) => row.inst_profile_name ?? "-" },
    { key: "effective_score", label: t("aml:result"), render: (row) => <EffectiveResult row={row} /> },
    { key: "match_count", label: t("aml:matches"), render: (row) => row.match_count ?? 0 },
    { key: "screened_by", label: t("aml:screenedBy"), render: (row) => row.screened_by ?? "-" },
    { key: "actions", label: t("common:actions"), sortable: false, render: (row) => <RowActions buttons={{ view: true }} onView={() => setOpenId(row.id)} /> },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <PageTitle>{t("aml:lookupTitle")}</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">{t("aml:lookupSubtitle")}</p>
      </div>
      <SegmentedSwitch className="mb-4" value={view} onChange={setView} options={[{ value: "lists", label: t("aml:tabLists") }, { value: "media", label: t("aml:mediaTitle") }]} />
      {view === "media" ? (
        <AdverseMediaLookup />
      ) : (
        <>

      {can("Add") && (
        <form onSubmit={(e) => void screen(e)} className="mb-4 grid gap-x-4 gap-y-3 rounded-2xl p-4 md:grid-cols-3" style={glassCard}>
          <InstitutionField value={form.inst_profile_id} onChange={set("inst_profile_id")} />
          <label className={`${labelClass} md:col-span-2`}>
            {t("aml:name")} <span className="text-red-500">*</span>
            <input dir="auto" value={form.name} onChange={(e) => set("name")(e.target.value)} className={inputClass} placeholder="Osama bin Laden" />
          </label>
          <label className={labelClass}>
            {t("aml:entityType")}
            <FilterSelect
              className="mt-1.5"
              value={form.entity_type}
              onChange={set("entity_type")}
              options={[{ value: "", label: t("aml:entity_ANY") }, { value: "PERSON", label: t("aml:entity_PERSON") }, { value: "ORGANIZATION", label: t("aml:entity_ORGANIZATION") }]}
            />
          </label>
          <label className={labelClass}>
            {t("aml:birthDate")}
            <input value={form.birth_date} onChange={(e) => set("birth_date")(e.target.value)} className={inputClass} placeholder="1957 / 1957-03 / 1957-03-10" />
          </label>
          <label className={labelClass}>
            {t("aml:gender")}
            <FilterSelect className="mt-1.5" value={form.gender} onChange={set("gender")} options={[{ value: "", label: t("aml:anyGender") }, { value: "M", label: t("aml:male") }, { value: "F", label: t("aml:female") }]} />
          </label>
          <label className={labelClass}>
            {t("aml:countries")}
            <CountryMultiSelect className="mt-1.5" countries={countries} value={form.countries} onChange={set("countries")} placeholder={t("aml:selectCountries")} />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            {t("aml:reason")}
            <input value={form.reason} onChange={(e) => set("reason")(e.target.value)} className={inputClass} placeholder={t("aml:reasonPlaceholder")} />
          </label>
          <div className="flex justify-end md:col-span-3">
            <Button type="submit" disabled={running}>
              {running ? <Spinner size={13} /> : <Search size={14} />} {t("aml:screenName")}
            </Button>
          </div>
        </form>
      )}

      {result && (
        <div className="mb-4 rounded-2xl p-4" style={glassCard}>
          <ScreeningDetail screening={result} onChange={setResult} />
        </div>
      )}

      <ListTable list={list} columns={columns} rowKey={(row) => row.id} title={t("aml:pastLookups")} emptyTitle={t("aml:noLookups")} />
      {openId && <ScreeningDetailModal id={openId} lookup onClose={() => setOpenId(null)} onChanged={() => load()} />}
        </>
      )}
    </div>
  );
}
