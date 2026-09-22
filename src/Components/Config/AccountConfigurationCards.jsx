import { ArrowRight, Pencil } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ACCOUNT_CONFIGURATIONS } from "./acctConfigurations";
import { useConfigLabel } from "@/Utils/I18n/configFieldLabels";

// Pure navigation/status UI — every card links to an existing
// AcctConfigResource.jsx route (see acctConfigurations.js) or, for a
// disabled one, back to this same product's own existing Edit form;
// nothing here duplicates a form, an API call, or validation. Shows all 16
// configurations regardless of enabled state, so the grid reads as "here is
// every configuration this product could have" rather than hiding the ones
// not turned on yet.
export function AccountConfigurationCards({ product, onNavigate, onEditProduct }) {
  const navigate = useNavigate();
  const tr = useConfigLabel();

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {ACCOUNT_CONFIGURATIONS.map(({ entity, enabledField, label, description, icon: Icon, route }) => {
        const isEnabled = Boolean(product?.[enabledField]);
        return (
          <button
            key={entity}
            type="button"
            onClick={() => {
              // Close the modal before navigating away, or it stays mounted
              // on top of the page it just linked to — the modal doesn't
              // unmount itself just because the URL changed underneath it.
              onNavigate?.();
              if (isEnabled) {
                navigate(`/${route}/${crypto.randomUUID()}`);
              } else {
                // Not enabled yet on this product — there's nothing to
                // configure on the sub-entity's own page (it would just be
                // an empty list with no way to associate a record with this
                // product). The actual enable/disable flag lives on the
                // Account Product record itself, so route to editing THAT
                // instead of pretending the sub-config page is the answer.
                onEditProduct?.();
              }
            }}
            className="group flex min-h-[9.5rem] flex-col rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition-colors hover:border-primary hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              {/* Fixed icon box on every card, regardless of which icon it
                  holds, so every title starts at the exact same horizontal
                  position across the whole grid. */}
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-light text-primary">
                <Icon size={18} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold leading-tight text-slate-800">{tr(label)}</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">{tr(description)}</p>
              </div>
            </div>
            {/* mt-auto pins status + action to the bottom of every card
                regardless of description length, so the row never drifts
                vertically from one card to the next. */}
            <div className="mt-auto flex items-center justify-between pt-3">
              {isEnabled ? (
                <span className="rounded-full bg-[var(--success-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-success">
                  {tr("Enabled")}
                </span>
              ) : (
                <span className="rounded-full bg-[var(--destructive-soft)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-destructive">
                  {tr("Disabled")}
                </span>
              )}
              {isEnabled ? (
                <span className="flex items-center gap-1 text-xs font-bold text-primary">
                  {tr("Configure")} <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-bold text-primary">
                  <Pencil size={12} /> {tr("Enable in Edit")}
                </span>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}
