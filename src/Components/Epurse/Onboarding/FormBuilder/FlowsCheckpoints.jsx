import { useState } from "react";
import { ChevronDown, GitBranch, Plus, Signpost, Trash2 } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { cn } from "@/Utils/Lib/cn";
import { inputClass } from "./FieldOptionsEditor";
import { ConditionRows } from "./ConditionRows";

// Two steps of the definition wizard (Admin handoff "onboarding flows and
// checkpoints"). A flow asks a group of sections only when its conditions
// hold; a checkpoint is a screen the customer sees after a section (or at
// the end), drawn by the app from its code.

const CODE = /^[A-Z0-9_]+$/;
const codeInput = (value) => value.toUpperCase().replace(/[^A-Z0-9_]/g, "");
export const END = "END";
const OUTCOMES = ["CONTINUE", "STOP", "WAIT", "SUBMIT"];
// EDIT goes back to a section; GUARDIAN_REQUEST sends the request to the
// parent/tutor (no section).
const ACTION_CODES = ["EDIT", "GUARDIAN_REQUEST"];
// SUBMIT only at the end; CONTINUE only after a section.
const outcomeAllowed = (outcome, at) => (at === END ? outcome !== "CONTINUE" : outcome !== "SUBMIT");

// One item of a list, closed to a summary line once saved, so a long list
// stays short.
function ItemCard({ icon: Icon, title, summary, invalid, startOpen, onRemove, readOnly, t, children }) {
  const [open, setOpen] = useState(startOpen);
  return (
    <div className={cn("rounded-2xl border bg-white/70", invalid && "border-amber-300")}>
      <div className="flex items-center gap-2 px-4 py-3">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)]">
            <Icon size={14} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-800">{title}</span>
            {!open && summary && <span className="block truncate text-xs text-muted-foreground">{summary}</span>}
          </span>
          <ChevronDown size={16} className={cn("shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </button>
        {!readOnly && (
          <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-red-600 hover:bg-red-50" aria-label={t("formBuilder:remove")}>
            <Trash2 size={14} />
          </button>
        )}
      </div>
      {open && <div className="flex flex-col gap-4 border-t px-4 py-4">{children}</div>}
    </div>
  );
}

