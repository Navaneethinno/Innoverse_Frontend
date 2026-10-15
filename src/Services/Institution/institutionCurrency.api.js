import { jsonRequest } from "@/Services/api/jsonRequest";
import { API_ENDPOINTS } from "@/Utils/Constant";
// The 13 maker-checker calls shared by Institution Currency and Phone Code.
const assignmentApi = (ENDPOINTS) => ({ add: (p) => jsonRequest(ENDPOINTS.ADD, p), submit: (p) => jsonRequest(ENDPOINTS.SUBMIT, p), edit: (p) => jsonRequest(ENDPOINTS.EDIT, p), auth: (p) => jsonRequest(ENDPOINTS.AUTH, p), deauth: (p) => jsonRequest(ENDPOINTS.DEAUTH, p), delete: (p) => jsonRequest(ENDPOINTS.DELETE, p), deleteAuth: (p) => jsonRequest(ENDPOINTS.DELETE_AUTH, p), deactivate: (p) => jsonRequest(ENDPOINTS.DEACTIVATE, p), reactivate: (p) => jsonRequest(ENDPOINTS.REACTIVATE, p), list: (p = { page: 1, limit: 10 }) => jsonRequest(ENDPOINTS.LIST, p), getActive: (p = { view: "dropdown" }) => jsonRequest(ENDPOINTS.GET_ACTIVE, p), audit: (p) => jsonRequest(ENDPOINTS.AUDIT, p), pending: (p) => jsonRequest(ENDPOINTS.PENDING, p) });
export const institutionCurrencyApi = assignmentApi(API_ENDPOINTS.INSTITUTION.INSTITUTION_CURRENCY);
export const institutionPhoneCountryApi = assignmentApi(API_ENDPOINTS.INSTITUTION.INSTITUTION_PHONE_COUNTRY);
