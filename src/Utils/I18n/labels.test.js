import i18next from "i18next";
import { beforeAll, describe, expect, it } from "vitest";
import en from "./locales/en";
import pt from "./locales/pt";
import ar from "./locales/ar";

const BY_TEXT = { keySeparator: false, nsSeparator: false };
const i18n = i18next.createInstance();
beforeAll(() => i18n.init({ resources: { en, pt, ar }, fallbackLng: "en", interpolation: { escapeValue: false } }));

// Labels and toasts are keyed by their English text, dots and colons included.
describe("text-keyed translations", () => {
  it("translates a settings label in Portuguese and Arabic", () => {
    expect(i18n.t("Institution Legal", { ns: "labels", lng: "pt", ...BY_TEXT })).toBe("Jurídico da Instituição");
    expect(i18n.t("Institution Legal", { ns: "labels", lng: "ar", ...BY_TEXT })).toBe("الملف القانوني للمؤسسة");
  });

  it("keeps a sentence with a full stop as one key", () => {
    expect(i18n.t("Session expired. Please sign in again.", { ns: "toasts", lng: "ar", ...BY_TEXT })).toBe("انتهت الجلسة. يرجى تسجيل الدخول مرة أخرى.");
  });

  it("translates the InnoCBS / InnoTreasury screen labels", () => {
    expect(i18n.t("Interest schemes", { ns: "cbsText", lng: "pt", ...BY_TEXT })).toBe("Esquemas de juros");
    expect(i18n.t("Override allowed", { ns: "cbsText", lng: "ar", ...BY_TEXT })).toBe("يُسمح بالتجاوز");
    expect(i18n.t("A checker approves it.", { ns: "cbsText", lng: "pt", ...BY_TEXT })).toBe("Um verificador aprova-o.");
  });

  it("shows an unlisted text as it is", () => {
    expect(i18n.t("Nothing like this", { ns: "labels", lng: "ar", ...BY_TEXT, defaultValue: "Nothing like this" })).toBe("Nothing like this");
  });
});
