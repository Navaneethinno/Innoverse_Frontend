import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import Joyride, { ACTIONS, EVENTS, STATUS } from "react-joyride";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { notifications } from "@/Utils/Lib/notifications";
import { TourTooltip } from "./TourTooltip";
import { discoverFieldSteps, formRoot } from "./discoverFields";
import { ACTION_STEPS, ADD_STEP, FOOTER_STEPS, LIST_STEPS, MAKER_CHECKER_STEP, PAGE_TITLE, PAGE_TOURS, sel } from "./tourSteps";

const TourContext = createContext({ start: () => {}, running: false });
export const useTour = () => useContext(TourContext);

const find = (target) => (typeof target === "string" ? (target === "body" ? null : document.querySelector(target)) : target);
const present = (target) => Boolean(find(target));
const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));
const nextFrame = () => new Promise((r) => window.requestAnimationFrame(() => window.requestAnimationFrame(r)));
const slugOf = (path) => path.split("/").filter(Boolean)[0] ?? "";
const modalCount = () => document.querySelectorAll(sel("modal-body")).length;

// Joyride measures a target once, before its own smooth scroll ends, and
// doesn't follow a scrolling modal body — the spotlight lands off target.
// So scroll the target to the middle of its own scroll container instantly
// first, then let Joyride measure a target that is already still.
async function bringIntoView(target) {
  const el = find(target);
  if (!el) return;
  el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  await nextFrame();
}

// After clicking Add: resolves once a new modal is open or the page has
// changed (a wizard on its own route), plus time for it to render and
// finish its entry animation.
async function waitForForm(modalsBefore, pathBefore) {
  const started = Date.now();
  while (Date.now() - started < 3000 && modalCount() <= modalsBefore && window.location.pathname === pathBefore) await sleep(80);
  await sleep(400);
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
  // Set while the tour itself moves to another page (Add opens a wizard).
  const followingRef = useRef(false);

  const stop = useCallback(() => {
    setRun(false);
    setIndex(0);
  }, []);
  // A tour belongs to its page — unless the tour itself navigated.
  useEffect(() => {
    if (followingRef.current) followingRef.current = false;
    else stop();
  }, [pathname, stop]);

  const toJoyride = useCallback(
    (step, extra = {}) => {
      const header = document.querySelector(PAGE_TITLE);
      const page = (header?.querySelector("h1,h2") ?? header)?.textContent?.trim() || t("thisPage");
      const vars = { page, ...(step.vars?.() ?? {}) };
      return {
        target: step.center ? "body" : step.target,
        placement: step.center ? "center" : (step.placement ?? "auto"),
        title: step.title ?? t(`${step.id}Title`, vars),
        content: step.content ?? t(`${step.id}Body`, vars),
        disableBeacon: true,
        data: { click: step.click },
        ...extra,
      };
    },
    [t],
  );

  // The steps for the form now open: the page's own walkthrough if it has
  // one, else one step per field found; then how to save.
  const formSteps = useCallback(
    (slug) => {
      const own = PAGE_TOURS[slug]?.form;
      const fields = own?.length ? own.filter((s) => present(s.target)) : discoverFieldSteps(t);
      const footer = FOOTER_STEPS.filter((s) => present(s.target));
      const saveSteps = footer.length ? footer : present(sel("modal-footer")) ? [{ id: "formSave", target: sel("modal-footer"), placement: "top" }] : [];
      const all = [...fields, ...saveSteps].map((s) => toJoyride(s));
      if (all.length) all[0].hideBackButton = true;
      return all;
    },
    [t, toJoyride],
  );

  const goTo = useCallback(async (next, list) => {
    await bringIntoView(list[next]?.target);
    setIndex(next);
  }, []);

  const start = useCallback(async () => {
    const slug = slugOf(pathname);
    const page = PAGE_TOURS[slug] ?? {};
    const list = [...LIST_STEPS, ...ACTION_STEPS, ...(page.list ?? [])].filter((s) => present(s.target));
    let built = list.map((s) => toJoyride(s));
    if (built.length) built.push(toJoyride(MAKER_CHECKER_STEP));
    if (present(ADD_STEP.target)) {
      // Next on Add opens the form; its steps are built once it's open.
      // A placeholder keeps Add from being the last step (Joyride would end
      // the tour on it); it's replaced by the form's steps.
      built.push(toJoyride({ ...ADD_STEP, id: "addOpens", click: `${ADD_STEP.target} button` }), toJoyride({ id: "formLoading", center: true }));
    } else if (!built.length && formRoot()) {
      // A page that is itself a form (settings, a wizard step).
      built = formSteps(slug);
      if (built[0]) built[0].hideBackButton = false;
    }
    if (!built.length) {
      notifications.info(t("noTour"));
      return;
    }
    setSteps(built);
    await bringIntoView(built[0].target);
    setIndex(0);
    setRun(true);
  }, [formSteps, pathname, t, toJoyride]);

  const onEvent = useCallback(
    async ({ action, index: at, status, type }) => {
      if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status) || action === ACTIONS.CLOSE) return stop();
      if (type === EVENTS.TARGET_NOT_FOUND) return goTo(at + (action === ACTIONS.PREV ? -1 : 1), steps);
      if (type !== EVENTS.STEP_AFTER) return;
      if (action === ACTIONS.PREV) return goTo(at - 1, steps);
      const click = steps[at]?.data?.click;
      if (!click) return goTo(at + 1, steps);

      // Pause while the form opens, then swap in its steps and resume on
      // the first one — changing steps and index while running makes
      // Joyride flash the previous tooltip where the next one belongs.
      const modalsBefore = modalCount();
      const pathBefore = window.location.pathname;
      setRun(false);
      followingRef.current = true;
      document.querySelector(click)?.click();
      await waitForForm(modalsBefore, pathBefore);
      if (window.location.pathname === pathBefore) followingRef.current = false;
      const form = formSteps(slugOf(window.location.pathname));
      if (!form.length) return stop();
      const next = [...steps.slice(0, at + 1), ...form];
      setSteps(next);
      await goTo(at + 1, next);
      await nextFrame();
      setRun(true);
    },
    [formSteps, goTo, steps, stop],
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
        disableScrolling
        disableScrollParentFix
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
