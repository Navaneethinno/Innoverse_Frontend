import { CodeNameMaster } from "@/Components/Epurse/Settings/Lists/CodeNameMaster";
import { religionApi } from "@/Services/Epurse/district.api";
import { API_ENDPOINTS } from "@/Utils/Constant";

export function Religion() {
  return <CodeNameMaster name="Religion" plural="Religions" api={religionApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.RELIGION.LIST} />;
}
