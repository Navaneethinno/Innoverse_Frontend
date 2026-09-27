import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Search } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { useAuth } from "@/Hooks/useAuth";
import { useLiveChannel } from "@/Hooks/useLiveChannel";
import { usePagePermission } from "@/Hooks/usePermission";
import { amlLookupApi } from "@/Services/InnoAML/aml.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { apiMessage, notifications } from "@/Utils/Lib/notifications";
import { InstitutionField, inputClass, labelClass } from "@/Components/Epurse/NotificationCenter/notificationShared";
import { EffectiveResult, glassCard, partyLabel, useInstitutionScope, when } from "../../Shared/amlShared";
import { ScreeningDetail, ScreeningDetailModal } from "../../Shared/ScreeningDetail";

const splitList = (text) =>
  String(text ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
const empty = (inst) => ({ inst_profile_id: inst ?? "", name: "", entity_type: "", birth_date: "", countries: "", gender: "", reason: "" });

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
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [openId, setOpenId] = useState(null);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      if (!silent) setLoading(true);
      try {
        const response = await amlLookupApi.list({ page, limit });
        setRows(rowsOf(response));
        setPagination(response?.pagination ?? {});
      } catch (error) {
        notifications.error(error.message);
      } finally {
        setLoading(false);
      }
    },
    [page, limit],
  );
  useEffect(() => {
    void load();
  }, [load]);
  useLiveChannel(amlLookupApi.listPath, () => void load({ silent: true }));

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
        ...(splitList(form.countries).length ? { countries: splitList(form.countries) } : {}),
        ...(form.gender ? { gender: form.gender } : {}),
        ...(form.reason.trim() ? { reason: form.reason.trim() } : {}),
        ...scope(form.inst_profile_id),
      };
      const response = await amlLookupApi.screen(body);
      notifications.success(apiMessage(response, t("aml:lookupDone")));
      setResult(rowsOf(response)[0] ?? null);
      void load({ silent: true });
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setRunning(false);
    }
  };

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));
  const columns = [
    { key: "screened_at", label: t("aml:screenedAt"), render: (row) => <span className="whitespace-nowrap text-xs">{when(row.screened_at)}</span> },
    { key: "name", label: t("aml:nameAndReason"), align: "left", render: (row) => <span className="font-semibold">{partyLabel(row)}</span> },
    { key: "inst_profile_name", label: t("aml:institution"), render: (row) => row.inst_profile_name ?? "-" },
    { key: "effective_score", label: t("aml:result"), render: (row) => <EffectiveResult row={row} /> },
    { key: "match_count", label: t("aml:matches"), render: (row) => row.match_count ?? 0 },
    { key: "screened_by", label: t("aml:screenedBy"), render: (row) => row.screened_by ?? "-" },
    { key: "actions", label: t("common:actions"), sortable: false, render: (row) => <RowActions buttons={{ view: true }} onView={() => setOpenId(row.id)} /> },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3">
        <h1 className="text-xl font-black text-slate-800">{t("aml:lookupTitle")}</h1>
        <p className="mt-1 text-xs font-medium text-muted-foreground">{t("aml:lookupSubtitle")}</p>
      </div>

      {can("Add") && (
        <form onSubmit={(e) => void screen(e)} className="mb-4 grid gap-x-4 gap-y-3 rounded-2xl p-4 md:grid-cols-3" style={glassCard}>
          <InstitutionField value={form.inst_profile_id} onChange={set("inst_profile_id")} />
          <label className={`${labelClass} md:col-span-2`}>
            {t("aml:name")} <span className="text-red-500">*</span>
            <input value={form.name} onChange={(e) => set("name")(e.target.value)} className={inputClass} placeholder="Osama bin Laden" />
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
            <input value={form.countries} onChange={(e) => set("countries")(e.target.value)} className={inputClass} placeholder="Saudi Arabia, YE" />
          </label>
          <label className={`${labelClass} md:col-span-2`}>
            {t("aml:reason")}
            <input value={form.reason} onChange={(e) => set("reason")(e.target.value)} className={inputClass} placeholder={t("aml:reasonPlaceholder")} />
          </label>
          <div className="flex justify-end md:col-span-3">
            <button type="submit" disabled={running} className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground disabled:opacity-50">
              {running ? <Spinner size={13} /> : <Search size={14} />} {t("aml:screenName")}
            </button>
          </div>
        </form>
      )}

      {result && (
        <div className="mb-4 rounded-2xl p-4" style={glassCard}>
          <ScreeningDetail screening={result} onChange={setResult} />
        </div>
      )}

      <div className="overflow-hidden rounded-2xl" style={glassCard}>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          isLoading={loading}
          title={t("aml:pastLookups")}
          emptyTitle={t("aml:noLookups")}
          serverPagination={{ page, totalPages: pagination.totalPages ?? 1, totalRecords: pagination.totalRecords ?? rows.length, onPageChange: setPage, limit, onLimitChange: (n) => { setLimit(n); setPage(1); } }}
          serverSorted
          bare
        />
      </div>
      {openId && <ScreeningDetailModal id={openId} lookup onClose={() => setOpenId(null)} onChanged={() => void load({ silent: true })} />}
    </div>
  );
}
