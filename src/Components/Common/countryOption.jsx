import { platformFileUrl } from "@/Services/Master/master.api";

// A /master/country row as a FilterSelect option: its flag (image_src, a
// stored platform path) before the name. `searchText` keeps search working
// with a JSX label.
export function countryOption(country) {
  const flag = platformFileUrl(country.image_src);
  return {
    value: country.id,
    searchText: country.name,
    label: (
      <span className="flex items-center gap-2">
        {flag && (
          <img
            src={flag}
            alt=""
            loading="lazy"
            className="h-3.5 w-5 shrink-0 rounded-sm object-cover"
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
        {country.name}
      </span>
    ),
  };
}
