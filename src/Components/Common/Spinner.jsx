import { Loader2 } from "lucide-react";

// Small inline spinner for buttons awaiting an API response.
export function Spinner({ size = 14, className = "" }) {
  return <Loader2 size={size} className={`animate-spin ${className}`} />;
}
