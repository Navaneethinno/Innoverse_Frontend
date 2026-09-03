import { Link } from "react-router-dom";
import { ShieldAlert } from "lucide-react";

export function AccessDenied() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-white gap-3">
      <ShieldAlert className="h-16 w-16 text-red-500" />
      <h1 className="text-2xl font-bold">Access Denied!</h1>
      <p className="text-sm font-medium text-slate-500">
        You must be logged in to view this page.
      </p>
      <Link
        to="/login"
        className="bg-red-500 text-white px-4 py-2 rounded mt-2 outline-none font-medium hover:bg-red-600 transition-colors"
      >
        Back to login
      </Link>
    </div>
  );
}
export default AccessDenied;
