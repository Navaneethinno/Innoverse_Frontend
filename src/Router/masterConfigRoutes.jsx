import { lazy } from "react";
import { pageElement } from "./routeSupport";
const CustomerMasterConfigPage = lazy(() =>
  import("@/Components/Settings/MasterConfig/CustomerMasterConfigResource.jsx").then((m) => ({ default: m.CustomerMasterConfigResource })),
);
const DistrictPage = lazy(() => import("@/Components/Settings/MasterConfig/District").then((m) => ({ default: m.District })));
const ProvincePage = lazy(() => import("@/Components/Settings/MasterConfig/Province").then((m) => ({ default: m.Province })));
const VillagePage = lazy(() => import("@/Components/Settings/MasterConfig/Village").then((m) => ({ default: m.Village })));
const AccountPurposePage = lazy(() => import("@/Components/Settings/MasterConfig/AccountPurpose").then((m) => ({ default: m.AccountPurpose })));
const CategoryPage = lazy(() => import("@/Components/Settings/MasterConfig/Category").then((m) => ({ default: m.Category })));
const CitizenshipPage = lazy(() => import("@/Components/Settings/MasterConfig/Citizenship").then((m) => ({ default: m.Citizenship })));
const DesignationPage = lazy(() => import("@/Components/Settings/MasterConfig/Designation").then((m) => ({ default: m.Designation })));
const DisabilityPage = lazy(() => import("@/Components/Settings/MasterConfig/Disability").then((m) => ({ default: m.Disability })));
const EmploymentPage = lazy(() => import("@/Components/Settings/MasterConfig/Employment").then((m) => ({ default: m.Employment })));
const OccupationPage = lazy(() => import("@/Components/Settings/MasterConfig/Occupation").then((m) => ({ default: m.Occupation })));
const QualificationPage = lazy(() => import("@/Components/Settings/MasterConfig/Qualification").then((m) => ({ default: m.Qualification })));
const ReligionPage = lazy(() => import("@/Components/Settings/MasterConfig/Religion").then((m) => ({ default: m.Religion })));
const GenderPage = lazy(() => import("@/Components/Settings/MasterConfig/Gender").then((m) => ({ default: m.Gender })));
const SourceOfFundPage = lazy(() => import("@/Components/Settings/MasterConfig/SourceOfFund").then((m) => ({ default: m.SourceOfFund })));
const TurnoverPage = lazy(() => import("@/Components/Settings/MasterConfig/Turnover").then((m) => ({ default: m.Turnover })));
export const masterConfigRoutes = [{ path: "gender", element: pageElement(GenderPage) }, { path: "gender/:id", element: pageElement(GenderPage) }, { path: "district", element: pageElement(DistrictPage) }, { path: "district/:id", element: pageElement(DistrictPage) }, { path: "province", element: pageElement(ProvincePage) }, { path: "province/:id", element: pageElement(ProvincePage) }, { path: "village", element: pageElement(VillagePage) }, { path: "village/:id", element: pageElement(VillagePage) }, { path: "accountpurpose", element: pageElement(AccountPurposePage) }, { path: "accountpurpose/:id", element: pageElement(AccountPurposePage) }, { path: "account-purpose", element: pageElement(AccountPurposePage) }, { path: "account-purpose/:id", element: pageElement(AccountPurposePage) }, { path: "category", element: pageElement(CategoryPage) }, { path: "category/:id", element: pageElement(CategoryPage) }, { path: "citizenship", element: pageElement(CitizenshipPage) }, { path: "citizenship/:id", element: pageElement(CitizenshipPage) }, { path: "designation", element: pageElement(DesignationPage) }, { path: "designation/:id", element: pageElement(DesignationPage) }, { path: "disability", element: pageElement(DisabilityPage) }, { path: "disability/:id", element: pageElement(DisabilityPage) }, { path: "employment", element: pageElement(EmploymentPage) }, { path: "employment/:id", element: pageElement(EmploymentPage) }, { path: "occupation", element: pageElement(OccupationPage) }, { path: "occupation/:id", element: pageElement(OccupationPage) }, { path: "qualification", element: pageElement(QualificationPage) }, { path: "qualification/:id", element: pageElement(QualificationPage) }, { path: "religion", element: pageElement(ReligionPage) }, { path: "religion/:id", element: pageElement(ReligionPage) }, { path: "turnover", element: pageElement(TurnoverPage) }, { path: "turnover/:id", element: pageElement(TurnoverPage) }];
masterConfigRoutes.unshift({ path: "sourceoffund", element: pageElement(SourceOfFundPage) }, { path: "sourceoffund/:id", element: pageElement(SourceOfFundPage) }, { path: "source-of-fund", element: pageElement(SourceOfFundPage) }, { path: "source-of-fund/:id", element: pageElement(SourceOfFundPage) });

// The 12 new Individual Customer domain masters (2026-09), all served by
// one generic CustomerMasterConfigResource (see that file's own comment for
// why) — slug guessed from the entity name pending real sidebar menu items
// for these; update if/when a real menu_name is confirmed to differ.
const CUSTOMER_MASTER_CONFIG_ENTITIES = [
  ["maritalstatus", "marital_status"],
  ["visatype", "visa_type"],
  ["immigrationstatus", "immigration_status"],
  ["addresstype", "address_type"],
  ["relationshiptype", "relationship_type"],
  ["indvverificationstatus", "indv_verification_status"],
  ["indvverificationmethod", "indv_verification_method"],
  ["indvtaxstatus", "indv_tax_status"],
  ["indvtaxclassification", "indv_tax_classification"],
  ["indvpepstatus", "indv_pep_status"],
  ["indvpepcategory", "indv_pep_category"],
  ["ownershipsubtype", "ownership_sub_type"],
];
// Sidebar menu names for the customer masters slugify without the "indv" prefix.
CUSTOMER_MASTER_CONFIG_ENTITIES.push(
  ["verificationstatus", "indv_verification_status"],
  ["verificationmethod", "indv_verification_method"],
  ["taxstatus", "indv_tax_status"],
  ["taxclassification", "indv_tax_classification"],
  ["pepstatus", "indv_pep_status"],
  ["pepcategory", "indv_pep_category"],
);
masterConfigRoutes.push(
  ...CUSTOMER_MASTER_CONFIG_ENTITIES.flatMap(([slug, entity]) => [
    { path: slug, element: pageElement(CustomerMasterConfigPage, { entity }) },
    { path: `${slug}/:id`, element: pageElement(CustomerMasterConfigPage, { entity }) },
  ]),
);
