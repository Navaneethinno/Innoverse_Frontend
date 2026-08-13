import { useState } from "react";
import type { ReactNode } from "react";
import { cn } from "../../lib/utils";

interface ChangeViewerProps {
  action: "ADD" | "EDIT" | "DELETE" | string;
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
}

function isSensitiveKey(key: string) {
  return /password|secret|token|otp|pin|credential/i.test(key);
}

// Try to parse a string as JSON; return parsed value or null if not valid JSON.
function tryParseJson(v: string): unknown | null {
  const trimmed = v.trim();
  if (!(trimmed.startsWith("{") || trimmed.startsWith("["))) return null;
  try { return JSON.parse(trimmed); } catch { return null; }
}

// Canonical string serialization used ONLY for change-detection equality checks.
function serializeForDiff(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (typeof v === "string") {
    const parsed = tryParseJson(v);
    if (parsed !== null) return JSON.stringify(parsed);
    return v;
  }
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// ── Structured value renderer ────────────────────────────────────────────────

// Renders a single unknown value as a ReactNode.
// depth controls indentation for nested objects.
function renderValue(
  value: unknown,
  depth = 0,
  beforeValue?: unknown,  // only provided for EDIT nested comparison
  isEditMode = false,
): ReactNode {
  // Unwrap JSON strings
  if (typeof value === "string") {
    const parsed = tryParseJson(value);
    if (parsed !== null) {
      const parsedBefore = typeof beforeValue === "string" ? tryParseJson(beforeValue) : beforeValue;
      return renderValue(parsed, depth, parsedBefore ?? beforeValue, isEditMode);
    }
    return <span className="text-xs text-slate-700 break-words">{value || "—"}</span>;
  }

  if (value === null || value === undefined) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  if (typeof value === "boolean") {
    return <span className="text-xs text-slate-700">{value ? "Yes" : "No"}</span>;
  }

  if (typeof value !== "object") {
    return <span className="text-xs text-slate-700">{String(value)}</span>;
  }

  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-xs text-slate-400">—</span>;

    // Array of primitives — render as comma list
    if (value.every((item) => typeof item !== "object" || item === null)) {
      return (
        <span className="text-xs text-slate-700">
          {value.map((item) => (item === null || item === undefined ? "—" : String(item))).join(", ")}
        </span>
      );
    }

    // Array of objects — render as numbered entries
    const beforeArr = Array.isArray(beforeValue) ? beforeValue : [];
    return (
      <div className={cn("space-y-1.5", depth > 0 && "mt-1")}>
        {value.map((item, idx) => (
          <div key={idx} className="rounded-lg border border-slate-100 bg-slate-50/60 overflow-hidden">
            <div className="px-2 py-0.5 bg-slate-100/60 border-b border-slate-100">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{idx + 1}</span>
            </div>
            <div className="px-2 py-1">
              {renderValue(item, depth + 1, beforeArr[idx], isEditMode)}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Plain object — render as nested key/value rows
  const obj = value as Record<string, unknown>;
  const beforeObj = (beforeValue && typeof beforeValue === "object" && !Array.isArray(beforeValue))
    ? beforeValue as Record<string, unknown>
    : {};

  // id/name pair → show just the name inline
  if ("id" in obj && "name" in obj && Object.keys(obj).length <= 3) {
    const name = String(obj.name ?? "—");
    return <span className="text-xs text-slate-700">{name}</span>;
  }

  const keys = Object.keys(obj).filter((k) => !isSensitiveKey(k));
  if (keys.length === 0) return <span className="text-xs text-slate-400">—</span>;

  return (
    <div className={cn(
      "rounded-lg border border-slate-100 overflow-hidden",
      depth === 0 ? "bg-white/70" : "bg-slate-50/40",
    )}>
      {keys.map((k, i) => {
        const childVal    = obj[k];
        const childBefore = beforeObj[k];
        const isComplex   = childVal !== null && typeof childVal === "object";
        const nestedChanged = isEditMode && isComplex
          ? serializeForDiff(childVal) !== serializeForDiff(childBefore)
          : false;
        const scalarChanged = isEditMode && !isComplex
          ? serializeForDiff(childVal) !== serializeForDiff(childBefore)
          : false;

        return (
          <div
            key={k}
            className={cn(
              "grid gap-2 px-2 py-1.5 border-b border-slate-50 last:border-0",
              isComplex ? "grid-cols-1" : "grid-cols-[120px_1fr]",
            )}
          >
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest self-start pt-0.5",
              scalarChanged || nestedChanged ? "text-slate-500" : "text-slate-400",
            )}>
              {k.replace(/_/g, " ")}
            </span>
            {isComplex ? (
              <div className="mt-0.5">
                {renderValue(childVal, depth + 1, childBefore, isEditMode)}
              </div>
            ) : (
              <span className={cn(
                "text-xs break-words",
                scalarChanged ? "text-emerald-700 font-semibold" : "text-slate-600",
              )}>
                {childVal === null || childVal === undefined
                  ? "—"
                  : typeof childVal === "boolean"
                    ? (childVal ? "Yes" : "No")
                    : String(childVal)}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── FieldRow ─────────────────────────────────────────────────────────────────

interface FieldRowProps {
  label: string;
  beforeNode?: ReactNode;
  afterNode: ReactNode;
  changed?: boolean;
  isComplex?: boolean;
}

function FieldRow({ label, beforeNode, afterNode, changed, isComplex }: FieldRowProps) {
  const hasBeforeCol = beforeNode !== undefined;

  if (isComplex && hasBeforeCol) {
    // For complex (object/array) EDIT fields: stack label then side-by-side before/after
    return (
      <div className="py-2 border-b border-slate-50 last:border-0 space-y-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
        <div className="grid grid-cols-2 gap-2">
          <div className={cn("rounded-lg p-1.5 border", changed ? "border-red-100 bg-red-50/40" : "border-slate-100 bg-slate-50/40")}>
            <p className="text-[9px] font-black text-red-400 uppercase tracking-widest mb-1">Before</p>
            {beforeNode}
          </div>
          <div className={cn("rounded-lg p-1.5 border", changed ? "border-emerald-100 bg-emerald-50/40" : "border-slate-100 bg-slate-50/40")}>
            <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mb-1">After</p>
            {afterNode}
          </div>
        </div>
      </div>
    );
  }

  if (isComplex) {
    // ADD / DELETE complex value
    return (
      <div className="py-2 border-b border-slate-50 last:border-0 space-y-1">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">{label}</span>
        {afterNode}
      </div>
    );
  }

  // Scalar field — original grid layout
  return (
    <div className={cn("grid gap-2 py-2 border-b border-slate-50 last:border-0", hasBeforeCol ? "grid-cols-[1fr_1fr_1fr]" : "grid-cols-[1fr_2fr]")}>
      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest self-center">{label}</span>
      {hasBeforeCol && (
        <span className={cn("text-xs px-2 py-1 rounded-lg", changed ? "bg-red-50 text-red-700 line-through" : "text-slate-500")}>
          {beforeNode}
        </span>
      )}
      <span className={cn("text-xs px-2 py-1 rounded-lg", changed ? "bg-emerald-50 text-emerald-700 font-semibold" : "text-slate-700")}>
        {afterNode}
      </span>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function isComplexValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === "string") {
    const parsed = tryParseJson(v);
    if (parsed === null || typeof parsed !== "object") return false;
    // id/name pairs are rendered inline
    if (!Array.isArray(parsed)) {
      const obj = parsed as Record<string, unknown>;
      if ("id" in obj && "name" in obj && Object.keys(obj).length <= 3) return false;
    }
    return true;
  }
  if (typeof v !== "object") return false;
  if (Array.isArray(v)) return v.length > 0 && v.some((item) => typeof item === "object" && item !== null);
  const obj = v as Record<string, unknown>;
  if ("id" in obj && "name" in obj && Object.keys(obj).length <= 3) return false;
  return true;
}

function scalarDisplay(v: unknown): ReactNode {
  if (v === null || v === undefined) return <span className="text-slate-400">—</span>;
  if (typeof v === "boolean") return String(v ? "Yes" : "No");
  if (typeof v === "string") return v || "—";
  if (typeof v === "object" && !Array.isArray(v)) {
    const obj = v as Record<string, unknown>;
    if ("name" in obj) return String(obj.name ?? "—");
  }
  return String(v);
}

// ── Main component ────────────────────────────────────────────────────────────

export function ChangeViewer({ action, before_data, after_data }: ChangeViewerProps) {
  const isAdd    = action === "ADD";
  const isEdit   = action === "EDIT";
  const isDelete = action === "DELETE";
  const [showAll, setShowAll] = useState(false);

  const data   = isDelete ? before_data : after_data;
  const before = isEdit ? before_data : null;

  if (!data && !before) {
    return <p className="text-xs text-slate-400 italic">No data available</p>;
  }

  const allKeys = Array.from(new Set([
    ...Object.keys(before ?? {}),
    ...Object.keys(data ?? {}),
  ])).filter((k) => k !== "id" && k !== "created_at" && k !== "updated_at");

  const changedKeys   = isEdit
    ? allKeys.filter((k) => !isSensitiveKey(k) && serializeForDiff(before?.[k]) !== serializeForDiff(data?.[k]))
    : [];
  const unchangedKeys = isEdit
    ? allKeys.filter((k) => !isSensitiveKey(k) && serializeForDiff(before?.[k]) === serializeForDiff(data?.[k]))
    : [];
  const visibleKeys   = isEdit ? (showAll ? allKeys : changedKeys) : allKeys;

  return (
    <div className="rounded-xl border border-slate-100 overflow-hidden">
      {/* Column headers */}
      {isEdit && (
        <div className="grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-2 bg-slate-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field</span>
          <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Before</span>
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">After</span>
        </div>
      )}
      {isAdd && (
        <div className="grid grid-cols-[1fr_2fr] gap-2 px-3 py-2 bg-emerald-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field</span>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Proposed Value</span>
        </div>
      )}
      {isDelete && (
        <div className="grid grid-cols-[1fr_2fr] gap-2 px-3 py-2 bg-red-50 border-b border-slate-100">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Field</span>
          <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">Current Value</span>
        </div>
      )}

      {/* EDIT summary bar */}
      {isEdit && (
        <div className="flex items-center justify-between px-3 py-1.5 bg-amber-50/60 border-b border-slate-100">
          <span className="text-[10px] font-semibold text-amber-700">
            {changedKeys.length} field{changedKeys.length !== 1 ? "s" : ""} changed
          </span>
          {unchangedKeys.length > 0 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="text-[10px] font-bold text-indigo-500 hover:text-indigo-700 underline"
            >
              {showAll ? "Show changed only" : `Show all fields (${allKeys.length})`}
            </button>
          )}
        </div>
      )}

      <div className="px-3">
        {visibleKeys.map((key) => {
          if (isSensitiveKey(key)) return null;

          const rawAfter  = data?.[key];
          const rawBefore = before?.[key];
          const complex   = isComplexValue(rawAfter) || (isEdit && isComplexValue(rawBefore));
          const changed   = isEdit && serializeForDiff(rawBefore) !== serializeForDiff(rawAfter);

          if (complex) {
            const afterNode  = renderValue(rawAfter,  0, isEdit ? rawBefore : undefined, isEdit);
            const beforeNode = isEdit ? renderValue(rawBefore, 0, undefined, false) : undefined;
            return (
              <FieldRow
                key={key}
                label={key.replace(/_/g, " ")}
                afterNode={afterNode}
                beforeNode={beforeNode}
                changed={changed}
                isComplex
              />
            );
          }

          // Scalar field
          const afterNode  = scalarDisplay(rawAfter);
          const beforeNode = isEdit ? scalarDisplay(rawBefore) : undefined;
          return (
            <FieldRow
              key={key}
              label={key.replace(/_/g, " ")}
              afterNode={afterNode}
              beforeNode={beforeNode}
              changed={changed}
            />
          );
        })}
        {isEdit && visibleKeys.length === 0 && (
          <p className="text-xs text-slate-400 italic py-3">No changed fields to display.</p>
        )}
      </div>
    </div>
  );
}
