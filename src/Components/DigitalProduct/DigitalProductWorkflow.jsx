import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { HorizontalStepper } from "@/Components/Common/HorizontalStepper";
import { getMenuIcon } from "@/Pages/Sidebar/moduleIcons";
import { DIGITAL_PRODUCT_STEPS } from "./digitalProductSteps";
import { DigitalProductResource } from "./DigitalProductResource";

// Navigation-only shell around the existing DigitalProductResource — it does
// not touch that component's listing/Add/Edit/View/audit logic at all, it
// only decides which `entity` gets passed to it and renders the horizontal
// stepper above it. Mounted at the same routes digitalProductRoutes.jsx
// already registered for each module (/digitalproduct, /productmap, ...),
// so every existing deep link still resolves; clicking a step just
// navigates to that module's own existing route, same as the sidebar used
// to, so back/forward and bookmarks keep working.
export function DigitalProductWorkflow({ entity }) {
  const navigate = useNavigate();
  const steps = useMemo(
    () => DIGITAL_PRODUCT_STEPS.map((step) => ({ ...step, icon: getMenuIcon(step.label) })),
    [],
  );
  const activeIndex = Math.max(0, steps.findIndex((step) => step.entity === entity));

  return (
    <div>
      <div
        className="mb-4 overflow-hidden rounded-2xl px-4 pb-4 pt-4"
        style={{
          background: "var(--glass-bg)",
          backdropFilter: "blur(16px)",
          border: "1px solid var(--glass-border)",
          boxShadow: "var(--glass-shadow)",
        }}
      >
        <p className="mb-3 text-[11px] font-bold uppercase tracking-widest text-blue-500">
          Digital Product · Step {activeIndex + 1} of {steps.length}
        </p>
        <HorizontalStepper
          steps={steps}
          activeIndex={activeIndex}
          onStepClick={(_, step) => navigate(`/${step.path}/${crypto.randomUUID()}`)}
        />
      </div>
      <DigitalProductResource entity={entity} />
    </div>
  );
}
