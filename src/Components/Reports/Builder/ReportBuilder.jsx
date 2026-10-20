import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Blocks,
  Columns3,
  Filter,
  FolderOpen,
  Play,
  Plus,
  Save,
  Sigma,
  X,
} from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Spinner } from "@/Components/Common/Spinner";
import { DragGrip, moveItem, useDragReorder } from "@/Components/Common/dragReorder";
import { reportBuilderApi } from "@/Services/Reports/reportBuilder.api";
import { rowsOf } from "@/Services/Epurse/onboarding.api";
import { notifications } from "@/Utils/Lib/notifications";
import { ExportButtons, glassCard } from "../Shared/reportShared";
import {
  allComplete,
  conditionsIn,
  definitionOf,
  newAggregate,
  newSort,
  stateOf,
} from "./builderShared";
import { FilterGroup } from "./FilterBuilder";
import { MyReports, SaveTemplateDialog } from "./Templates";
import { RunResults, optionLabelsOf, runExporter } from "./RunResults";
import { usePagePermission } from "@/Hooks/usePermission";

const aggKey = (a) => (a.field ? `${a.fn}:${a.field}` : a.fn);

// Selected keys as chips the user drags to reorder, plus a picker for the
// rest (scales to a report's 40-odd fields better than a long checklist).
function ChipList({ keys, fields, onChange, addLabel }) {
  const { t } = useTranslation("builder");
  const drag = useDragReorder((from, to) => onChange(moveItem(keys, from, to)), {
    horizontal: true,
  });
  const label = (key) => fields.find((f) => f.key === key)?.label ?? key;
  const rest = fields.filter((f) => !keys.includes(f.key));
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {keys.map((key, i) => (
        <span
          key={key}
          {...drag.rowProps(i)}
          className={`flex items-center gap-0.5 rounded-full border border-border bg-card py-0.5 pl-0.5 pr-1 text-xs font-semibold ${drag.rowClass(i)}`}
        >
          <DragGrip label={t("dragToMove")} {...drag.gripProps(i)} />
          {label(key)}
          <button
            type="button"
            aria-label={t("remove")}
            onClick={() => onChange(keys.filter((k) => k !== key))}
            className="rounded-full p-0.5 text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <X size={12} />
          </button>
        </span>
      ))}
      {rest.length > 0 && (
        <div className="w-48">
          <FilterSelect
            size="sm"
            value=""
            onChange={(key) => key && onChange([...keys, key])}
            options={[
              { value: "", label: addLabel },
              ...rest.map((f) => ({ value: f.key, label: f.label })),
            ]}
          />
        </div>
      )}
    </div>
  );
}

function Section({ icon: Icon, title, hint, children }) {
  return (
    <div className="grid gap-2 border-t border-border pt-3 first:border-t-0 first:pt-0">
      <p className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-600">
        <Icon size={13} className="text-primary" /> {title}
        {hint && (
          <span className="font-semibold normal-case tracking-normal text-muted-foreground">
            · {hint}
          </span>
        )}
      </p>
      {children}
    </div>
  );
}

