import { useEffect, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { ActionIconButton } from "@/Components/Common/ActionIconButton";
import { Button } from "@/Components/Common/Button";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { Toggle } from "@/Components/Common/Toggle";
import { glAccountsApi } from "@/Services/Accounting/accounting.api";
import { listPage } from "@/Hooks/useServerList";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/utils";
import { inputClass } from "../Finance/Deposits/depositShared";
import { Field, JsonEditor } from "./reconShared";

// A set's definition: which sources, the passes that match them (in order),
// the window, an optional daily schedule and optional GL accounts for
// write-offs. Built here as a form; "JSON" edits the same definition as
// text for what the form leaves out (where filters, say). Keys the form
// doesn't know are kept as they are.
const TOLERANCE_KINDS = ["amount", "days", "seconds"];
const blankPass = (n, sources) => ({ name: `pass_${n}`, left: sources[0]?.source_id ?? 0, right: sources[1]?.source_id ?? 0, keys: [{ left: "rrn", right: "rrn" }], tolerances: [{ left: "amount", right: "amount", amount: "0" }], cardinality: "1:1", action: "AUTO" });
const toleranceKind = (row) => TOLERANCE_KINDS.find((k) => row[k] != null) ?? "amount";

export function SetBuilder({ definition, onChange, options }) {
  const { t } = useTranslation("recon");
  const [mode, setMode] = useState("form");
  const [text, setText] = useState(() => JSON.stringify(definition, null, 2));
  const [textError, setTextError] = useState(null);
  const fieldsId = useId();
  const d = definition;
  const set = (patch) => onChange({ ...d, ...patch });
  const sources = d.sources ?? [];
  const passes = d.passes ?? [];
  const sourceName = (id) => options?.sources?.find((s) => s.id === id);
  const setSource = (i, patch) => set({ sources: sources.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  const setPass = (i, patch) => set({ passes: passes.map((p, j) => (j === i ? { ...p, ...patch } : p)) });
  const movePass = (i, by) => {
    const next = [...passes];
    [next[i], next[i + by]] = [next[i + by], next[i]];
    set({ passes: next });
  };
  const switchMode = (next) => {
    if (next === "json") setText(JSON.stringify(d, null, 2));
    setTextError(null);
    setMode(next);
  };
  const sourceChoices = sources.map((s) => ({ value: String(s.source_id), label: s.label || sourceName(s.source_id)?.code || `#${s.source_id}` }));

  return (
    <div className="grid gap-3">
      <datalist id={fieldsId}>
        {(options?.fields ?? []).map((f) => (
          <option key={f} value={f} />
        ))}
      </datalist>
      <SegmentedSwitch
          className="w-fit"
        value={mode}
        onChange={switchMode}
        options={[
          { value: "form", label: t("ruleForm") },
          { value: "json", label: "JSON" },
        ]}
      />
      {mode === "json" ? (
        <JsonEditor
          value={text}
          rows={24}
          error={textError}
          onChange={(value) => {
            setText(value);
            try {
              onChange(JSON.parse(value));
              setTextError(null);
            } catch (error) {
              setTextError(error.message);
            }
          }}
        />
      ) : (
        <>
          <Field label={t("windowDays")} required hint={t("windowDaysHint", { max: options?.max_window_days ?? 90 })} className="w-56">
            <input className={inputClass} inputMode="numeric" value={d.window_days ?? ""} onChange={(e) => set({ window_days: Math.min(options?.max_window_days ?? 90, Number(e.target.value.replace(/\D/g, "")) || 0) })} />
          </Field>

          <Block title={t("setSources")} hint={t("setSourcesHint")}>
            {sources.map((s, i) => (
              <div key={i} className="grid items-end gap-2 rounded-xl border border-border p-3 sm:grid-cols-[1fr_10rem_auto_auto]">
                <Field label={t("source")}>
                  <FilterSelect
                    value={String(s.source_id ?? "")}
                    onChange={(v) => setSource(i, { source_id: Number(v) })}
                    options={[{ value: "", label: t("chooseSource") }, ...(options?.sources ?? []).map((x) => ({ value: String(x.id), label: `${x.name} (${x.code})` }))]}
                  />
                </Field>
                <Field label={t("sourceLabel")}>
                  <input className={inputClass} value={s.label ?? ""} maxLength={20} onChange={(e) => setSource(i, { label: e.target.value.toUpperCase() })} placeholder="SWITCH" />
                </Field>
                <div className="pb-2">
                  <Toggle checked={Boolean(s.reversal)} onChange={(on) => setSource(i, { reversal: on ? { link: "original_ref", to: "rrn" } : undefined })} label={t("netReversals")} showLabel />
                </div>
                <RemoveButton onClick={() => set({ sources: sources.filter((_, j) => j !== i) })} />
                {s.reversal && (
                  <div className="grid gap-2 sm:col-span-4 sm:grid-cols-2">
                    <Field label={t("reversalLink")} hint={t("reversalLinkHint")}>
                      <input list={fieldsId} className={`${inputClass} font-mono`} value={s.reversal.link ?? ""} onChange={(e) => setSource(i, { reversal: { ...s.reversal, link: e.target.value } })} />
                    </Field>
                    <Field label={t("reversalTo")}>
                      <input list={fieldsId} className={`${inputClass} font-mono`} value={s.reversal.to ?? ""} onChange={(e) => setSource(i, { reversal: { ...s.reversal, to: e.target.value } })} />
                    </Field>
                  </div>
                )}
              </div>
            ))}
            <AddButton onClick={() => set({ sources: [...sources, { source_id: 0, label: "" }] })}>{t("addSetSource")}</AddButton>
          </Block>

          <Block title={t("passes")} hint={t("passesHint")}>
            {passes.map((p, i) => (
              <div key={i} className="grid gap-3 rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-end gap-2">
                  <span className="pb-2 text-xs font-black text-muted-foreground">{i + 1}.</span>
                  <Field label={t("passName")} className="w-48">
                    <input className={`${inputClass} font-mono`} value={p.name ?? ""} onChange={(e) => setPass(i, { name: e.target.value.replace(/\s/g, "_") })} />
                  </Field>
                  <Field label={t("left")} className="w-40">
                    <FilterSelect value={String(p.left ?? "")} onChange={(v) => setPass(i, { left: Number(v) })} options={sourceChoices} />
                  </Field>
                  <Field label={t("right")} className="w-40">
                    <FilterSelect value={String(p.right ?? "")} onChange={(v) => setPass(i, { right: Number(v) })} options={sourceChoices} />
                  </Field>
                  <Field label={t("cardinality")} className="w-28">
                    <FilterSelect value={p.cardinality ?? "1:1"} onChange={(v) => setPass(i, { cardinality: v, ...(v === "1:1" ? { group_by: undefined } : {}) })} options={(options?.cardinalities ?? ["1:1"]).map((c) => ({ value: c, label: c }))} />
                  </Field>
                  <Field label={t("passAction")} className="w-44">
                    <FilterSelect value={p.action ?? "AUTO"} onChange={(v) => setPass(i, { action: v })} options={(options?.actions ?? ["AUTO", "PROPOSE"]).map((a) => ({ value: a, label: t(`passAction_${a}`) }))} />
                  </Field>
                  <span className="ms-auto flex gap-1 pb-1">
                    <ActionIconButton intent="audit" icon={ArrowUp} disabled={i === 0} className="disabled:opacity-30" onClick={() => movePass(i, -1)} label={t("moveUp")} />
                    <ActionIconButton intent="audit" icon={ArrowDown} disabled={i === passes.length - 1} className="disabled:opacity-30" onClick={() => movePass(i, 1)} label={t("moveDown")} />
                    <RemoveButton onClick={() => set({ passes: passes.filter((_, j) => j !== i) })} />
                  </span>
                </div>
                <Rows
                  title={t("exactKeys")}
                  rows={p.keys ?? []}
                  onChange={(keys) => setPass(i, { keys })}
                  blank={{ left: "", right: "" }}
                  render={(row, change) => (
                    <>
                      <input list={fieldsId} aria-label={t("left")} className={`${inputClass} font-mono`} value={row.left ?? ""} onChange={(e) => change({ left: e.target.value })} />
                      <span className="text-center text-xs text-muted-foreground">=</span>
                      <input list={fieldsId} aria-label={t("right")} className={`${inputClass} font-mono`} value={row.right ?? ""} onChange={(e) => change({ right: e.target.value })} />
                      <span className="flex flex-wrap items-center gap-3 text-[11px]">
                        <Check checked={row.trim_zeros} onChange={(v) => change({ trim_zeros: v || undefined })}>
                          {t("trimZeros")}
                        </Check>
                        <Check checked={row.ignore_case} onChange={(v) => change({ ignore_case: v || undefined })}>
                          {t("ignoreCase")}
                        </Check>
                        <label className="flex items-center gap-1">
                          {t("lastChars")}
                          <input className="w-12 rounded-lg border border-border px-1.5 py-0.5" inputMode="numeric" value={row.last ?? ""} onChange={(e) => change({ last: Number(e.target.value.replace(/\D/g, "")) || undefined })} />
                        </label>
                      </span>
                    </>
                  )}
                />
                <Rows
                  title={t("tolerances")}
                  rows={p.tolerances ?? []}
                  onChange={(tolerances) => setPass(i, { tolerances })}
                  blank={{ left: "amount", right: "amount", amount: "0" }}
                  render={(row, change, replace) => {
                    const kind = toleranceKind(row);
                    return (
                      <>
                        <input list={fieldsId} aria-label={t("left")} className={`${inputClass} font-mono`} value={row.left ?? ""} onChange={(e) => change({ left: e.target.value })} />
                        <span className="text-center text-xs text-muted-foreground">≈</span>
                        <input list={fieldsId} aria-label={t("right")} className={`${inputClass} font-mono`} value={row.right ?? ""} onChange={(e) => change({ right: e.target.value })} />
                        <span className="flex items-center gap-2">
                          <FilterSelect
                            className="w-32"
                            value={kind}
                            onChange={(next) => {
                              const rest = Object.fromEntries(Object.entries(row).filter(([k]) => !TOLERANCE_KINDS.includes(k)));
                              replace({ ...rest, [next]: next === "amount" ? "0" : 0 });
                            }}
                            options={(options?.tolerances ?? TOLERANCE_KINDS).map((k) => ({ value: k, label: t(`tolerance_${k}`) }))}
                          />
                          <input
                            aria-label={t(`tolerance_${kind}`)}
                            className={`${inputClass} w-24`}
                            inputMode="decimal"
                            value={row[kind] ?? ""}
                            onChange={(e) => change({ [kind]: kind === "amount" ? e.target.value.replace(/[^\d.]/g, "") : Number(e.target.value.replace(/\D/g, "")) || 0 })}
                          />
                        </span>
                      </>
                    );
                  }}
                />
                {p.cardinality && p.cardinality !== "1:1" && (
                  <Field label={t("groupBy")} hint={t("groupByHint")}>
                    <input className={`${inputClass} font-mono`} value={(p.group_by ?? []).join(", ")} onChange={(e) => setPass(i, { group_by: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} placeholder="terminal_id, business_date" />
                  </Field>
                )}
                {(p.where_left || p.where_right) && <p className="text-[11px] text-muted-foreground">{t("hasWhere")}</p>}
              </div>
            ))}
            <AddButton disabled={sources.length < 2} onClick={() => set({ passes: [...passes, blankPass(passes.length + 1, sources)] })}>
              {t("addPass")}
            </AddButton>
          </Block>

          <Block
            title={t("schedule")}
            action={<Toggle checked={Boolean(d.schedule)} onChange={(on) => set({ schedule: on ? { run_time: "02:00", lag_days: 1 } : undefined })} label={t("runDaily")} showLabel />}
          >
            {d.schedule ? (
              <div className="grid gap-2 sm:grid-cols-2">
                <Field label={t("runTime")}>
                  <input type="time" className={inputClass} value={d.schedule.run_time ?? ""} onChange={(e) => set({ schedule: { ...d.schedule, run_time: e.target.value } })} />
                </Field>
                <Field label={t("lagDays")} hint={t("lagDaysHint")}>
                  <input className={inputClass} inputMode="numeric" value={d.schedule.lag_days ?? ""} onChange={(e) => set({ schedule: { ...d.schedule, lag_days: Number(e.target.value.replace(/\D/g, "")) || 0 } })} />
                </Field>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("noSchedule")}</p>
            )}
          </Block>

          <Block title={t("glAccounts")} action={<Toggle checked={Boolean(d.gl)} onChange={(on) => set({ gl: on ? { suspense_gl_account_id: 0, loss_gl_account_id: 0, gain_gl_account_id: 0 } : undefined })} label={t("postWriteOffs")} showLabel />}>
            {d.gl ? (
              <div className="grid gap-2 sm:grid-cols-3">
                {["suspense", "loss", "gain"].map((k) => (
                  <Field key={k} label={t(`gl_${k}`)} required>
                    <GlPicker value={d.gl[`${k}_gl_account_id`]} onChange={(id) => set({ gl: { ...d.gl, [`${k}_gl_account_id`]: id } })} />
                  </Field>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("noGl")}</p>
            )}
          </Block>
        </>
      )}
    </div>
  );
}

function Block({ title, hint, action, children }) {
  return (
    <section className="grid gap-2 rounded-2xl border border-border bg-card p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-sm font-bold">{title}</p>
          {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// Rows of left field / right field and their options.
function Rows({ title, rows, onChange, blank, render }) {
  const { t } = useTranslation("recon");
  return (
    <div className="grid gap-1.5">
      <p className="text-xs font-semibold">{title}</p>
      {rows.map((row, i) => (
        <div key={i} className="grid items-center gap-2 sm:grid-cols-[minmax(8rem,1fr)_1rem_minmax(8rem,1fr)_auto_auto]">
          {render(
            row,
            (patch) => onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r))),
            (whole) => onChange(rows.map((r, j) => (j === i ? whole : r))),
          )}
          <RemoveButton onClick={() => onChange(rows.filter((_, j) => j !== i))} />
        </div>
      ))}
      <AddButton onClick={() => onChange([...rows, blank])}>{t("addRow")}</AddButton>
    </div>
  );
}

function Check({ checked, onChange, children }) {
  return (
    <label className="flex items-center gap-1">
      <input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} />
      {children}
    </label>
  );
}

function AddButton({ onClick, disabled, children }) {
  return (
    <Button size="sm" variant="ghost" icon={Plus} disabled={disabled} onClick={onClick} className="justify-self-start">
      {children}
    </Button>
  );
}

function RemoveButton({ onClick }) {
  const { t } = useTranslation("recon");
  return <ActionIconButton intent="delete" icon={Trash2} label={t("remove")} onClick={onClick} />;
}

// A posting GL account, searched by code or name.
function GlPicker({ value, onChange }) {
  const { t } = useTranslation("recon");
  const [term, setTerm] = useState("");
  const [found, setFound] = useState([]);
  const [chosen, setChosen] = useState(null);
  useEffect(() => {
    const search = term.trim();
    if (search.length < 2) return undefined;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      glAccountsApi
        .list({ search, page: 1, limit: 20 })
        .then((r) => !cancelled && setFound(listPage(r).items.filter((a) => a.is_account)))
        .catch((error) => notifications.error(error.message));
    }, 350);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [term]);
  if (value) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-muted/40 px-3 py-2 text-xs">
        <span className="min-w-0 truncate">{chosen ? `${chosen.gl_code} · ${chosen.name}` : t("glAccountId", { id: value })}</span>
        <button
          type="button"
          className="shrink-0 font-bold text-primary hover:underline"
          onClick={() => {
            setChosen(null);
            onChange(0);
          }}
        >
          {t("change")}
        </button>
      </div>
    );
  }
  return (
    <div className="relative">
      <input className={inputClass} value={term} onChange={(e) => setTerm(e.target.value)} placeholder={t("searchGl")} />
      {term.trim().length >= 2 && (
        <ul className={cn("absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card shadow-lg")}>
          {found.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">{t("noGlFound")}</li>
          ) : (
            found.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-xs hover:bg-muted"
                  onClick={() => {
                    setChosen(a);
                    setTerm("");
                    onChange(a.id);
                  }}
                >
                  <b className="font-mono">{a.gl_code}</b> · {a.name}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
