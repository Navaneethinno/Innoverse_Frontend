import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import "./Utils/I18n/i18n";
import { watchApprovals } from "./Utils/Lib/flourish";
watchApprovals();
// A field holding just 0 (a default) is selected when it gets focus, so the
// first key typed replaces it instead of landing after it ("05").
document.addEventListener("focusin", (event) => {
  const el = event.target;
  if (el instanceof HTMLInputElement && /^0([.,]0+)?$/.test(el.value)) requestAnimationFrame(() => el.select?.());
});
createRoot(document.getElementById("root")).render(<App />);