function CodeName({ item, set, disabled, t, extra }) {
  return (
    <div className="grid gap-3 md:grid-cols-4">
      <label className="text-xs font-semibold text-slate-700">
        {t("formBuilder:code")}
        <input className={cn(inputClass, "font-mono uppercase", item.code && !CODE.test(item.code) && "border-amber-400")} disabled={disabled} placeholder="UNDER_AGE" value={item.code ?? ""} onChange={(e) => set({ code: codeInput(e.target.value) })} />
      </label>
      <label className="text-xs font-semibold text-slate-700 md:col-span-2">
        {t("formBuilder:ruleName")}
        <input className={inputClass} disabled={disabled} value={item.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
      </label>
      {extra}
    </div>
  );
}

// The draft's problems that start with "Flow" / "Checkpoint".
function StepProblems({ problems, prefix }) {
  const mine = (problems ?? []).map((p) => (typeof p === "string" ? p : (p?.message ?? ""))).filter((p) => p.toLowerCase().startsWith(prefix));
  if (!mine.length) return null;
  return (
    <ul className="list-disc rounded-xl border border-red-200 bg-red-50 px-4 py-2 pl-8 text-xs text-red-700">
      {mine.map((p, i) => (
        <li key={i}>{p}</li>
      ))}
    </ul>
  );
}

const Label = ({ children }) => <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{children}</p>;

// --- Flows ---------------------------------------------------------------

export function FlowsStep({ flows, onChange, fields, sections, readOnly, problems, t }) {
  const list = flows ?? [];
  const [fresh, setFresh] = useState(() => new Set());
  const setAt = (i, patch) => onChange(list.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  // A section belongs to at most one flow.
  const owner = new Map();
  list.forEach((f, i) => (f.sections ?? []).forEach((s) => !owner.has(s) && owner.set(s, i)));
  const sectionName = (key) => sections.find((s) => s.value === key)?.label ?? key;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("formBuilder:flowsStepHint")}</p>
      <StepProblems problems={problems} prefix="flow " />
      {!list.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("formBuilder:noFlows")}</p>}
      {list.map((flow, i) => {
        const set = (patch) => setAt(i, patch);
        const chosen = flow.sections ?? [];
        const inside = list.find((f) => f.code && f.code === flow.within);
        return (
          <ItemCard
            key={i}
            icon={GitBranch}
            t={t}
            readOnly={readOnly}
            startOpen={fresh.has(i)}
            invalid={!(flow.conditions ?? []).length || !chosen.length}
            title={[flow.code, flow.name].filter(Boolean).join(" · ") || t("formBuilder:flowN", { n: i + 1 })}
            summary={[inside && t("formBuilder:insideFlow", { flow: inside.code }), t("formBuilder:sectionsN", { count: chosen.length }), flow.enabled === false && t("formBuilder:disabled")].filter(Boolean).join(" · ")}
            onRemove={() => onChange(list.filter((_, j) => j !== i).map((f) => (f.within === flow.code ? { ...f, within: undefined } : f)))}
          >
            <CodeName
              item={flow}
              set={set}
              disabled={readOnly}
              t={t}
              extra={
                <label className="text-xs font-semibold text-slate-700">
                  {t("formBuilder:insideFlowLabel")}
                  <FilterSelect
                    className="mt-1.5"
                    disabled={readOnly}
                    value={flow.within ?? ""}
                    onChange={(v) => set({ within: v || undefined })}
                    options={[{ value: "", label: t("formBuilder:noParentFlow") }, ...list.filter((f, j) => j !== i && f.code).map((f) => ({ value: f.code, label: `${f.code}${f.name ? ` · ${f.name}` : ""}` }))]}
                  />
                </label>
              }
            />
            <CheckboxPill className="self-start" checked={flow.enabled !== false} disabled={readOnly} onChange={(on) => set({ enabled: on })} label={t("formBuilder:enabled")} />
            <div>
              <Label>{t("formBuilder:whenAll")}</Label>
              <ConditionRows t={t} disabled={readOnly} fields={fields} conditions={flow.conditions} onChange={(conditions) => set({ conditions })} />
            </div>
            <div>
              <Label>{t("formBuilder:flowSections")}</Label>
              <div className="flex flex-wrap gap-1.5">
                {sections.map((s) => {
                  const other = owner.has(s.value) && owner.get(s.value) !== i && !chosen.includes(s.value);
                  return (
                    <CheckboxPill
                      key={s.value}
                      disabled={readOnly || other}
                      checked={chosen.includes(s.value)}
                      onChange={(on) => set({ sections: on ? [...chosen, s.value] : chosen.filter((k) => k !== s.value) })}
                      label={other ? `${s.label} · ${list[owner.get(s.value)]?.code || t("formBuilder:otherFlow")}` : s.label}
                    />
                  );
                })}
              </div>
              {!chosen.length && <p className="mt-1 text-xs text-amber-700">{t("formBuilder:flowNeedsSection")}</p>}
              {chosen.length > 0 && <p className="mt-1 text-[11px] text-muted-foreground">{t("formBuilder:flowSectionsHint", { list: chosen.map(sectionName).join(", ") })}</p>}
            </div>
          </ItemCard>
        );
      })}
      {!readOnly && (
        <button
          type="button"
          onClick={() => {
            setFresh((s) => new Set(s).add(list.length));
            onChange([...list, { code: "", name: "", enabled: true, conditions: [{ field: "", operator: "EQ" }], sections: [] }]);
          }}
          className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-bold text-primary"
        >
          <Plus size={13} /> {t("formBuilder:addFlow")}
        </button>
      )}
    </div>
  );
}

// --- Checkpoints ---------------------------------------------------------

