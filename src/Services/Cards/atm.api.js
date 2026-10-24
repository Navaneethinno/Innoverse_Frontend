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
const device = "/config/atm/device";
export const atmsApi = {
  listPath: `${device}/list`,
  ...Object.fromEntries(
    ["list", "get", "add", "edit", "auth", "deauth", "block", "unblock", "retire", "command", "events", "port_start", "port_stop"].map((verb) => [verb, (body) => request(`${device}/${verb}`, body ?? {})]),
  ),
  tmkComponent: (body) => request(`${device}/tmk_component`, body),
  profiles: (body) => request("/config/atm/profile/list", body ?? {}),
  ports: (body) => request("/config/atm/port/list", body ?? {}),
};
// One download to every ACTIVE ATM: { part?, parallel? (1-8) }; poll get
// for { status (RUNNING | DONE | INTERRUPTED), counts, items }.
export const atmBatchesApi = {
  listPath: "/config/atm/batch/list",
  list: (body) => request("/config/atm/batch/list", body ?? {}),
  get: (body) => request("/config/atm/batch/get", body),
  download: (body) => request("/config/atm/batch/download", body ?? {}),
};
