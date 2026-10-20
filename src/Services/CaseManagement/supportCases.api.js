import { request } from "@/Services/Epurse/onboarding.api";
import { downloadFile, uploadFile } from "@/Services/api/fileTransfer";

// CASE MANAGEMENT > Customer Cases (menu 186): support cases customers and
// merchants open themselves (a category, a subject, a message and files).
// Staff answer as a conversation and close in one step (no checker), with
// outcome RESOLVED; a customer's withdrawal closes it as WITHDRAWN. Every
// action replies with the case, as get does.
const BASE = "/config/case/support";
const call = (verb) => (body) => request(`${BASE}/${verb}`, body);

export const supportCasesApi = {
  listPath: `${BASE}/list`,
  list: call("list"),
  get: call("get"),
  assign: call("assign"),
  note: call("note"),
  message: call("message"),
  close: call("close"),
  upload: (fields) => uploadFile(`${BASE}/upload`, fields),
  file: (body) => downloadFile(`${BASE}/file`, body),
};
