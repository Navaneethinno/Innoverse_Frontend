import { CodeNameMaster } from "@/Components/Epurse/Settings/Lists/CodeNameMaster";
import { designationApi } from "@/Services/Epurse/district.api";
import { API_ENDPOINTS } from "@/Utils/Constant";

export function Designation() {
  return <CodeNameMaster name="Designation" plural="Designations" api={designationApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.DESIGNATION.LIST} />;
}
