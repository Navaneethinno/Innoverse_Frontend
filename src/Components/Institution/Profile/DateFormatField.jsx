import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/UI/select";

// Matches the `date_format` string the real /institution/profile/add and
// /edit endpoints expect verbatim (confirmed via Postman collection, e.g.
// "DD-MM-YYYY" in the sample body) — these are just the common choices a
// picker offers; the value sent to the API is unchanged, still a plain
// string in this same format.
const DATE_FORMAT_OPTIONS = [
  "DD-MM-YYYY",
  "MM-DD-YYYY",
  "YYYY-MM-DD",
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY/MM/DD",
];

export function DateFormatField({ label, value, onChange }) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label ?? t("institutions:dateFormat")}</label>
      <Select value={value || undefined} onValueChange={onChange}>
        <SelectTrigger className="w-full rounded-xl bg-muted border-border h-auto py-2.5 px-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar size={14} className="text-muted-foreground shrink-0" />
            <SelectValue placeholder={t("institutions:selectDateFormat")} />
          </div>
        </SelectTrigger>
        <SelectContent>
          {DATE_FORMAT_OPTIONS.map((format) => (
            <SelectItem key={format} value={format}>
              {format}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
