import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, ChevronDown, ChevronRight, CirclePlay, GraduationCap, Keyboard, MousePointerClick, RotateCcw, Search } from "lucide-react";
import { useGuide } from "./GuideProvider";
import { FULL, TOPICS, availableSteps, topicByKey } from "./guideTopics";

// "Guide" in the top bar: opens the panel of this page's topic tours, a
// resume row and the getting-started checklist. A pulsing dot marks a page
// whose guide hasn't been opened yet.
export function GuideButton() {
  const { t } = useTranslation("guide");
  const guide = useGuide();
  const ref = useRef(null);
  useEffect(() => {
    if (!guide?.panelOpen) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && guide.setPanelOpen(false);
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [guide]);
  if (!guide) return null;
  const { panelOpen, setPanelOpen, running, progress, pathname } = guide;
  const fresh = !progress.seen[pathname] && !running;
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        disabled={running}
        aria-expanded={panelOpen}
        aria-label={t("guide")}
        className="relative flex h-8 items-center gap-1.5 whitespace-nowrap rounded-xl border border-[var(--primary-light)] bg-primary-light px-3 text-xs font-bold text-primary transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
      >
        <GraduationCap size={14} />
        <span className="hidden md:inline">{t("guide")}</span>
        <span className="hidden rounded bg-primary px-1 text-[9px] font-black uppercase text-primary-foreground md:inline">{t("new")}</span>
        {fresh && (
          <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
          </span>
        )}
      </button>
      {panelOpen && <GuidePanel />}
    </div>
  );
}

