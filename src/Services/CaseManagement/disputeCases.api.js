import { request } from "@/Services/Epurse/onboarding.api";
import { downloadFile, uploadFile } from "@/Services/api/fileTransfer";

// CASE MANAGEMENT > Disputes (menu 204): a support case about one
// transaction (its RRN), raised by the customer or by staff. Closed with an
// outcome (RESOLVED / REJECTED), or settled by a Balance Adjustment, which
// closes it as ADJUSTED. Every action replies with the case, as get does.
const BASE = "/config/case/dispute";
const call = (verb) => (body) => request(`${BASE}/${verb}`, body);

export const disputeCasesApi = {
  listPath: `${BASE}/list`,
  list: call("list"),
  get: call("get"),
  open: call("open"),
  assign: call("assign"),
  note: call("note"),
  message: call("message"),
  close: call("close"),
  upload: (fields) => uploadFile(`${BASE}/upload`, fields),
  file: (body) => downloadFile(`${BASE}/file`, body),
};
