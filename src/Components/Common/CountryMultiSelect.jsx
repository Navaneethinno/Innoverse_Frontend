import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { platformFileUrl } from "@/Services/Master/master.api";

function Flag({ country }) {
  const src = platformFileUrl(country?.image_src);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      loading="lazy"
      className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
      onError={(e) => {
        e.currentTarget.style.display = "none";
      }}
    />
  );
}

// Several countries from the /master/country list, each with its flag: the
// chosen ones as removable chips inside the field, typing filters a
// dropdown below. `value` is an array of country names.
export function CountryMultiSelect({ countries, value, onChange, placeholder, className = "" }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const byName = useMemo(() => new Map(countries.map((c) => [c.name, c])), [countries]);
  const chosen = useMemo(() => new Set(value), [value]);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return countries.filter((c) => !chosen.has(c.name) && (!q || c.name?.toLowerCase().includes(q))).slice(0, 100);
  }, [countries, chosen, query]);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => !boxRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const add = (name) => {
    onChange([...value, name]);
    setQuery("");
  };
  const remove = (name) => onChange(value.filter((v) => v !== name));

  return (
    <div ref={boxRef} className={`relative ${className}`}>
      <div
        onClick={() => setOpen(true)}
        className="flex min-h-[42px] w-full flex-wrap items-center gap-1.5 rounded-xl border bg-white px-2.5 py-1.5 text-sm focus-within:ring-2 focus-within:ring-primary/30"
      >
        {value.map((name) => (
          <span key={name} className="inline-flex items-center gap-1.5 rounded-full bg-primary-light py-0.5 pl-2 pr-1 text-xs font-semibold text-primary">
            <Flag country={byName.get(name)} />
            {name}
            <button type="button" onClick={() => remove(name)} className="rounded-full p-0.5 hover:bg-primary/10" aria-label={name}>
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (shown[0]) add(shown[0].name);
            } else if (e.key === "Backspace" && !query && value.length) {
              remove(value[value.length - 1]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={value.length ? "" : placeholder}
          className="min-w-[8rem] flex-1 bg-transparent py-0.5 outline-none"
        />
      </div>
      {open && shown.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border bg-white py-1 shadow-lg">
          {shown.map((c) => (
            <li key={c.id ?? c.name}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => add(c.name)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted"
              >
                <Flag country={c} />
                {c.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
