import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "./locales/en";
import pt from "./locales/pt";

// Resources are assembled from one file PER LANGUAGE (locales/en.js,
// locales/pt.js, ...) rather than a single inline object holding every
// language — adding a language means adding one file here, not editing a
// shared blob. Matches payse's own per-language-file convention
// (Services/Translation/EnglishTranslation.json etc.), just as plain JS
// objects instead of JSON so each file can share sub-objects between
// namespaces if useful later.
const resources = {
  en,
  pt,
};

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: "en",
    defaultNS: "common",
    ns: ["common", "auth"],
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

export { i18n };
