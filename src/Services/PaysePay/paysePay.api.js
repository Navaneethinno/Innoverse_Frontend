import { API_ENDPOINTS } from "@/Utils/Constant";
import { request } from "@/Services/Epurse/onboarding.api";

const P = API_ENDPOINTS.PAYSE_DOC;

// One settings document per institution under maker-checker: get, edit
// (the whole document), auth, deauth. `wrap` puts the edit body under
// `setup` for the documents that take it that way (Guest Payments).
const doc = (base, { wrap = false } = {}) => ({
  get: (body = {}) => request(`${base}/get`, body),
  edit: ({ narration, inst_profile_id, ...rest } = {}) =>
    request(`${base}/edit`, {
      ...(wrap ? { setup: rest } : rest),
      ...(narration ? { narration } : {}),
      ...(inst_profile_id ? { inst_profile_id } : {}),
    }),
  auth: (body = {}) => request(`${base}/auth`, body),
  deauth: (body = {}) => request(`${base}/deauth`, body),
});

export const autopayApi = { ...doc(P.AUTOPAY_SETUP), schedules: (body) => request(P.AUTOPAY_SCHEDULE_LIST, body) };
export const payRequestApi = doc(P.PAY_REQUEST);
export const paymentRequestApi = { list: (body) => request(P.PAYMENT_REQUEST_LIST, body) };
export const deviceSecurityApi = doc(P.DEVICE_SECURITY);
export const boundDeviceApi = {
  list: (body) => request(P.BOUND_DEVICE_LIST, body),
  unbind: (body) => request(`${P.BOUND_DEVICE}/unbind`, body),
  auth: (body) => request(`${P.BOUND_DEVICE}/auth`, body),
  deauth: (body) => request(`${P.BOUND_DEVICE}/deauth`, body),
};
export const guestPayApi = doc(P.GUEST_PAY, { wrap: true });
export const partnerApi = { ...doc(P.PARTNER_API), keyIssue: (body) => request(P.PARTNER_API_KEY_ISSUE, body) };
export const cardRiskApi = doc(P.CARD_RISK);