export function CheckpointsStep({ checkpoints, onChange, fields, sections, readOnly, problems, t }) {
  const list = checkpoints ?? [];
  const [fresh, setFresh] = useState(() => new Set());
  const setAt = (i, patch) => onChange(list.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  const places = [...sections, { value: END, label: t("formBuilder:endOfForm") }];
  const placeName = (at) => places.find((p) => p.value === at)?.label ?? at;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{t("formBuilder:checkpointsStepHint")}</p>
      <StepProblems problems={problems} prefix="checkpoint " />
      {!list.length && <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("formBuilder:noCheckpoints")}</p>}
      {list.map((cp, i) => {
        const set = (patch) => setAt(i, patch);
        const actions = cp.actions ?? [];
        const setAction = (j, patch) => set({ actions: actions.map((a, k) => (k === j ? { ...a, ...patch } : a)) });
        return (
          <ItemCard
            key={i}
            icon={Signpost}
            t={t}
            readOnly={readOnly}
            startOpen={fresh.has(i)}
            invalid={!cp.code || !cp.at || !outcomeAllowed(cp.outcome, cp.at)}
            title={[cp.code, cp.name].filter(Boolean).join(" · ") || t("formBuilder:checkpointN", { n: i + 1 })}
            summary={[
              cp.at && t("formBuilder:afterPlace", { place: placeName(cp.at) }),
              cp.outcome && t(`formBuilder:outcome_${cp.outcome}`),
              t("formBuilder:priorityN", { n: cp.priority ?? 100 }),
              cp.enabled === false && t("formBuilder:disabled"),
            ]
              .filter(Boolean)
              .join(" · ")}
            onRemove={() => onChange(list.filter((_, j) => j !== i))}
          >
            <CodeName
              item={cp}
              set={set}
              disabled={readOnly}
              t={t}
              extra={
                <label className="text-xs font-semibold text-slate-700">
                  {t("formBuilder:priority")}
                  <input type="number" className={inputClass} disabled={readOnly} value={cp.priority ?? 100} onChange={(e) => set({ priority: e.target.value === "" ? "" : Number(e.target.value) })} />
                </label>
              }
            />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">
                {t("formBuilder:after")}
                <FilterSelect
                  className="mt-1.5"
                  disabled={readOnly}
                  value={cp.at ?? ""}
                  onChange={(at) => set({ at, ...(cp.outcome && !outcomeAllowed(cp.outcome, at) ? { outcome: at === END ? "SUBMIT" : "CONTINUE" } : {}) })}
                  options={[{ value: "", label: t("formBuilder:pickPlace") }, ...places]}
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                {t("formBuilder:outcome")}
                <FilterSelect
                  className="mt-1.5"
                  disabled={readOnly}
                  value={cp.outcome ?? ""}
                  onChange={(outcome) => set({ outcome })}
                  options={OUTCOMES.filter((o) => !cp.at || outcomeAllowed(o, cp.at)).map((o) => ({ value: o, label: t(`formBuilder:outcome_${o}`) }))}
                />
              </label>
            </div>
            <CheckboxPill className="self-start" checked={cp.enabled !== false} disabled={readOnly} onChange={(on) => set({ enabled: on })} label={t("formBuilder:enabled")} />
            <div>
              <Label>{t("formBuilder:whenAllOrAlways")}</Label>
              <ConditionRows t={t} guardian disabled={readOnly} fields={fields} conditions={cp.conditions} onChange={(conditions) => set({ conditions })} />
            </div>
            <div>
              <Label>{t("formBuilder:checkpointButtons")}</Label>
              <div className="flex flex-col gap-2">
                {actions.map((a, j) => (
                  <div key={j} className="grid items-end gap-2 md:grid-cols-[1fr_2fr_auto]">
                    <FilterSelect
                      disabled={readOnly}
                      value={a.code ?? "EDIT"}
                      onChange={(code) => setAction(j, code === "EDIT" ? { code, section: a.section ?? "" } : { code, section: undefined })}
                      options={ACTION_CODES.map((code) => ({ value: code, label: t(`formBuilder:action_${code}_button`) }))}
                    />
                    {(a.code ?? "EDIT") === "EDIT" ? (
                      <FilterSelect disabled={readOnly} value={a.section ?? ""} onChange={(v) => setAction(j, { section: v })} options={[{ value: "", label: t("formBuilder:pickSection") }, ...sections]} />
                    ) : (
                      <span />
                    )}
                    {!readOnly && (
                      <button type="button" onClick={() => set({ actions: actions.filter((_, k) => k !== j) })} className="rounded-lg p-2 text-red-600 hover:bg-red-50" aria-label={t("formBuilder:remove")}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                ))}
                {!readOnly && (
                  <button type="button" onClick={() => set({ actions: [...actions, { code: "EDIT", section: "" }] })} className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-1.5 text-xs font-bold text-primary">
                    <Plus size={13} /> {t("formBuilder:addButton")}
                  </button>
                )}
              </div>
            </div>
          </ItemCard>
        );
      })}
      {!readOnly && (
        <button
          type="button"
          onClick={() => {
            setFresh((s) => new Set(s).add(list.length));
            onChange([...list, { code: "", name: "", at: "", priority: 100, enabled: true, outcome: "CONTINUE", conditions: [], actions: [] }]);
          }}
          className="flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-3 py-2 text-xs font-bold text-primary"
        >
          <Plus size={13} /> {t("formBuilder:addCheckpoint")}
        </button>
      )}
    </div>
  );
}
