import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/Utils/Lib/cn";

// Tiny icon-only copy-to-clipboard button — briefly swaps to a checkmark on
// success instead of a toast, since it's meant to sit inline next to short
// identifiers (audit keys, ids) without disrupting the surrounding layout.
export function CopyButton({ value, className, size = 11 }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (event) => {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be unavailable (insecure context, permission
      // denied) — fail silently rather than showing an alarming error for
      // what's a minor convenience action.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy to clipboard"}
      aria-label="Copy to clipboard"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded p-0.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600",
        className,
      )}
    >
      {copied ? <Check size={size} className="text-emerald-500" /> : <Copy size={size} />}
    </button>
  );
}
