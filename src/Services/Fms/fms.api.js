import { API_ENDPOINTS } from "@/Utils/Constant";
import { recordApi } from "@/Services/api/recordApi";
import { calls, request } from "@/Services/Epurse/onboarding.api";

// InnoFMS (Admin_42): fuel management. Every call is a POST under /config/fms.
const F = API_ENDPOINTS.FMS.ROOT;

// Fuel Settings (397): one document per institution under maker-checker;
// edit sends the whole document under `setup`.
export const fuelSettingsApi = {
  get: (body = {}) => request(`${F}/settings/get`, body),
  edit: ({ narration, inst_profile_id, ...setup } = {}) => request(`${F}/settings/edit`, { setup, ...(narration ? { narration } : {}), ...(inst_profile_id ? { inst_profile_id } : {}) }),
  auth: (body = {}) => request(`${F}/settings/auth`, body),
  deauth: (body = {}) => request(`${F}/settings/deauth`, body),
};

// Standard maker-checker records (the RecordScreen contract).
export const fuelProductApi = recordApi(`${F}/product`);
export const fuelPriceApi = recordApi(`${F}/price`);
export const pumpApi = recordApi(`${F}/pump`);
export const zoneApi = recordApi(`${F}/zone`);
export const discountApi = recordApi(`${F}/discount`);

// Fleet records: their own maker-checker (status ACTIVE / PENDING / ...,
// pending_action, pending values), kept for one customer (owner).
const FLEET_VERBS = ["list", "pending", "get", "add", "edit", "deactivate", "reactivate", "delete", "auth", "deauth", "audit"];
const fleet = (kind, extra = []) => ({ ...calls(`${F}/fleet/${kind}`, [...FLEET_VERBS, ...extra]), kind });
export const vehicleApi = fleet("vehicle");
export const driverApi = fleet("driver");
export const bindingApi = fleet("binding");
export const costCentreApi = fleet("cost_centre");
export const fuelLimitApi = fleet("limit", ["usage", "check"]);
// A customer's cost centres, vehicles, drivers, open cards and sellable fuels.
export const fleetOptions = (body) => request(`${F}/fleet/options`, body);

// Fuel Sales (405): one look at the forecourts; poll with the cursor.
export const fuelMonitor = (body = {}) => request(`${F}/monitor`, body);

// Fuel Reports (406).
export const fuelReportApi = calls(`${F}/report`, ["consumption", "efficiency", "odometer", "station_sales", "prices"]);
