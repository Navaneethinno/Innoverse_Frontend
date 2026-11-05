import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

// InnoCMS › ATMs (menu 187): the bank's ATMs (NDC), maker-checker on add and
// edit. `keys` holds the master key (two custodians, tmk_component), the
// communications key the ATM last accepted, and tmk_pending. command, port
// start / stop need an ACTIVE ATM; command also a connected one.
//   command: { id, command (DOWNLOAD | IN_SERVICE | OUT_OF_SERVICE |
//     SUPPLY_COUNTERS | CONFIG_INFO | CONFIG_ID | CANCEL), part? (DOWNLOAD:
//     FULL | KEY | MISC | STATES | SCREENS | FIT | EMV) }
//   events: { id, event?, page, limit } newest first
//   port_stop: { id, mode? (DRAIN | FORCE) }
const device = API_ENDPOINTS.ATM.DEVICE;
export const atmsApi = {
  listPath: `${device}/list`,
  ...Object.fromEntries(
    ["list", "get", "add", "edit", "auth", "deauth", "block", "unblock", "retire", "command", "events", "port_start", "port_stop"].map((verb) => [verb, (body) => request(`${device}/${verb}`, body ?? {})]),
  ),
  tmkComponent: (body) => request(`${device}/tmk_component`, body),
  profiles: (body) => request(API_ENDPOINTS.ATM.PROFILE_LIST, body ?? {}),
  ports: (body) => request(API_ENDPOINTS.ATM.PORT_LIST, body ?? {}),
};
// One download to every ACTIVE ATM: { part?, parallel? (1-8) }; poll get
// for { status (RUNNING | DONE | INTERRUPTED), counts, items }.
export const atmProfilesApi = {
  listPath: API_ENDPOINTS.ATM.PROFILE_LIST,
  list: (body) => request(API_ENDPOINTS.ATM.PROFILE_LIST, body ?? {}),
  get: (body) => request(API_ENDPOINTS.ATM.PROFILE_GET, body),
};
export const atmBatchesApi = {
  listPath: API_ENDPOINTS.ATM.BATCH_LIST,
  list: (body) => request(API_ENDPOINTS.ATM.BATCH_LIST, body ?? {}),
  get: (body) => request(API_ENDPOINTS.ATM.BATCH_GET, body),
  download: (body) => request(API_ENDPOINTS.ATM.BATCH_DOWNLOAD, body ?? {}),
};
