import { CodeNameMaster } from "@/Components/Epurse/Settings/Lists/CodeNameMaster";
import { disabilityApi } from "@/Services/Epurse/district.api";
import { API_ENDPOINTS } from "@/Utils/Constant";

export function Disability() {
  return <CodeNameMaster name="Disability" plural="Disabilities" api={disabilityApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.DISABILITY.LIST} />;
}
