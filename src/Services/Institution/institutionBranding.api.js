import { jsonRequest } from "@/Services/api/jsonRequest";
import { API_ENDPOINTS } from "@/Utils/Constant";
import { downloadFile, uploadFile } from "@/Services/api/fileTransfer";
const ENDPOINTS = API_ENDPOINTS.INSTITUTION.INSTITUTION_BRANDING;
export const institutionBrandingApi = { add: (p) => jsonRequest(ENDPOINTS.ADD, p), submit: (p) => jsonRequest(ENDPOINTS.SUBMIT, p), edit: (p) => jsonRequest(ENDPOINTS.EDIT, p), auth: (p) => jsonRequest(ENDPOINTS.AUTH, p), deauth: (p) => jsonRequest(ENDPOINTS.DEAUTH, p), delete: (p) => jsonRequest(ENDPOINTS.DELETE, p), deleteAuth: (p) => jsonRequest(ENDPOINTS.DELETE_AUTH, p), deactivate: (p) => jsonRequest(ENDPOINTS.DEACTIVATE, p), reactivate: (p) => jsonRequest(ENDPOINTS.REACTIVATE, p), list: (p = { page: 1, limit: 10 }) => jsonRequest(ENDPOINTS.LIST, p), getActive: (p = { view: "dropdown" }) => jsonRequest(ENDPOINTS.GET_ACTIVE, p), audit: (p) => jsonRequest(ENDPOINTS.AUDIT, p), pending: (p) => jsonRequest(ENDPOINTS.PENDING, p),
  // Every portal, in order, and whether the institution has a branding for it: [{ portal, free, branding_id, status, ... }].
  options: (p = {}) => jsonRequest(ENDPOINTS.OPTIONS, p),
  // Logo/favicon: { inst_profile_id, field: "logo" | "favicon", file } -> { path, ... }; file: { inst_profile_id, path } -> Blob.
  upload: (fields) => uploadFile(ENDPOINTS.UPLOAD, fields), file: (p) => downloadFile(ENDPOINTS.FILE, p) };
