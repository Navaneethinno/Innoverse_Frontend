import { request } from "@/Services/Epurse/onboarding.api";
import { downloadFile, uploadFile } from "@/Services/api/fileTransfer";

// InnoAML > AML Cases (menu 185): the same case object, queue and two-step
// decision as Onboarding Cases, about an active customer. `raise` takes
// { flag_id } | { screening_id } | { customer_kind, reference_id } with a
// reason (and optional priority, title, first message); one open case per
// customer, so raising again adds to it. Every action replies with the case.
const BASE = "/config/case/aml";
const call = (verb) => (body) => request(`${BASE}/${verb}`, body);

export const amlCasesApi = {
  listPath: `${BASE}/list`,
  list: call("list"),
  get: call("get"),
  raise: call("raise"),
  assign: call("assign"),
  note: call("note"),
  message: call("message"),
  propose: call("propose"),
  decide: call("decide"),
  // Files on the conversation: { id, file } -> { path, name } (sent with a
  // message as files: [{ path, name }]); file { id, path } -> a Blob.
  upload: (fields) => uploadFile(`${BASE}/upload`, fields),
  file: (body) => downloadFile(`${BASE}/file`, body),
};
