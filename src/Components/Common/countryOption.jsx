import { platformFileUrl } from "@/Services/Master/master.api";

// A /master/country row as a FilterSelect option: its flag (image_src, a
// stored platform path) before the name. `searchText` keeps search working
// with a JSX label. The dialling code follows the name when the country has one.
export const countryName = (country) => (country.dial_code ? `${country.name} (${country.dial_code})` : country.name);
export function countryOption(country) {
  const flag = platformFileUrl(country.image_src);
  return {
    value: country.id,
    searchText: countryName(country),
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
        {countryName(country)}
      </span>
    ),
  };
}
