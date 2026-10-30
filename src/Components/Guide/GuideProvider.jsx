import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import i18n from "i18next";
import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { useAuth } from "@/Hooks/useAuth";
import { discoverFieldSteps } from "@/Components/Tour/discoverFields";
import { menuPathForItem, moduleDashboardPath } from "@/Pages/Sidebar/menuRouteMap";
import { menuLabel, parentMenuLabel } from "@/Pages/Sidebar/menuLabels";
import { GuideInspector } from "./GuideInspector";
import { pageAbout } from "./pageControls";
import { GuideOverlay } from "./GuideOverlay";
import { useGuideProgress } from "./guideProgress";
import { PAGE_TITLE, availableSteps, formSteps, sel, slugOf, topicByKey } from "./guideTopics";

// The new guide (beside the old "Take a tour" until it replaces it): short
// topic tours per page, practice steps, resume, a getting-started checklist
// and keyboard control. Started only by the user; it never changes data —
// a form it opens stays open with whatever was typed.

const GuideContext = createContext(null);
export const useGuide = () => useContext(GuideContext);

const sleep = (ms) => new Promise((r) => window.setTimeout(r, ms));
const nextFrame = () => new Promise((r) => window.requestAnimationFrame(() => window.requestAnimationFrame(r)));
const modalCount = () => document.querySelectorAll(sel("modal-body")).length;
const typing = (el) => el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
const firstSegment = (path) => path.split("/").filter(Boolean)[0] ?? "";

async function bringIntoView(target) {
  const el = typeof target === "string" ? document.querySelector(target) : target;
  if (!el) return;
  el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
  await nextFrame();
}

// After clicking Add: a new modal is open or the page changed (a wizard),
// plus time for it to render.
async function waitForForm(modalsBefore, pathBefore) {
  const started = Date.now();
  while (Date.now() - started < 3000 && modalCount() <= modalsBefore && window.location.pathname === pathBefore) await sleep(80);
  await sleep(400);
}

const pageName = () => {
  const header = document.querySelector(PAGE_TITLE);
  return (header?.querySelector("h1,h2") ?? header)?.textContent?.trim() || i18n.t("tour:thisPage");
};

