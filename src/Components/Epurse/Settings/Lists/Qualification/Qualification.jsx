import { CodeNameMaster } from "@/Components/Epurse/Settings/Lists/CodeNameMaster";
import { qualificationApi } from "@/Services/Epurse/district.api";
import { API_ENDPOINTS } from "@/Utils/Constant";

export function Qualification() {
  return <CodeNameMaster name="Qualification" plural="Qualifications" api={qualificationApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.QUALIFICATION.LIST} />;
}
