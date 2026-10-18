import { useTranslation } from "react-i18next";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { NUMBER_FORMATS } from "@/Utils/Lib/numberFormat";

// How the institution's amounts are written (number_format): WESTERN
// 1,234,567.89, INDIAN 12,34,567.89, EUROPEAN 1.234.567,89, SPACE
// 1 234 567,89.
export const numberFormatLabel = (t, value) => (value ? t(`institutions:numberFormat_${value}`, { defaultValue: value }) : "—");

export function NumberFormatField({ value, onChange }) {
  const { t } = useTranslation();
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">{t("institutions:numberFormat")}</label>
      <FilterSelect className="w-full" value={value || "WESTERN"} onChange={onChange} options={NUMBER_FORMATS.map((f) => ({ value: f, label: numberFormatLabel(t, f) }))} />
    </div>
  );
}
