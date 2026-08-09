import { ErrorBoundary } from "../components/ErrorBoundary";
import { BrowserRouter } from "react-router";
import App from "../App";

export function AppRouter() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ErrorBoundary>
  );
}