// REPORTS > Report Builder (menu 211): any source, with the columns,
// filters, sort and totals the user picks; previewed as a paged table,
// downloaded as Excel / CSV / PDF, saved as a report (Add), changed or
// deleted by its owner (Edit / Delete).
export function ReportBuilder() {
  const { t } = useTranslation("builder");
  const can = usePagePermission();
  const [sources, setSources] = useState(null);
  const [load, setLoad] = useState(null); // { source, definition, template } to open next
  const [meta, setMeta] = useState(null);
  const [state, setState] = useState(null);
  const [template, setTemplate] = useState(null);
  const [runDef, setRunDef] = useState(null);
  const [running, setRunning] = useState(false);
  const [dialog, setDialog] = useState("");

  useEffect(() => {
    reportBuilderApi
      .sources()
      .then((r) => {
        const list = rowsOf(r);
        setSources(list);
        if (list[0]) setLoad({ source: list[0].key, definition: { source: list[0].key } });
      })
      .catch((e) => {
        setSources([]);
        notifications.error(e.message);
      });
  }, []);

  // Open a report: its fields, then the definition on them; it runs at once
  // when nothing is left to fill in (User Activity first needs a user).
  useEffect(() => {
    if (!load) return undefined;
    let cancelled = false;
    setMeta(null);
    setRunDef(null);
    reportBuilderApi
      .fields({ source: load.source })
      .then((r) => {
        if (cancelled) return;
        const m = rowsOf(r)[0];
        const next = stateOf(load.definition, m);
        setMeta(m);
        setState(next);
        setTemplate(load.template ?? null);
        if (allComplete(next.filters)) setRunDef(definitionOf(next));
      })
      .catch((e) => !cancelled && notifications.error(e.message));
    return () => {
      cancelled = true;
    };
  }, [load]);

  const fields = useMemo(() => meta?.fields ?? [], [meta]);
  const set = (patch) => setState((s) => ({ ...s, ...patch }));
  const optionLabels = useMemo(() => optionLabelsOf(fields), [fields]);

  // Sorting is on a shown field in rows mode, or a group / total in totals mode.
  const sortOptions = useMemo(() => {
    if (!state) return [];
    if (state.mode === "rows")
      return fields
        .filter((f) => f.sortable !== false)
        .map((f) => ({ value: f.key, label: f.label }));
    const label = (key) => fields.find((f) => f.key === key)?.label ?? key;
    return [
      ...state.groupBy.map((key) => ({ value: key, label: label(key) })),
      ...state.aggregates.map((a) => ({
        value: aggKey(a),
        label: a.field ? `${t(`fn_${a.fn}`)}: ${label(a.field)}` : t("fn_rows"),
      })),
    ];
  }, [state, fields, t]);

  const definition = useMemo(() => {
    if (!state || !meta) return null;
    const allowed = new Set(sortOptions.map((o) => o.value));
    return definitionOf({ ...state, sort: state.sort.filter((s) => allowed.has(s.field)) });
  }, [state, meta, sortOptions]);

  const problem = !state
    ? "loading"
    : state.mode === "rows" && state.columns.length === 0
      ? "noColumns"
      : state.mode === "totals" && state.groupBy.length === 0 && state.aggregates.length === 0
        ? "noTotals"
        : !allComplete(state.filters)
          ? "incomplete"
          : "";

  const run = () => setRunDef(definition);

  const aggFields = fields.filter((f) => f.aggregates?.length);
  const groupable = fields.filter((f) => f.groupable !== false);

  return (
    <div className="pb-8 pt-4">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-800">
            <Blocks size={22} className="text-primary" /> {t("title_builder")}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle_builder")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={FolderOpen}
            onClick={() => setDialog("saved")}
          >
            {t("myReports")}
          </Button>
          {(can("Add") || (template?.is_owner && can("Edit"))) && (
            <Button
              variant="secondary"
              size="sm"
              icon={Save}
              disabled={!definition || Boolean(problem && problem !== "incomplete")}
              onClick={() => setDialog("save")}
            >
              {t("saveReport")}
            </Button>
          )}
        </div>
      </div>

      {sources && sources.length === 0 && (
        <p className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          {t("noSources")}
        </p>
      )}
      {sources?.length > 0 && (
        <div className="mb-4 grid gap-4 rounded-2xl p-4" style={glassCard}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="w-full sm:w-64">
              <FilterSelect
                value={load?.source ?? ""}
                onChange={(source) =>
                  source !== load?.source && setLoad({ source, definition: { source } })
                }
                options={sources.map((s) => ({
                  value: s.key,
                  label: s.group_label && s.group_label !== s.label ? `${s.group_label} › ${s.label}` : s.label,
                }))}
              />
            </div>
            {template && (
              <span className="flex items-center gap-1 rounded-full bg-[var(--primary-light)] py-1 pl-3 pr-1 text-xs font-bold text-primary">
                {template.name}
                {!template.is_owner && (
                  <span className="font-semibold opacity-70">· {template.owner_name}</span>
                )}
                <button
                  type="button"
                  aria-label={t("closeTemplate")}
                  title={t("closeTemplate")}
                  onClick={() => setTemplate(null)}
                  className="rounded-full p-0.5 hover:bg-white/60"
                >
                  <X size={12} />
                </button>
              </span>
            )}
            {state && (
              <SegmentedSwitch
                className="sm:ml-auto"
                value={state.mode}
                onChange={(mode) =>
                  set({
                    mode,
                    ...(mode === "totals" && !state.aggregates.length
                      ? { aggregates: [newAggregate()] }
                      : {}),
                  })
                }
                options={[
                  { value: "rows", label: t("modeRows") },
                  { value: "totals", label: t("modeTotals") },
                ]}
              />
            )}
          </div>

          {!state || !meta ? (
            <div className="flex justify-center p-4">
              <Spinner size={18} />
            </div>
          ) : (
            <>
              {state.mode === "rows" ? (
                <Section icon={Columns3} title={t("columns")} hint={t("columnsHint")}>
                  <ChipList
                    keys={state.columns}
                    fields={fields}
                    onChange={(columns) => set({ columns })}
                    addLabel={t("addColumn")}
                  />
                </Section>
              ) : (
                <Section icon={Sigma} title={t("totals")} hint={t("totalsHint")}>
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="w-20 text-xs font-bold text-muted-foreground">
                        {t("groupBy")}
                      </span>
                      <ChipList
                        keys={state.groupBy}
                        fields={groupable}
                        onChange={(groupBy) => set({ groupBy })}
                        addLabel={t("addGroupBy")}
                      />
                    </div>
                    {state.aggregates.map((a) => {
                      const field = aggFields.find((f) => f.key === a.field);
                      const fns = field ? field.aggregates : ["count"];
                      const update = (patch) =>
                        set({
                          aggregates: state.aggregates.map((x) =>
                            x.id === a.id ? { ...x, ...patch } : x,
                          ),
                        });
                      return (
                        <div key={a.id} className="flex flex-wrap items-center gap-2">
                          <span className="w-20 text-xs font-bold text-muted-foreground">
                            {t("total")}
                          </span>
                          <div className="w-40">
                            <FilterSelect
                              size="sm"
                              value={a.fn}
                              onChange={(fn) => update({ fn })}
                              options={fns.map((fn) => ({ value: fn, label: t(`fn_${fn}`) }))}
                            />
                          </div>
                          <div className="w-56">
                            <FilterSelect
                              size="sm"
                              value={a.field}
                              onChange={(key) => {
                                const next = aggFields.find((f) => f.key === key);
                                update({
                                  field: key,
                                  fn: next
                                    ? next.aggregates.includes(a.fn)
                                      ? a.fn
                                      : next.aggregates[0]
                                    : "count",
                                });
                              }}
                              options={[
                                { value: "", label: t("fn_rows") },
                                ...aggFields.map((f) => ({ value: f.key, label: f.label })),
                              ]}
                            />
                          </div>
                          <ActionIconButton
                            label={t("remove")}
                            intent="delete"
                            icon={X}
                            onClick={() =>
                              set({ aggregates: state.aggregates.filter((x) => x.id !== a.id) })
                            }
                          />
                        </div>
                      );
                    })}
                    <div>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={Plus}
                        onClick={() => set({ aggregates: [...state.aggregates, newAggregate()] })}
                      >
                        {t("addTotal")}
                      </Button>
                    </div>
                  </div>
                </Section>
              )}

              <Section
                icon={Filter}
                title={t("filters")}
                hint={t("filtersCount", { count: conditionsIn(state.filters) })}
              >
                <FilterGroup
                  source={state.source}
                  meta={meta}
                  group={state.filters}
                  total={conditionsIn(state.filters)}
                  onChange={(filters) => set({ filters })}
                />
              </Section>

              <Section
                icon={ArrowDownAZ}
                title={t("sort")}
                hint={state.sort.length ? "" : t("sortDefault")}
              >
                {state.sort.map((s) => {
                  const update = (patch) =>
                    set({ sort: state.sort.map((x) => (x.id === s.id ? { ...x, ...patch } : x)) });
                  return (
                    <div key={s.id} className="flex flex-wrap items-center gap-2">
                      <div className="w-56">
                        <FilterSelect
                          size="sm"
                          value={s.field}
                          onChange={(field) => update({ field })}
                          options={sortOptions}
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        icon={s.dir === "asc" ? ArrowUpAZ : ArrowDownAZ}
                        onClick={() => update({ dir: s.dir === "asc" ? "desc" : "asc" })}
                      >
                        {t(`dir_${s.dir}`)}
                      </Button>
                      <ActionIconButton
                        label={t("remove")}
                        intent="delete"
                        icon={X}
                        onClick={() => set({ sort: state.sort.filter((x) => x.id !== s.id) })}
                      />
                    </div>
                  );
                })}
                <div>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={Plus}
                    disabled={!sortOptions.length}
                    onClick={() => set({ sort: [...state.sort, newSort(sortOptions[0].value)] })}
                  >
                    {t("addSort")}
                  </Button>
                </div>
              </Section>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
                <div className="flex items-center gap-3">
                  <Button icon={Play} disabled={Boolean(problem)} loading={running} onClick={run}>
                    {t("run")}
                  </Button>
                  {problem && (
                    <span className="text-xs font-semibold text-amber-700">
                      {t(`problem_${problem}`)}
                    </span>
                  )}
                </div>
                <ExportButtons disabled={!runDef} exportFile={runExporter(runDef, template?.name ?? sources?.find((s) => s.key === runDef?.source)?.label, optionLabels)} />
              </div>
            </>
          )}
        </div>
      )}

      <RunResults body={runDef} title={template?.name ?? t("preview")} optionLabels={optionLabels} maxPageSize={meta?.limits?.max_page_size} onRunning={setRunning} />

      <MyReports
        open={dialog === "saved"}
        canCopy={can("Add")}
        canDelete={can("Delete")}
        onClose={() => setDialog("")}
        onOpen={(tpl) => {
          setDialog("");
          setLoad({ source: tpl.source, definition: tpl.definition, template: tpl });
        }}
      />
      <SaveTemplateDialog
        open={dialog === "save"}
        onClose={() => setDialog("")}
        definition={definition}
        current={template}
        canAdd={can("Add")}
        canEdit={can("Edit")}
        onSaved={(saved) => {
          setDialog("");
          if (saved) setTemplate(saved);
        }}
      />
    </div>
  );
}
