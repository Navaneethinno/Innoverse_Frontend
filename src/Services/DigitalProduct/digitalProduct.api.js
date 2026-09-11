import { API_BASE_URL } from "@/Utils/Constant";
import { getAccessToken } from "@/Services/api/authStorage";
import { DEVICE_INFO } from "@/Services/Auth/auth.service";

async function request(path, body = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, { method: "POST", headers: { "Content-Type": "application/json", Deviceinfo: JSON.stringify(DEVICE_INFO), ...(getAccessToken() ? { Authorization: `Bearer ${getAccessToken()}` } : {}) }, body: JSON.stringify(body) });
  const data = await response.json().catch(() => null);
  if (!response.ok || String(data?.status).toLowerCase() === "fail") throw new Error(data?.remark || data?.message || "Request failed");
  return data;
}

export const digitalProductApi = (entity) => {
  const base = `/digital_product/${entity}`;
  return { add: (p) => request(`${base}/add`, p), submit: (p) => request(`${base}/submit`, p), edit: (p) => request(`${base}/edit`, p), auth: (p) => request(`${base}/auth`, p), deauth: (p) => request(`${base}/deauth`, p), delete: (p) => request(`${base}/delete`, p), deleteAuth: (p) => request(`${base}/delete_auth`, p), list: (p) => request(`${base}/list`, p), getActive: (p = {}) => request(`${base}/get_active`, p), audit: (p) => request(`${base}/audit`, p), deactivate: (p) => request(`${base}/deactivate`, p), reactivate: (p) => request(`${base}/reactivate`, p) };
};
