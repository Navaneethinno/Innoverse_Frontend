import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, Globe } from "lucide-react";
import { useLanguages } from "@/Hooks/Master/masterHooks";
import { getApiLanguage, onApiLanguageChange, setApiLanguage } from "@/Utils/Lib/apiLanguage";
import { cn } from "@/Utils/Lib/cn";

// Same tolerant field-name fallback already used for /master/language
// elsewhere (AddInstitutionProfile.jsx) — the confirmed response shape
// isn't nailed down to one exact key set.
function languageCode(language) {
  return typeof language === "string" ? language : language.code ?? language.id ?? language.language_code;
}
function languageLabel(language) {
  return typeof language === "string"
    ? language
    : (language.name ?? language.language_name ?? languageCode(language));
}

// The two languages actually confirmed working against the backend so far
// (English default, Portuguese via x-api-lang: pt) — used before login
// (when /master/language can't be called yet) or if that call fails.
const FALLBACK_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "pt", name: "Portuguese" },
];

// Selects the language the backend translates each response's `message`
// field into (x-api-lang header — see apiLanguage.js). Sourced from the
// real /master/language endpoint rather than payse's hardcoded flag list,
// since Innoverse actually has that reference-data endpoint live. Used on
// both the login page and the authenticated app's top bar — one shared
// component so the two never drift out of sync the way payse's own login
// vs. header dropdowns did.
export function LanguageDropdown({ className }) {
  const { languages } = useLanguages();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(getApiLanguage());
  const ref = useRef(null);

  useEffect(() => onApiLanguageChange(setSelected), []);

  useEffect(() => {
    function handleClick(event) {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // /master/language requires an authenticated session (like every other
  // master endpoint), so it can't be relied on for the LOGIN page's own
  // dropdown — falls back to the two languages actually confirmed working
  // against the backend so far; the live list (once authenticated) takes
  // over automatically as soon as it loads.
  const options = languages.length > 0 ? languages : FALLBACK_LANGUAGES;
  const current = options.find((language) => languageCode(language) === selected) ?? options[0];

  return (
    <div className={cn("relative", className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100"
        style={{ background: "var(--glass-bg)", border: "1px solid var(--glass-border)" }}
      >
        <Globe size={13} className="shrink-0 text-slate-400" />
        <span className="max-w-[6rem] truncate">{languageLabel(current)}</span>
        <ChevronDown size={12} className="shrink-0 text-slate-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-full z-50 mt-1.5 max-h-64 w-44 overflow-y-auto rounded-xl border py-1 shadow-lg"
            style={{ background: "var(--popover)", borderColor: "var(--glass-border)" }}
          >
            {options.map((language) => {
              const code = languageCode(language);
              const active = code === selected;
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => {
                    setApiLanguage(code);
                    setSelected(code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-xs font-medium hover:bg-slate-50",
                    active ? "text-blue-600" : "text-slate-600",
                  )}
                >
                  {languageLabel(language)}
                  {active && <Check size={13} className="shrink-0" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
