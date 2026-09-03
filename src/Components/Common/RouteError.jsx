import { Link, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export function RouteError() {
  const error = useRouteError();
  if (import.meta.env.DEV && error) {
    // eslint-disable-next-line no-console
    console.error(error);
  }
  return (
    <div className="flex flex-col items-center justify-center h-screen text-center gap-3">
      <AlertTriangle className="h-16 w-16 text-red-500" />
      <h1 className="text-2xl font-bold">Oops! You're lost</h1>
      <p className="text-sm font-medium text-slate-500 mb-2">
        The page you are looking for was not found.
      </p>
      <Link
        to="/dashboard"
        className="bg-red-500 text-white px-4 py-2 rounded outline-none font-medium hover:bg-red-600 transition-colors"
      >
        Back to home
      </Link>
    </div>
  );
}
export default RouteError;
