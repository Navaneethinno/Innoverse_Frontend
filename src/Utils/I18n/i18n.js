import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en";

// Resources are assembled from one file PER LANGUAGE (locales/en.js,
// locales/pt.js, ...) rather than a single inline object holding every
// language — adding a language means adding one file here, not editing a
// shared blob. Matches payse's own per-language-file convention
// (Services/Translation/EnglishTranslation.json etc.), just as plain JS
// objects instead of JSON so each file can share sub-objects between
// namespaces if useful later.
const resources = {
  en,
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    partialBundledLanguages: true,
    fallbackLng: "en",
    defaultNS: "common",
    ns: [
      "campaigns",
      "common",
      "cards",
      "auth",
      "login",
      "layout",
      "institutions",
      "profiles",
      "users",
      "dashboard",
      "forgotPassword",
      "approvals",
      "setup",
      "changePassword",
      "sidebar",
      "routes",
      "statusLabels",
      "onboarding",
      "customer",
      "myProfile",
      "notification",
      "risk",
      "aml",
      "reports",
      "tour",
      "guide",
      "formBuilder",
      "limits",
      "accounts",
      "cases",
      "deposits",
      "loans",
      "txn",
      "fees",
      "documents",
      "builder",
      "providers",
      "accounting",
      "kycReport",
      "mms",
      "bulkReg",
      "recon",
      "routing",
      "atm",
      "statements",
      "treasury",
      "regReports",
      "monitoring",
      "expiry",
      "toasts",
      "labels",
      "masters",
      "appVersions",
      "ops",
      "paysePay",
      "keyCustody",
      "corebank",
      "record",
      "cbsText",
    ],
    interpolation: { escapeValue: false },
    detection: {
      // Same localStorage key the language dropdown's own apiLanguage.js
      // helper uses (see LanguageDropdown.jsx) — one key, one source of
      // truth for "which language is selected" driving both this (UI
      // string translation) and the x-api-lang request header (backend
      // message translation), instead of two separate persisted values
      // that could drift out of sync.
      order: ["localStorage", "navigator", "htmlTag"],
      lookupLocalStorage: "apiLang",
      caches: ["localStorage"],
    },
  });


// Other languages load when first used, so nobody downloads all of them.
const OTHERS = { pt: () => import("./locales/pt"), ar: () => import("./locales/ar") };
export async function loadLanguage(lng) {
  const code = String(lng ?? "").split("-")[0];
  if (!OTHERS[code] || i18n.hasResourceBundle(code, "common")) return;
  const { default: bundle } = await OTHERS[code]();
  Object.entries(bundle).forEach(([ns, data]) => i18n.addResourceBundle(code, ns, data, true, true));
}
const switchLanguage = i18n.changeLanguage.bind(i18n);
i18n.changeLanguage = async (lng, callback) => {
  await loadLanguage(lng);
  return switchLanguage(lng, callback);
};

export { i18n };