export function GuideProvider({ children }) {
  const { t } = useTranslation(["guide", "tour"]);
  const { pathname } = useLocation();
  const user = useAuth((s) => s.user);
  const menus = useSelector((state) => state.menu.menuArray);
  const [progress, setProgress] = useGuideProgress(user?.user_id ?? user?.username);
  const [run, setRun] = useState(null); // { topic, steps, index, path }
  const [waiting, setWaiting] = useState(false);
  const [practiced, setPracticed] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  // "What's this?" mode: hover anything for its explanation.
  const [inspecting, setInspecting] = useState(false);
  const followingRef = useRef(false);

  // The text of a step, with {{page}} and the step's own values.
  const withText = useCallback(
    (step) => {
      if (step.title && step.content) return step;
      // The page's own written introduction, when there is one.
      if (step.id === "pageIntro" && pageAbout()) return { ...step, title: pageName(), content: pageAbout() };
      const vars = { page: pageName(), ...step.vars?.() };
      return { ...step, title: t(`tour:${step.id}Title`, vars), content: t(`tour:${step.id}Body`, vars) };
    },
    [t],
  );

  const runRef = useRef(null);
  useEffect(() => {
    runRef.current = run;
  }, [run]);

  // Finished: the topic is ticked off on this page (and counts once for the checklist). Left halfway: kept to resume
  // (not Add, whose form is gone by then).
  const stop = useCallback(
    (finished = false) => {
      const current = runRef.current;
      setRun(null);
      setWaiting(false);
      if (!current) return;
      setProgress((p) =>
        finished
          ? { done: { ...p.done, [`${current.path}:${current.topic}`]: true, [`any:${current.topic}`]: true }, resume: null }
          : current.topic !== "add" && current.index > 0
            ? { resume: { path: window.location.pathname, topic: current.topic, index: current.index } }
            : {},
      );
    },
    [setProgress],
  );

  // A guide belongs to its page, unless the guide itself moved (Add opened a wizard).
  useEffect(() => {
    if (followingRef.current) followingRef.current = false;
    else stop();
    setPanelOpen(false);
    setInspecting(false);
  }, [pathname, stop]);

  // Modules visited, for the checklist.
  useEffect(() => {
    const segment = firstSegment(pathname);
    if (segment && !progress.modules[segment]) setProgress((p) => ({ modules: { ...p.modules, [segment]: true } }));
  }, [pathname, progress.modules, setProgress]);

  const goTo = useCallback(async (index, steps, extra = {}) => {
    await bringIntoView(steps[index]?.target);
    setPracticed(false);
    setRun((current) => current && { ...current, steps, index, ...extra });
  }, []);

  const start = useCallback(
    async (topicKey, at = 0) => {
      const slug = slugOf(pathname);
      const steps = availableSteps(topicByKey(topicKey), slug).map(withText);
      if (!steps.length) return;
      setPanelOpen(false);
      setProgress((p) => ({ seen: { ...p.seen, [pathname]: true }, resume: null }));
      const index = Math.min(at, steps.length - 1);
      await bringIntoView(steps[index].target);
      setPracticed(false);
      setRun({ topic: topicKey, steps, index, path: pathname });
    },
    [pathname, setProgress, withText],
  );

  const next = useCallback(async () => {
    if (!run || waiting) return;
    const { steps, index } = run;
    const step = steps[index];
    if (!step.click) {
      if (index >= steps.length - 1) return stop(true);
      return goTo(index + 1, steps);
    }
    // Open the form, then swap in its steps.
    setWaiting(true);
    const modalsBefore = modalCount();
    const pathBefore = window.location.pathname;
    followingRef.current = true;
    step.click.click();
    await waitForForm(modalsBefore, pathBefore);
    if (window.location.pathname === pathBefore) followingRef.current = false;
    const form = formSteps(slugOf(window.location.pathname), discoverFieldSteps(i18n.getFixedT(null, "tour"))).map(withText);
    setWaiting(false);
    if (!form.length) return stop(true);
    form[0] = { ...form[0], hideBack: true };
    await goTo(index + 1, [...steps.slice(0, index + 1), ...form]);
  }, [goTo, run, stop, waiting, withText]);

  const back = useCallback(() => {
    if (run && run.index > 0) void goTo(run.index - 1, run.steps);
  }, [goTo, run]);

  // Practice: the step moves on once the user does it on the highlighted element.
  const step = run?.steps[run.index];
  useEffect(() => {
    const practice = step?.practice;
    if (!practice) return undefined;
    let timer;
    const onEvent = (e) => {
      const el = document.querySelector(step.target);
      if (!el?.contains(e.target)) return;
      setPracticed(true);
      setProgress(() => ({ practiced: true }));
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void next(), practice.event === "input" ? 1400 : 900);
    };
    document.addEventListener(practice.event, onEvent, true);
    return () => {
      document.removeEventListener(practice.event, onEvent, true);
      window.clearTimeout(timer);
    };
  }, [step, next, setProgress]);

  // Keys: → / Enter next, ← back, Esc close while running; ? opens the guide.
  useEffect(() => {
    const onKey = (e) => {
      if (run) {
        if (e.key === "Escape") return stop();
        if (typing(document.activeElement) && e.key !== "Escape") return;
        if (e.key === "ArrowRight" || e.key === "Enter") {
          e.preventDefault();
          void next();
        } else if (e.key === "ArrowLeft") back();
        return;
      }
      if (e.key === "?" && !typing(document.activeElement) && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setPanelOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, next, run, stop]);

  // The user's modules (from the backend's menus), for the checklist.
  const modules = useMemo(() => {
    const seen = new Map();
    for (const m of menus ?? []) {
      if (m?.status !== 1 || !m.module_name || seen.has(m.module_name)) continue;
      const path = moduleDashboardPath(m.module_name);
      seen.set(m.module_name, { name: m.module_label || m.module_name, path, segment: firstSegment(path) });
    }
    return [...seen.values()];
  }, [menus]);

  // Every page the user can open (the backend's menus), for the panel's search.
  const pages = useMemo(() => {
    const active = (menus ?? []).filter((m) => m?.status === 1);
    const parents = new Set(active.map((m) => String(m.parent_menu_id ?? "")));
    return active
      .filter((m) => !parents.has(String(m.menu_id)))
      .map((m) => ({ id: m.menu_id, name: menuLabel(m), where: [m.module_label || m.module_name, parentMenuLabel(m)].filter(Boolean).join(" › "), path: menuPathForItem(m, active) }));
  }, [menus]);

  const value = useMemo(
    () => ({
      start,
      running: Boolean(run) || inspecting,
      progress,
      modules,
      pages,
      panelOpen,
      setPanelOpen,
      inspect: () => {
        setPanelOpen(false);
        setInspecting(true);
      },
      slug: slugOf(pathname),
      pathname,
    }),
    [start, run, inspecting, progress, modules, pages, panelOpen, pathname],
  );

  return (
    <GuideContext.Provider value={value}>
      {children}
      {run && (
        <GuideOverlay
          step={step}
          index={run.index}
          total={run.steps.length}
          topicLabel={t(`guide:topic_${run.topic}`)}
          waiting={waiting}
          practiced={practiced}
          onNext={() => void next()}
          onBack={back}
          onClose={() => stop()}
        />
      )}
      {inspecting && <GuideInspector onClose={() => setInspecting(false)} />}
    </GuideContext.Provider>
  );
}
