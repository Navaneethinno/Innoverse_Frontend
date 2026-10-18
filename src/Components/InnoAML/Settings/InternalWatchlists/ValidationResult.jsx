import { useTranslation } from "react-i18next";
import { AlertTriangle, CheckCircle2 } from "lucide-react";

// The reply of internal_list/validate: how many rows can be screened, the
// first 200 row problems (row numbers as the file shows them, header
// included) and the first 20 entries exactly as they will be screened.
export function ValidationResult({ result }) {
  const { t } = useTranslation("aml");
  if (!result) return null;
  const invalid = Math.max(0, (result.rows ?? 0) - (result.valid ?? 0));
  return (
    <div className="space-y-3 rounded-xl border p-3">
      <p className={`flex items-center gap-2 text-sm font-bold ${invalid ? "text-amber-700" : "text-success"}`}>
        {invalid ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
        {t("validRows", { valid: result.valid ?? 0, rows: result.rows ?? 0 })}
        {invalid > 0 && <span className="font-semibold">· {t("invalidRows", { count: invalid })}</span>}
      </p>

      {result.errors?.length > 0 && (
        <div className="max-h-40 overflow-y-auto rounded-lg bg-amber-50 p-2 text-xs text-amber-800">
          {result.errors.map((e, i) => (
            <p key={i}>
              <b>{t("rowN", { row: e.row })}</b>: {e.problem}
            </p>
          ))}
        </div>
      )}

      {result.preview?.length > 0 && (
        <div className="overflow-x-auto">
          <p className="mb-1 text-[11px] font-bold uppercase text-muted-foreground">{t("preview")}</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-muted-foreground">
                <th className="py-1 pr-3 font-semibold">{t("name")}</th>
                <th className="py-1 pr-3 font-semibold">{t("aliases")}</th>
                <th className="py-1 pr-3 font-semibold">{t("entityType")}</th>
                <th className="py-1 pr-3 font-semibold">{t("birthDates")}</th>
                <th className="py-1 pr-3 font-semibold">{t("countries")}</th>
                <th className="py-1 font-semibold">{t("identifiers")}</th>
              </tr>
            </thead>
            <tbody>
              {result.preview.map((p) => (
                <tr key={p.id} className="border-t align-top">
                  <td className="py-1 pr-3 font-semibold">{p.name}</td>
                  <td className="py-1 pr-3">{p.aliases?.join(", ")}</td>
                  <td className="py-1 pr-3">{p.entity_type}</td>
                  <td className="py-1 pr-3">{p.birth_dates?.join(", ")}</td>
                  <td className="py-1 pr-3">{p.countries?.join(", ")}</td>
                  <td className="py-1">{p.identifiers?.map((i) => `${i.type ?? ""} ${i.number ?? ""}`.trim()).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
