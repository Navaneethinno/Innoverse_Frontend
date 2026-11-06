import { CodeNameMaster } from "@/Components/Epurse/Settings/Lists/CodeNameMaster";
import { occupationApi } from "@/Services/Epurse/district.api";
import { API_ENDPOINTS } from "@/Utils/Constant";

export function Occupation() {
  return <CodeNameMaster name="Occupation" plural="Occupations" api={occupationApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.OCCUPATION.LIST} />;
}
