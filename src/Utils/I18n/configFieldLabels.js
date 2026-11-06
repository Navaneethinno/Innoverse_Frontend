import { useTranslation } from "react-i18next";

// Labels written as plain English in settings objects (account products,
// digital products, institution sections...) are translated by their own
// text: the `labels` translations are keyed by the English. A text not
// listed shows as it is.
export function useConfigLabel() {
  const { t } = useTranslation("labels");
  return (text) => (typeof text === "string" && text ? t(text, { keySeparator: false, nsSeparator: false, defaultValue: text }) : text);
}
