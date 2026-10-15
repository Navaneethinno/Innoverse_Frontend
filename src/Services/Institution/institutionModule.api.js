import { jsonRequest } from "@/Services/api/jsonRequest";
import { API_ENDPOINTS } from "@/Utils/Constant";

const ENDPOINTS = API_ENDPOINTS.INSTITUTION.INSTITUTION_MODULE;


export const institutionModuleApi = {
  add: (payload) => jsonRequest(ENDPOINTS.ADD, payload),
  submit: (payload) => jsonRequest(ENDPOINTS.SUBMIT, payload),
  edit: (payload) => jsonRequest(ENDPOINTS.EDIT, payload),
  auth: (payload) => jsonRequest(ENDPOINTS.AUTH, payload),
  deauth: (payload) => jsonRequest(ENDPOINTS.DEAUTH, payload),
  delete: (payload) => jsonRequest(ENDPOINTS.DELETE, payload),
  deleteAuth: (payload) => jsonRequest(ENDPOINTS.DELETE_AUTH, payload),
  deactivate: (payload) => jsonRequest(ENDPOINTS.DEACTIVATE, payload),
  reactivate: (payload) => jsonRequest(ENDPOINTS.REACTIVATE, payload),
  list: (payload = { page: 1, limit: 10 }) => jsonRequest(ENDPOINTS.LIST, payload),
  getActive: (payload = { view: "dropdown" }) => jsonRequest(ENDPOINTS.GET_ACTIVE, payload),
  audit: (payload) => jsonRequest(ENDPOINTS.AUDIT, payload),
  pending: (payload) => jsonRequest(ENDPOINTS.PENDING, payload),
};
