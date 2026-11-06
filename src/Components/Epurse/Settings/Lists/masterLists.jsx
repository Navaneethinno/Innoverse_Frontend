import { CodeNameMaster } from "@/Components/Epurse/Settings/Lists/CodeNameMaster";
import { accountPurposeApi, designationApi, disabilityApi, districtApi, employmentApi, genderApi, occupationApi, provinceApi, qualificationApi, religionApi, sourceOfFundApi, villageApi } from "@/Services/Epurse/district.api";
import { API_ENDPOINTS } from "@/Utils/Constant";

// Every code-and-name master list: one shared screen, set per list.
const SOURCEOFFUND_FIELDS = [{ key: "has_employer", kind: "bool" }];
const DISTRICT_FIELDS = [{ key: "province_id", kind: "parent", parent: "province", load: districtApi.activeProvinces }];
const VILLAGE_FIELDS = [{ key: "district_id", kind: "parent", parent: "district", load: districtApi.getActive }];

export function Religion() {
  return <CodeNameMaster list="religion" permission="Religion" idKey="religion_id" api={religionApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.RELIGION.LIST} />;
}

export function Occupation() {
  return <CodeNameMaster list="occupation" permission="Occupation" idKey="occupation_id" api={occupationApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.OCCUPATION.LIST} />;
}

export function Qualification() {
  return <CodeNameMaster list="qualification" permission="Qualification" idKey="qualification_id" api={qualificationApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.QUALIFICATION.LIST} />;
}

export function Designation() {
  return <CodeNameMaster list="designation" permission="Designation" idKey="designation_id" api={designationApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.DESIGNATION.LIST} />;
}

export function Disability() {
  return <CodeNameMaster list="disability" permission="Disability" idKey="disability_id" api={disabilityApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.DISABILITY.LIST} />;
}

export function Employment() {
  return <CodeNameMaster list="employment" permission="Employment" idKey="employment_id" api={employmentApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.EMPLOYMENT.LIST} />;
}

export function Gender() {
  return <CodeNameMaster list="gender" permission="Gender" idKey="gender_id" api={genderApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.GENDER.LIST} />;
}

export function AccountPurpose() {
  return <CodeNameMaster list="accountPurpose" permission="Account Purpose" idKey="account_purpose_id" api={accountPurposeApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.ACCOUNT_PURPOSE.LIST} />;
}

export function SourceOfFund() {
  return <CodeNameMaster list="sourceOfFund" permission="Source of Fund" idKey="source_of_fund_id" api={sourceOfFundApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.SOURCE_OF_FUND.LIST} fields={SOURCEOFFUND_FIELDS} />;
}

export function Province() {
  return <CodeNameMaster list="province" permission="Province" idKey="province_id" api={provinceApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.PROVINCE.LIST} />;
}

export function District() {
  return <CodeNameMaster list="district" permission="District" idKey="district_id" api={districtApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.DISTRICT.LIST} fields={DISTRICT_FIELDS} />;
}

export function Village() {
  return <CodeNameMaster list="village" permission="Village" idKey="village_id" api={villageApi} endpoint={API_ENDPOINTS.MASTER_CONFIG.VILLAGE.LIST} fields={VILLAGE_FIELDS} />;
}
