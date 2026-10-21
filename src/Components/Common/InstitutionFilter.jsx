import { useTranslation } from "react-i18next";
import { Building2 } from "lucide-react";
import { FilterSelect } from "@/Components/Common/FilterSelect";
import { useInstitutionsQuery } from "@/Hooks/Institution/institutionHooks";
import { useCanChooseInstitution } from "@/Hooks/useInstitutionScope";
import { setInstitutionFilter, useInstitutionFilter } from "@/Utils/Lib/institutionFilter";

// The top bar's Institution filter, for System and service-provider users:
// every list then shows that institution's records only (see
// institutionFilter.js). Options are the institutions the user may see.
export function InstitutionFilter({ className }) {
  const canChoose = useCanChooseInstitution();
  return canChoose ? <InstitutionPicker className={className} /> : null;
}

function InstitutionPicker({ className }) {
  const { t } = useTranslation("layout");
  const value = useInstitutionFilter();
  const { data: institutions = [] } = useInstitutionsQuery({ limit: 100 });
  return (
    <div className={className}>
      <span className="flex items-center gap-1.5">
        <Building2 size={13} className="shrink-0 text-muted-foreground" />
        <FilterSelect
          size="sm"
          className="w-44"
          value={value}
          onChange={setInstitutionFilter}
          options={[{ value: "", label: t("allInstitutions") }, ...institutions.map((i) => ({ value: String(i.id ?? i.inst_profile_id), label: i.name ?? i.inst_profile_name ?? i.code }))]}
        />
      </span>
    </div>
  );
}
