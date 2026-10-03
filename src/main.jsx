import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import "./Utils/I18n/i18n";
import { watchApprovals } from "./Utils/Lib/flourish";
watchApprovals();
createRoot(document.getElementById("root")).render(<App />);
