
import { createRoot } from "react-dom/client";
import "./styles/index.css";
import { AppRouter } from "./app/routes/router";
import { Toaster } from "./app/components/ui/sonner";

createRoot(document.getElementById("root")!).render(
  <>
    <AppRouter />
    <Toaster />
  </>,
);
  
