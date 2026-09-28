import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownUp, Download, UserRoundSearch } from "lucide-react";
import { DataTable } from "@/Components/Common/DataTable";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { RowActions } from "@/Components/Common/RowActions";
import { Spinner } from "@/Components/Common/Spinner";
import { userActivityApi } from "@/Services/Reports/userActivity.api";
import { saveBlob } from "@/Services/api/fileTransfer";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { PERIODS, ROLES, RoleBadge, atIst, rangeLabel, recordText } from "./activityFormat";
import { ActivityDetail } from "./ActivityDetail";

const glassCard = { background: "var(--glass-bg)", backdropFilter: "blur(16px)", border: "1px solid var(--glass-border)", boxShadow: "var(--glass-shadow)" };
const dateInput = "rounded-lg border px-2.5 py-1.5 text-xs";

// Reports > User Activity (menu 106, View only): everything one admin user
// did in the maker-checker flow over a period — as maker, checker, or
// directly (Self) — with a summary, the rows, each row's detail and an
// Excel/CSV download of the same filters.
export function UserActivity() {
  const { t } = useTranslation(["reports", "common"]);
  const [users, setUsers] = useState([]);
  const [entities, setEntities] = useState([]);
  const [filters, setFilters] = useState({ user_id: "", period: "THIS_MONTH", from: "", to: "", role: "", group: "", entity: "" });
  const [summary, setSummary] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("desc");
  const [openId, setOpenId] = useState(null);
  const [exporting, setExporting] = useState("");

  useEffect(() => {
    userActivityApi
      .users({})
      .then((r) => setUsers(rowsOf(r)))
      .catch((error) => notifications.error(error.message));
    userActivityApi
      .entities({})
      .then((r) => setEntities(rowsOf(r)))
      .catch(() => setEntities([]));
  }, []);

  // The filter body shared by summary, list and export — null until a user
  // is picked and the period is complete (Custom needs a From day).
  const body = useMemo(() => {
    const f = filters;
    if (!f.user_id || (f.period === "CUSTOM" && !f.from)) return null;
    return {
      user_id: Number(f.user_id),
      period: f.period,
      ...(f.period === "CUSTOM" ? { from: f.from, ...(f.to ? { to: f.to } : {}) } : {}),
      ...(f.role ? { roles: [f.role] } : {}),
      ...(f.group ? { groups: [f.group] } : {}),
      ...(f.entity ? { entities: [f.entity] } : {}),
    };
  }, [filters]);
  const bodyKey = JSON.stringify(body);

  useEffect(() => {
    if (!body) {
      setSummary(null);
      return;
    }
    let cancelled = false;
    userActivityApi
      .summary(body)
      .then((r) => !cancelled && setSummary(rowsOf(r)[0] ?? null))
      .catch((error) => !cancelled && notifications.error(error.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bodyKey]);

  const load = useCallback(async () => {
    const current = JSON.parse(bodyKey);
    if (!current) {
      setRows([]);
      setPagination({});
      return;
    }
    setLoading(true);
    try {
      const response = await userActivityApi.list({ ...current, page, limit, sort_by: sortBy });
      setRows(rowsOf(response));
      setPagination(response?.pagination ?? {});
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setLoading(false);
    }
  }, [bodyKey, page, limit, sortBy]);
  useEffect(() => {
    void load();
  }, [load]);

  const set = (patch) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  };

  const download = async (format) => {
    setExporting(format);
    try {
      const { blob, fileName } = await userActivityApi.export({ ...body, sort_by: sortBy, format });
      saveBlob(blob, fileName);
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setExporting("");
    }
  };

  const selectedUser = users.find((u) => String(u.user_id) === String(filters.user_id));
  const groups = [...new Map(entities.map((e) => [e.group, e.group_name])).entries()];
  const entityOptions = entities.filter((e) => !filters.group || e.group === filters.group);
  const roleCount = (code) => summary?.by_role?.find((r) => r.code === code)?.count ?? 0;

  const columns = [
    {
      key: "at",
      sortable: false,
      label: (
        <button type="button" onClick={() => { setSortBy((s) => (s === "desc" ? "asc" : "desc")); setPage(1); }} className="inline-flex items-center gap-1" title={t(sortBy === "desc" ? "newestFirst" : "oldestFirst")}>
          {t("dateTime")} <ArrowDownUp size={11} />
        </button>
      ),
      render: (row) => <span className="whitespace-nowrap text-xs">{atIst(row.at)}</span>,
    },
    { key: "role", label: t("role"), render: (row) => <RoleBadge role={row.role} name={row.role_name} /> },
    { key: "action", label: t("action"), render: (row) => <span className="text-xs font-semibold">{row.action_name}</span> },
    { key: "group", label: t("area"), render: (row) => <span className="text-xs">{row.group_name}</span> },
    { key: "entity", label: t("recordType"), render: (row) => <span className="text-xs">{row.entity_name}</span> },
    {
      key: "record",
      label: t("record"),
      align: "left",
      render: (row) => (
        <button type="button" onClick={() => setOpenId(row.activity_id)} className="text-left text-xs font-semibold text-primary hover:underline">
          {recordText(row)}
        </button>
      ),
    },
    { key: "inst_profile_name", label: t("institution"), render: (row) => <span className="text-xs">{row.inst_profile_name ?? "-"}</span> },
    // Only when someone else made the change (a checker's rows).
    { key: "maker", label: t("maker"), render: (row) => (row.maker && row.maker !== selectedUser?.user_name ? <span className="text-xs">{row.maker}</span> : "") },
    { key: "actions", label: t("common:actions"), sortable: false, render: (row) => <RowActions buttons={{ view: true }} onView={() => setOpenId(row.activity_id)} /> },
  ];

  return (
    <div className="pt-1 pb-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-800">{t("title")}</h1>
          <p className="mt-1 text-xs font-medium text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {["XLSX", "CSV"].map((format) => (
            <button
              key={format}
              type="button"
              disabled={!body || Boolean(exporting)}
              onClick={() => void download(format)}
              className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold text-slate-600 hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {exporting === format ? <Spinner size={12} /> : <Download size={13} />} {t(format === "XLSX" ? "excel" : "csv")}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-3 space-y-3 rounded-2xl p-3" style={glassCard}>
        <div className="flex flex-wrap items-center gap-2">
          <FilterSelect
            size="sm"
            className="w-72"
            value={filters.user_id}
            onChange={(v) => set({ user_id: v })}
            options={[
              { value: "", label: t("pickUser") },
              ...users.map((u) => ({
                value: String(u.user_id),
                searchText: `${u.user_name} ${u.inst_profile_name ?? ""} ${u.user_profile_name ?? ""}`,
                label: (
                  <span className="truncate">
                    <b>{u.user_name}</b> <span className="text-muted-foreground">· {u.inst_profile_name}{u.status !== 1 && u.status_name ? ` · ${u.status_name}` : ""}</span>
                  </span>
                ),
              })),
            ]}
          />
          <FilterSelect size="sm" className="w-36" value={filters.role} onChange={(v) => set({ role: v })} options={[{ value: "", label: t("allRoles") }, ...ROLES.map((r) => ({ value: r, label: t(`role_${r}`) }))]} />
          <FilterSelect size="sm" className="w-48" value={filters.group} onChange={(v) => set({ group: v, entity: "" })} options={[{ value: "", label: t("allAreas") }, ...groups.map(([code, name]) => ({ value: code, label: name }))]} />
          <FilterSelect size="sm" className="w-56" value={filters.entity} onChange={(v) => set({ entity: v })} options={[{ value: "", label: t("allRecordTypes") }, ...entityOptions.map((e) => ({ value: e.entity, label: e.entity_name }))]} />
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODS.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={filters.period === p}
              onClick={() => set({ period: p })}
              className={`rounded-full border px-3 py-1 text-xs font-bold transition-colors ${filters.period === p ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground hover:border-primary hover:text-primary"}`}
            >
              {t(`period_${p}`)}
            </button>
          ))}
          {filters.period === "CUSTOM" && (
            <span className="ml-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {t("from")} <input type="date" value={filters.from} onChange={(e) => set({ from: e.target.value })} className={dateInput} />
              {t("to")} <input type="date" value={filters.to} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value })} className={dateInput} />
            </span>
          )}
        </div>
      </div>

      {!body ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl p-10 text-center text-sm text-muted-foreground" style={glassCard}>
          <UserRoundSearch size={28} />
          {filters.user_id ? t("pickFromDay") : t("pickUserHint")}
        </div>
      ) : (
        <>
          {summary && (
            <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl p-3" style={glassCard}>
              <span className="mr-2 text-xs text-muted-foreground">
                {t(`period_${summary.range?.period ?? filters.period}`)}: <b className="text-slate-700">{rangeLabel(summary.range)}</b>
              </span>
              <button type="button" onClick={() => set({ role: "" })} className={`rounded-xl border px-3 py-1.5 text-left ${!filters.role ? "border-primary" : ""}`}>
                <span className="block text-[10px] font-bold uppercase text-muted-foreground">{t("total")}</span>
                <span className="text-lg font-black tabular-nums">{summary.total ?? 0}</span>
              </button>
              {ROLES.map((r) => (
                <button key={r} type="button" onClick={() => set({ role: filters.role === r ? "" : r })} className={`rounded-xl border px-3 py-1.5 text-left ${filters.role === r ? "border-primary" : ""}`}>
                  <span className="block text-[10px] font-bold uppercase text-muted-foreground">{t(`role_${r}`)}</span>
                  <span className="text-lg font-black tabular-nums">{roleCount(r)}</span>
                </button>
              ))}
              {summary.by_entity?.length > 0 && (
                <span className="ml-auto flex flex-wrap gap-1">
                  {summary.by_entity.slice(0, 4).map((e) => (
                    <button key={e.entity} type="button" onClick={() => set({ group: e.group, entity: e.entity })} className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold hover:text-primary">
                      {e.entity_name} · {e.count}
                    </button>
                  ))}
                </span>
              )}
            </div>
          )}
          <div className="overflow-hidden rounded-2xl" style={glassCard}>
            <DataTable
              columns={columns}
              rows={rows}
              rowKey={(row) => row.activity_id}
              isLoading={loading}
              title={t("title")}
              emptyTitle={t("noActivity")}
              serverPagination={{ page, totalPages: pagination.totalPages ?? 1, totalRecords: pagination.totalRecords ?? rows.length, onPageChange: setPage, limit, onLimitChange: (n) => { setLimit(Math.min(n, 200)); setPage(1); } }}
              serverSorted
              bare
            />
          </div>
        </>
      )}

      {openId && <ActivityDetail activityId={openId} onClose={() => setOpenId(null)} />}
    </div>
  );
}
