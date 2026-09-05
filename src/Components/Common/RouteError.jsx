import { Link, useRouteError } from "react-router-dom";
import { AlertTriangle } from "lucide-react";

export function RouteError() {
  const error = useRouteError();
  // Previously only logged in DEV, so a genuine production error (as
  // opposed to an actual unmatched route) was invisible — this screen looks
  // identical either way, and there was no way to tell them apart from a
  // bug report alone. Always log so the real cause is at least in the
  // console if this is ever seen again.
  if (error) {
    console.error("RouteError boundary caught:", error);
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
