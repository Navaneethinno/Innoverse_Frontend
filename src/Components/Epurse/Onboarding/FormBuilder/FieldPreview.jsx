import { useRef, useState } from "react";
import { Eye, FileText, Upload, X } from "lucide-react";
import { useAudienceTranslation } from "@/Hooks/useAudienceTranslation";
import { CheckboxPill } from "@/Components/Common/CheckboxPill";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { Spinner } from "@/Components/Common/Spinner";
import { notifications } from "@/Utils/Lib/notifications";
import { cn } from "@/Utils/Lib/cn";

const control = "w-full rounded-xl border bg-white/80 px-3 py-2.5 text-sm outline-none focus:border-[var(--primary)] disabled:bg-muted disabled:text-muted-foreground";
const sameValue = (a, b) => a !== undefined && a !== null && a !== "" && String(a) === String(b);

// One uploaded side of a FILE field: upload(file) resolves to the stored
// { path, file_name }; "View" fetches it back.
function FileSide({ label, value, onChange, disabled, file, side }) {
  const { t } = useAudienceTranslation("formBuilder");
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState("");
  const formats = file?.options?.allowed_types;
  const accept = Array.isArray(formats) ? formats.map((f) => `.${String(f).toLowerCase()}`).join(",") : undefined;
  const choose = async (picked) => {
    if (!picked || !file?.upload) return;
    const maxKb = file.options?.max_size_kb;
    if (maxKb && picked.size > maxKb * 1024) {
      notifications.error(t("fileTooLarge", { size: maxKb }));
      return;
    }
    setBusy(true);
    try {
      const stored = await file.upload(picked, side);
      setName(stored?.file_name ?? picked.name);
      onChange(stored?.path ?? "");
    } catch (error) {
      notifications.error(error.message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  const view = async () => {
    try {
      const blob = await file.download(value);
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener");
      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (error) {
      notifications.error(error.message);
    }
  };
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label && <span className="w-12 text-xs font-semibold text-muted-foreground">{label}</span>}
      <input ref={input} type="file" accept={accept} className="hidden" onChange={(e) => void choose(e.target.files?.[0])} />
      {value ? (
        <span className="inline-flex min-w-0 items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2 text-sm">
          <FileText size={14} className="shrink-0 text-[var(--primary)]" />
          <span className="truncate">{name || String(value).split("/").pop()}</span>
          {file?.download && (
            <button type="button" onClick={() => void view()} className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--primary)]">
              <Eye size={12} /> {t("view")}
            </button>
          )}
          {!disabled && (
            <button type="button" onClick={() => onChange("")} aria-label={t("remove")} className="text-muted-foreground hover:text-red-500">
              <X size={13} />
            </button>
          )}
        </span>
      ) : null}
      {!disabled && (
        <button
          type="button"
          disabled={busy || !file?.upload}
          onClick={() => input.current?.click()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-[var(--primary)]/50 px-3 py-2 text-sm font-semibold text-[var(--primary)] disabled:opacity-60"
        >
          {busy ? <Spinner size={13} /> : <Upload size={14} />} {value ? t("replaceFile") : t("uploadFile")}
        </button>
      )}
    </div>
  );
}

// The control for one form field, drawn by field_type (§8, "A field"):
// the answer shapes are the ones `edit` takes. `choices` are the field's
// inline choices already narrowed by its parent's answer. Without
// `onChange` it is a read-only preview (the section editor's live preview).
export function FormFieldInput({ field, value, onChange, choices, disabled, file }) {
  const { t } = useAudienceTranslation("formBuilder");
  const preview = !onChange;
  const off = disabled || preview || field.read_only;
  const set = onChange ?? (() => {});
  const options = field.options ?? {};
  const list = choices ?? field.choices ?? options.choices ?? [];
  switch (field.field_type) {
    case "NUMBER":
      return (
        <input
          type="number"
          step={options.number_kind === "integer" ? 1 : "any"}
          min={options.min}
          max={options.max}
          className={control}
          disabled={off}
          placeholder={field.hint}
          value={value ?? ""}
          onChange={(e) => set(e.target.value === "" ? "" : Number(e.target.value))}
        />
      );
    case "DATE":
      return <input type="date" min={options.min_date} max={options.max_date} className={control} disabled={off} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
    case "PHONE":
      return <input type="tel" className={control} disabled={off} placeholder={field.hint || "+258841234567"} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
    case "EMAIL":
      return <input type="email" className={control} disabled={off} placeholder={field.hint} value={value ?? ""} onChange={(e) => set(e.target.value)} />;
    case "DROPDOWN":
      return (
        <FilterSelect
          disabled={off}
          value={list.some((c) => sameValue(c.value, value)) ? list.find((c) => sameValue(c.value, value)).value : ""}
          onChange={(v) => set(v === "" ? "" : v)}
          options={[
            { value: "", label: preview && !list.length && options.source_table ? t("listFrom", { source: options.source_table }) : field.hint || t("select") },
            ...list.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />
      );
    case "RADIO":
      return (
        <div className="flex flex-wrap gap-2">
          {list.length === 0 && preview && <span className="text-xs text-muted-foreground">{t("listFrom", { source: options.source_table ?? "-" })}</span>}
          {list.map((c) => (
            <button
              key={c.value}
              type="button"
              disabled={off}
              onClick={() => set(c.value)}
              className={cn(
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                sameValue(c.value, value) ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "text-slate-600",
                off && "opacity-70",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>
      );
    case "CHECKBOXES": {
      const chosen = Array.isArray(value) ? value : [];
      return (
        <div className="flex flex-wrap gap-2">
          {list.length === 0 && preview && <span className="text-xs text-muted-foreground">{t("listFrom", { source: options.source_table ?? "-" })}</span>}
          {list.map((c) => (
            <CheckboxPill
              key={c.value}
              label={c.label}
              disabled={off}
              checked={chosen.some((v) => sameValue(v, c.value))}
              onChange={(on) => set(on ? [...chosen, c.value] : chosen.filter((v) => !sameValue(v, c.value)))}
            />
          ))}
        </div>
      );
    }
    case "YES_NO":
      return (
        <div className="flex gap-2">
          {[
            [true, options.yes_label || t("yes")],
            [false, options.no_label || t("no")],
          ].map(([v, label]) => (
            <button
              key={String(v)}
              type="button"
              disabled={off}
              onClick={() => set(v)}
              className={cn("rounded-full border px-4 py-2 text-sm font-semibold", value === v ? "border-[var(--primary)] bg-[var(--primary)]/10 text-[var(--primary)]" : "text-slate-600", off && "opacity-70")}
            >
              {label}
            </button>
          ))}
        </div>
      );
    case "FILE": {
      const both = options.sides === "front_back";
      const current = both ? (value && typeof value === "object" ? value : {}) : value;
      if (both) {
        return (
          <div className="flex flex-col gap-2">
            {["front", "back"].map((side) => (
              <FileSide key={side} side={side} label={t(side)} value={current[side] ?? ""} disabled={off} file={{ ...file, options }} onChange={(path) => set({ ...current, [side]: path })} />
            ))}
          </div>
        );
      }
      return <FileSide value={current ?? ""} disabled={off} file={{ ...file, options }} onChange={set} />;
    }
    default:
      return (
        <input
          className={cn(control, options.case === "upper" && "uppercase", options.case === "lower" && "lowercase")}
          disabled={off}
          maxLength={options.max_length}
          placeholder={field.hint}
          value={value ?? ""}
          onChange={(e) => set(e.target.value)}
        />
      );
  }
}

// A field with its question, required mark, help text and issue.
export function FieldPreview({ field, value, onChange, choices, disabled, file, issue, note }) {
  return (
    <div data-field={field.key}>
      <label className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
        <span>
          {field.label}
          {field.required && <span className="text-red-500"> *</span>}
        </span>
        {note && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-700">{note}</span>}
      </label>
      <FormFieldInput field={field} value={value} onChange={onChange} choices={choices} disabled={disabled} file={file} />
      {field.help_text && <p className="mt-1 text-[11px] text-muted-foreground">{field.help_text}</p>}
      {issue && <p className="mt-1 text-xs font-medium text-red-600">{issue}</p>}
    </div>
  );
}
