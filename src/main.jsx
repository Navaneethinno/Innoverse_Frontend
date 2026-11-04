import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { i18n, loadLanguage } from "./Utils/I18n/i18n";
import { watchApprovals } from "./Utils/Lib/flourish";
import { watchEnvironment } from "./Utils/Lib/environment";
import { installSearchEnterGuard } from "@/Utils/Lib/searchEnter";

installSearchEnterGuard();
watchEnvironment();
watchApprovals();
// A field holding just 0 (a default) is selected when it gets focus, so the
// first key typed replaces it instead of landing after it ("05").
document.addEventListener("focusin", (event) => {
  const el = event.target;
  if (el instanceof HTMLInputElement && /^0([.,]0+)?$/.test(el.value)) requestAnimationFrame(() => el.select?.());
});
// The saved language first, so the first paint is not in English. A failed
// download falls back to English.
void loadLanguage(i18n.language)
  .then(() => i18n.changeLanguage(i18n.language))
  .catch(() => {})
  .finally(() => createRoot(document.getElementById("root")).render(<App />));