function GuidePanel() {
  const { t } = useTranslation("guide");
  const { start, progress, modules, pages, inspect, slug, pathname } = useGuide();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [showModules, setShowModules] = useState(false);
  const topics = TOPICS.map((topic) => ({ topic, count: availableSteps(topic, slug).length })).filter((x) => x.count);
  const full = availableSteps(FULL, slug).length;
  const resume = progress.resume?.path === pathname && topicByKey(progress.resume.topic) ? progress.resume : null;

  const visited = modules.filter((m) => progress.modules[m.segment]).length;
  const checklist = [
    { key: "checkFirstTour", done: Object.keys(progress.done).some((k) => k.startsWith("any:")) },
    { key: "checkPractice", done: progress.practiced, topic: "find" },
    { key: "checkApproval", done: Boolean(progress.done["any:approval"]), topic: "approval" },
    { key: "checkAdd", done: Boolean(progress.done["any:add"]), topic: "add" },
    { key: "checkModules", done: modules.length > 0 && visited === modules.length, count: `${visited}/${modules.length}`, modules: true },
  ];
  const doneCount = checklist.filter((c) => c.done).length;
  // Search: this page's topics and every page the user can open.
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = (text) => words.every((w) => text.toLowerCase().includes(w));
  const foundTopics = words.length ? topics.filter(({ topic }) => matches(`${t(`topic_${topic.key}`)} ${t(`topic_${topic.key}Hint`)}`)) : [];
  const foundPages = words.length ? pages.filter((p) => matches(`${p.name} ${p.where}`)).slice(0, 8) : [];
  const canStart = (key) => topics.some((x) => x.topic.key === key);

  return (
    <div className="fixed inset-x-3 top-16 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-10 sm:w-[23rem] overflow-hidden rounded-2xl border bg-[var(--card)] text-[var(--card-foreground)] shadow-2xl">
      <div className="border-b bg-primary-light/60 px-4 py-3">
        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{t("guide")}</p>
        <h3 className="text-sm font-black">{t("panelTitle")}</h3>
        <label className="mt-2 flex items-center gap-2 rounded-xl border bg-[var(--card)] px-3 py-1.5">
          <Search size={14} className="shrink-0 text-muted-foreground" />
          <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("searchPlaceholder")} className="min-w-0 flex-1 bg-transparent text-xs outline-none" />
        </label>
      </div>

      <div className="max-h-[70vh] overflow-y-auto p-2">
        {words.length > 0 && (
          <div className="mb-2 grid gap-0.5">
            {!foundTopics.length && !foundPages.length && <p className="px-3 py-3 text-xs text-muted-foreground">{t("noResults")}</p>}
            {foundTopics.map(({ topic }) => (
              <button key={topic.key} type="button" onClick={() => start(topic.key)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs hover:bg-muted">
                <CirclePlay size={14} className="shrink-0 text-primary" />
                <span className="flex-1 font-semibold">{t(`topic_${topic.key}`)}</span>
                <span className="text-[10px] text-muted-foreground">{t("onThisPage")}</span>
              </button>
            ))}
            {foundPages.map((p) => (
              <button key={p.id} type="button" onClick={() => navigate(p.path)} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs hover:bg-muted">
                <ArrowRight size={14} className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{p.name}</span>
                  <span className="block truncate text-[10px] text-muted-foreground">{p.where}</span>
                </span>
              </button>
            ))}
            <div className="my-1 border-t" />
          </div>
        )}
        <button type="button" onClick={inspect} className="mb-1 flex w-full items-center gap-3 rounded-xl border border-primary/30 px-3 py-2 text-left hover:bg-muted">
          <MousePointerClick size={16} className="shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold">{t("inspect")}</span>
            <span className="block truncate text-[11px] text-muted-foreground">{t("inspectHint")}</span>
          </span>
        </button>
        {resume && (
          <button
            type="button"
            onClick={() => start(resume.topic, resume.index)}
            className="mb-1 flex w-full items-center gap-3 rounded-xl border border-dashed border-primary/50 bg-primary-light px-3 py-2 text-left hover:bg-primary-light/70"
          >
            <RotateCcw size={16} className="shrink-0 text-primary" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold">{t("resume")}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{t("resumeAt", { topic: t(`topic_${resume.topic}`), step: resume.index + 1 })}</span>
            </span>
          </button>
        )}

        {topics.length ? (
          <ul className="grid gap-0.5">
            {topics.map(({ topic, count }) => {
              const Icon = topic.icon;
              const done = progress.done[`${pathname}:${topic.key}`];
              return (
                <li key={topic.key}>
                  <button type="button" onClick={() => start(topic.key)} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-muted">
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${done ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300" : "bg-primary-light text-primary"}`}>
                      {done ? <Check size={15} /> : <Icon size={15} />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold">{t(`topic_${topic.key}`)}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{t(`topic_${topic.key}Hint`)}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-semibold text-muted-foreground">{t("steps", { count })}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="px-3 py-4 text-xs text-muted-foreground">{t("noTopics")}</p>
        )}

        {full > 0 && topics.length > 1 && (
          <button type="button" onClick={() => start("full")} className="mt-1 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground hover:bg-[var(--primary-hover)]">
            <CirclePlay size={14} /> {t("fullTour", { count: full })}
          </button>
        )}

        <div className="mt-3 rounded-xl border p-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-black">{t("gettingStarted")}</p>
            <span className="text-[11px] font-bold tabular-nums text-muted-foreground">
              {doneCount}/{checklist.length}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
          </div>
          <ul className="mt-2 grid gap-0.5">
            {checklist.map((item) => {
              const clickable = item.modules || (!item.done && item.topic && canStart(item.topic));
              return (
                <li key={item.key}>
                  <button
                    type="button"
                    disabled={!clickable}
                    onClick={() => (item.modules ? setShowModules((s) => !s) : start(item.topic))}
                    className="flex w-full items-center gap-2 rounded-lg px-1.5 py-1 text-left text-xs enabled:hover:bg-muted"
                  >
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${item.done ? "border-emerald-500 bg-emerald-500 text-white" : "border-muted-foreground/40"}`}>
                      {item.done && <Check size={10} strokeWidth={3} />}
                    </span>
                    <span className={`flex-1 ${item.done ? "text-muted-foreground line-through" : "font-semibold"}`}>{t(item.key)}</span>
                    {item.count && <span className="text-[10px] tabular-nums text-muted-foreground">{item.count}</span>}
                    {item.modules ? showModules ? <ChevronDown size={12} /> : <ChevronRight size={12} /> : clickable && <ChevronRight size={12} className="text-muted-foreground" />}
                  </button>
                  {item.modules && showModules && (
                    <ul className="mb-1 ml-6 grid gap-0.5">
                      {modules.map((m) => (
                        <li key={m.path}>
                          <button type="button" onClick={() => navigate(m.path)} className="flex w-full items-center gap-2 rounded-md px-1.5 py-0.5 text-left text-[11px] hover:bg-muted">
                            {progress.modules[m.segment] ? <Check size={11} className="text-emerald-600" /> : <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                            <span className="truncate">{m.name}</span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-[10px] text-muted-foreground">{t("savedHere")}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 border-t px-4 py-2 text-[10px] text-muted-foreground">
        <Keyboard size={12} /> {t("shortcuts")}
      </div>
    </div>
  );
}
