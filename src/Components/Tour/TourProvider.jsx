import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { notifications } from "@/Utils/Lib/notifications";
import { TourTooltip } from "./TourTooltip";
import { ACTION_STEPS, ADD_STEP, FOOTER_STEPS, LIST_STEPS, MAKER_CHECKER_STEP, PAGE_TOURS } from "./tourSteps";

const TourContext = createContext({ start: () => {}, running: false });
export const useTour = () => useContext(TourContext);

const present = (selector) => Boolean(selector && document.querySelector(selector));

// Resolves once `selector` is on the page (the form has opened), or after
// `timeout` ms either way.
function waitFor(selector, timeout = 3000) {
  return new Promise((resolve) => {
    const started = Date.now();
    const tick = () => (present(selector) || Date.now() - started > timeout ? resolve() : window.setTimeout(tick, 80));
    tick();
  });
}

// One tour for whatever page is open, started only from "Take a tour" —
// never on its own. It doesn't touch any data: Skip or the X just end it,
// and a form it opened stays open with whatever was typed in it.
export function TourProvider({ children }) {
  const { t } = useTranslation("tour");
  const { pathname } = useLocation();
  const [steps, setSteps] = useState([]);
  const [index, setIndex] = useState(0);
  const [run, setRun] = useState(false);

  const stop = useCallback(() => {
    setRun(false);
    setIndex(0);
  }, []);
  // A tour belongs to its page.
  useEffect(stop, [pathname, stop]);

  const toJoyride = useCallback(
    (step, extra = {}) => {
      const page = document.querySelector('[data-tour="page-title"]')?.textContent?.trim() || t("thisPage");
      return {
        target: step.center ? "body" : step.target,
        placement: step.center ? "center" : (step.placement ?? "auto"),
        title: t(`${step.id}Title`),
        content: t(`${step.id}Body`, { page }),
        disableBeacon: true,
        data: { click: step.click },
        ...extra,
      };
    },
    [t],
  );

  const start = useCallback(() => {
    const slug = pathname.split("/").filter(Boolean)[0] ?? "";
    const page = PAGE_TOURS[slug] ?? {};
    const list = [...LIST_STEPS, ...ACTION_STEPS].filter((s) => present(s.target));
    const pageList = (page.list ?? []).filter((s) => present(s.target));
    const built = [...list, ...pageList].map((s) => toJoyride(s));
    if (built.length) built.push(toJoyride(MAKER_CHECKER_STEP));
    if (present(ADD_STEP.target)) {
      const form = page.form ?? [];
      // With a form tour, Next on Add opens the form and walks it.
      built.push(toJoyride({ ...ADD_STEP, id: form.length ? "addOpens" : "add", click: form.length ? `${ADD_STEP.target} button` : undefined }));
      [...form, ...(form.length ? FOOTER_STEPS : [])].forEach((s, i) => built.push(toJoyride(s, i === 0 ? { hideBackButton: true } : {})));
    }
    if (!built.length) {
      notifications.info(t("noTour"));
      return;
    }
    setSteps(built);
    setIndex(0);
    setRun(true);
  }, [pathname, t, toJoyride]);

  const onEvent = useCallback(
    async ({ action, index: at, status, type }) => {
      if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE) return stop();
      if (type === EVENTS.TARGET_NOT_FOUND) return setIndex(at + (action === ACTIONS.PREV ? -1 : 1));
      if (type !== EVENTS.STEP_AFTER) return;
      if (action === ACTIONS.PREV) return setIndex(at - 1);
      const click = steps[at]?.data?.click;
      if (click) {
        document.querySelector(click)?.click();
        await waitFor(steps[at + 1]?.target);
        // Let the modal finish its entry animation before measuring.
        await new Promise((r) => window.setTimeout(r, 250));
      }
      setIndex(at + 1);
    },
    [steps, stop],
  );

  const value = useMemo(() => ({ start, running: run }), [start, run]);

  return (
    <TourContext.Provider value={value}>
      {children}
      <Joyride
        steps={steps}
        stepIndex={index}
        run={run}
        continuous
        showSkipButton
        scrollToFirstStep
        scrollOffset={96}
        disableOverlayClose
        spotlightPadding={6}
        tooltipComponent={TourTooltip}
        callback={(data) => void onEvent(data)}
        floaterProps={{ styles: { arrow: { color: "var(--card)" } }, disableAnimation: true }}
        styles={{
          options: { zIndex: 10000, arrowColor: "var(--card)", primaryColor: "var(--primary)", overlayColor: "rgba(15, 23, 42, 0.55)" },
          spotlight: { borderRadius: 12 },
        }}
      />
    </TourContext.Provider>
  );
}
