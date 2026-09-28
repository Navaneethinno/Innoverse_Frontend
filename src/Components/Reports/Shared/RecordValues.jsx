import { StoredFilePreview } from "@/Components/Common/FileUploadField";
import { customerOnboardingApi } from "@/Services/Epurse/customerOnboarding.api";
import { corpCustomerOnboardingApi } from "@/Services/Epurse/corporateCustomerOnboarding.api";
import { fieldLabel, isIdField } from "./idNames";

// Renders a record's values as a person would read them: ids as names
// (see idNames.js), nested objects as sections, lists of rows as small
// tables, uploaded customer files as previews — never raw JSON.

// A stored customer file: institution/<n>/customer/<individual|corporate>/<onboarding ref>/...
const FILE_PATH = /^institution\/\d+\/customer\/(individual|corporate)\/([^/]+)\//;
const fileDownload = (path) => {
  const [, kind, referenceId] = FILE_PATH.exec(path) ?? [];
  const api = kind === "corporate" ? corpCustomerOnboardingApi : customerOnboardingApi;
  return (p) => api.file({ reference_id: referenceId, path: p });
};

const empty = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

// Fields that only mean something to the database.
const HIDDEN = new Set(["id", "audit_key", "onboarding_id"]);
export const visibleEntries = (obj) => Object.entries(obj ?? {}).filter(([k]) => !HIDDEN.has(k));

// One value, whatever its shape.
export function Value({ field, value, name }) {
  if (empty(value)) return <span className="text-muted-foreground">—</span>;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (isIdField(field, value)) return name(field, value);
  if (typeof value === "string" && FILE_PATH.test(value)) return <StoredFilePreview value={value} download={fileDownload(value)} className="h-9 w-9" />;
  if (Array.isArray(value)) {
    if (value.every((v) => v === null || typeof v !== "object")) return value.join(", ");
    return <RowsTable rows={value} name={name} />;
  }
  if (typeof value === "object") return <Fields values={value} name={name} nested />;
  return <span className="break-words">{String(value)}</span>;
}

// A list of objects (addresses, documents, related parties...) as a table
// with every key any row has.
function RowsTable({ rows, name }) {
  const columns = [...new Set(rows.flatMap((r) => (r && typeof r === "object" ? visibleEntries(r).map(([k]) => k) : [])))];
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-[11px]">
        <thead className="bg-muted/60">
          <tr className="text-left text-muted-foreground">
            {columns.map((c) => (
              <th key={c} className="whitespace-nowrap px-2 py-1 font-semibold">
                {fieldLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t align-top">
              {columns.map((c) => (
                <td key={c} className="px-2 py-1">
                  <Value field={c} value={r?.[c]} name={name} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Label/value grid. Nested objects and tables take the full width, after
// the plain fields; `nested` draws them as an inset card.
export function Fields({ values, name, nested = false }) {
  const entries = visibleEntries(values);
  const isBlock = ([, v]) => v && typeof v === "object" && !(Array.isArray(v) && v.every((x) => x === null || typeof x !== "object"));
  const plain = entries.filter((e) => !isBlock(e));
  const blocks = entries.filter(isBlock);
  return (
    <div className={nested ? "rounded-lg border bg-muted/30 p-2" : ""}>
      {plain.length > 0 && (
        <dl className="grid gap-x-4 gap-y-2 text-xs sm:grid-cols-2">
          {plain.map(([field, value]) => (
            <div key={field}>
              <dt className="text-muted-foreground">{fieldLabel(field)}</dt>
              <dd className="font-medium text-slate-700">
                <Value field={field} value={value} name={name} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {blocks.map(([field, value]) => (
        <div key={field} className="mt-3">
          <p className="mb-1 text-[11px] font-bold text-slate-600">{fieldLabel(field)}</p>
          <Value field={field} value={value} name={name} />
        </div>
      ))}
    </div>
  );
}
