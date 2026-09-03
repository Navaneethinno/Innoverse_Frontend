import i18n from "i18next";
import { initReactI18next } from "react-i18next";
const resources = {
  en: {
    common: {
      appName: "Innoverse",
      cancel: "Cancel",
      retry: "Retry",
      settings: "Settings",
      signOut: "Sign out",
    },
    auth: {
      login: "Login",
      setup: "Setup",
    },
  },
};
void i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  defaultNS: "common",
  ns: ["common", "auth"],
  interpolation: { escapeValue: false },
});
export { i18n };
