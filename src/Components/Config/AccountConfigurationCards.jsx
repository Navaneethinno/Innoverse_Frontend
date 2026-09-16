import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ACCOUNT_CONFIGURATIONS } from "./acctConfigurations";

// Pure navigation/status UI — every card links to an existing
// AcctConfigResource.jsx route (see acctConfigurations.js); nothing here
// duplicates a form, an API call, or validation. Only configurations the
// given product has actually enabled (product[enabledField] === true) are
// shown, matching the product's own Ownership/Party Type/.../Statement
// config-enabled checkboxes set on Add/Edit.
export function AccountConfigurationCards({ product, onNavigate }) {
  const navigate = useNavigate();
  const enabled = ACCOUNT_CONFIGURATIONS.filter((item) => Boolean(product?.[item.enabledField]));

  if (enabled.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-200 px-4 py-14 text-center">
        <p className="text-sm font-semibold text-slate-600">No configurations enabled</p>
        <p className="max-w-xs text-xs text-slate-400">
          Enable one of the config checkboxes on this product to see it here.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {enabled.map(({ entity, label, description, icon: Icon, route }) => (
        <button
          key={entity}
          type="button"
          onClick={() => {
            // Close the "Configure" modal before navigating away, or it
            // stays mounted on top of the page it just linked to — the
            // modal doesn't unmount itself just because the URL changed
            // underneath it.
            onNavigate?.();
            navigate(`/${route}/${crypto.randomUUID()}`);
          }}
          className="group flex min-h-[9.5rem] flex-col rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition-colors hover:border-primary hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            {/* Fixed icon box on every card, regardless of which icon it
                holds, so every title starts at the exact same horizontal
                position across the whole grid. */}
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
              <Icon size={18} strokeWidth={1.8} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight text-slate-800">{label}</p>
              <p className="mt-1 text-xs leading-snug text-slate-500">{description}</p>
            </div>
          </div>
          {/* mt-auto pins status + action to the bottom of every card
              regardless of description length, so the "Configure" row
              never drifts vertically from one card to the next. */}
          <div className="mt-auto flex items-center justify-between pt-3">
            <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
              Enabled
            </span>
            <span className="flex items-center gap-1 text-xs font-bold text-primary">
              Configure <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </button>
      ))}
    </div>
  );
}
