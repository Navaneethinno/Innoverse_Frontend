import { Sparkles } from "lucide-react";
import { cn } from "@/Utils/Lib/cn";

// The single place the brand mark (icon + gradient) is defined. Previously
// this was reinvented twice with two different icons (Sparkles in TopBar,
// Shield on the login screen) and two different gradients (the shared
// bg-brand-gradient token in TopBar, a hardcoded from-blue-400/500/600 on
// the login screen) — changing the mark meant finding and editing every
// place it had been copy-pasted. Both now render this component.
// Shadow is baked into each size (not left to caller-supplied className)
// because two shadow-* utilities both targeting box-shadow would otherwise
// collide unpredictably — which one wins depends on generated stylesheet
// order, not the order classes appear in the string.
const SIZES = {
  sm: { box: "w-6 h-6 rounded-lg", icon: 11, shadow: "shadow-sm" },
  md: { box: "w-9 h-9 rounded-xl", icon: 16, shadow: "shadow-md" },
  lg: { box: "w-14 h-14 rounded-[18px]", icon: 26, shadow: "shadow-xl shadow-blue-300/40" },
};

export function Logo({ size = "md", className }) {
  const { box, icon, shadow } = SIZES[size] ?? SIZES.md;
  return (
    <div
      className={cn("shrink-0 flex items-center justify-center bg-brand-gradient", box, shadow, className)}
    >
      <Sparkles size={icon} className="text-white" />
    </div>
  );
}
