import { CodeNameMaster } from "@/Components/Epurse/Settings/Lists/CodeNameMaster";
import { employmentApi } from "@/Services/Epurse/district.api";
import { API_ENDPOINTS } from "@/Utils/Constant";

export function Employment() {
  return <CodeNameMaster name="Employment" plural="Employments" api={employmentApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.EMPLOYMENT.LIST} />;
}
