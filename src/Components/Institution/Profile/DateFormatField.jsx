import { Calendar } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/Components/UI/select";
import { DATE_FORMATS } from "@/Utils/Lib/dateFormat";

// The values the API accepts for `date_format` (any other is refused);
// display only, dates are still sent as YYYY-MM-DD.
const DATE_FORMAT_OPTIONS = DATE_FORMATS;

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
