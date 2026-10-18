import { useState } from "react";
import { Bell, LayoutGrid, Search, Users } from "lucide-react";
import { useStoredFileUrl } from "@/Components/Common/FileUploadField";
import { SegmentedSwitch } from "@/Components/Common/SegmentedSwitch";
import { deriveBrandThemeVars, isValidHexColor } from "@/Utils/Lib/colorTheme";

// Surfaces for each mode; the brand only changes the accent colours, as in
// the real app (theme.css keeps its own light/dark surfaces).
const SURFACES = {
  light: { page: "#f4f6fb", panel: "#ffffff", border: "#e5e7eb", text: "#0f172a", muted: "#64748b" },
  dark: { page: "#0b1220", panel: "#111827", border: "#1f2937", text: "#f1f5f9", muted: "#94a3b8" },
};

const hex = (value) => (isValidHexColor(value) ? value : null);

// A small mock of the admin screen (sidebar, top bar, a card, buttons) in
// the branding being edited, in light or dark. It reads the form as it is,
// so every change shows straight away; nothing is saved or applied.
export function BrandingPreview({ form, download }) {
  const [mode, setMode] = useState("light");
  const dark = mode === "dark";
  const light = { primary: hex(form.primary_color_light), secondary: hex(form.secondary_color_light) };
  const colors = dark ? { primary: hex(form.primary_color_dark) ?? light.primary, secondary: hex(form.secondary_color_dark) ?? light.secondary } : light;
  const vars = deriveBrandThemeVars({ primary: colors.primary ?? "#2563eb", secondary: colors.secondary ?? "#dbeafe" }, mode);
  const s = SURFACES[mode];

  const logo = useStoredFileUrl(dark && form.logo_dark ? form.logo_dark : form.logo, download);
  const background = useStoredFileUrl(form.login_background, download);
  const favicon = useStoredFileUrl(form.favicon, download);
  const name = form.display_name?.trim() || "Institution name";

  const mark = logo.url ? (
    <img src={logo.url} alt="" className="h-7 w-7 rounded-lg bg-white object-contain p-0.5" />
  ) : (
    <span className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-black" style={{ background: vars["--primary"], color: vars["--primary-foreground"] }}>
      {name.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-semibold">Live preview</p>
        <SegmentedSwitch
          value={mode}
          onChange={setMode}
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
        />
      </div>
      <div className="grid gap-3">
        {/* App screen */}
        <div className="flex h-64 overflow-hidden rounded-xl text-[11px]" style={{ ...vars, background: s.page, color: s.text, border: `1px solid ${s.border}` }}>
          <aside className="hidden w-36 shrink-0 flex-col gap-2 p-2 sm:flex" style={{ background: s.panel, borderRight: `1px solid ${s.border}` }}>
            <div className="flex items-center gap-2 rounded-lg p-1.5" style={{ border: `1px solid ${s.border}` }}>
              {mark}
              <span className="truncate font-bold">{name}</span>
            </div>
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ border: `1px solid ${s.border}`, color: s.muted }}>
              <Search size={11} /> Search
            </div>
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5 font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>
              <LayoutGrid size={11} /> Module
            </div>
            <div className="flex items-center gap-1.5 rounded-lg px-2 py-1.5" style={{ background: "var(--primary-light)", color: "var(--primary)" }}>
              <Users size={11} /> Active menu
            </div>
          </aside>
          <div className="flex min-w-0 flex-1 flex-col gap-2 p-2">
            <div className="flex items-center justify-between rounded-lg px-2 py-1.5" style={{ background: s.panel, border: `1px solid ${s.border}` }}>
              <span className="flex items-center gap-1.5 font-bold sm:hidden">{mark}{name}</span>
              <span className="hidden font-bold sm:inline">Dashboard</span>
              <span className="flex items-center gap-2" style={{ color: s.muted }}>
                <Bell size={12} />
                <span className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>A</span>
              </span>
            </div>
            <div className="flex-1 rounded-lg p-3" style={{ background: s.panel, border: `1px solid ${s.border}` }}>
              <p className="text-[9px] font-bold uppercase tracking-widest" style={{ color: "var(--primary)" }}>Pending requests</p>
              <p className="mt-1 text-2xl font-black">12</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full" style={{ background: "var(--primary-light)" }}>
                <div className="h-full w-2/3 rounded-full" style={{ background: "var(--primary)" }} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>Primary</span>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ background: "var(--secondary)", color: "var(--secondary-foreground)" }}>Secondary</span>
                <span className="rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ border: "1px solid var(--primary)", color: "var(--primary)" }}>Outline</span>
              </div>
            </div>
          </div>
        </div>

        {/* Login screen + browser tab */}
        <div className="flex flex-col gap-2">
          <div
            className="relative flex h-44 items-center justify-center overflow-hidden rounded-xl bg-cover bg-center"
            style={{ ...vars, background: background.url ? `center / cover url(${background.url})` : s.page, border: `1px solid ${s.border}` }}
          >
            <div className="w-32 rounded-lg p-2 text-[9px] shadow-md" style={{ background: s.panel, color: s.text }}>
              <div className="mb-1.5 flex items-center gap-1 font-bold">{mark}<span className="truncate">{name}</span></div>
              <div className="mb-1 h-3 rounded" style={{ border: `1px solid ${s.border}` }} />
              <div className="mb-1.5 h-3 rounded" style={{ border: `1px solid ${s.border}` }} />
              <div className="rounded py-1 text-center font-bold" style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}>Sign in</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 truncate rounded-t-lg border border-border bg-muted/60 px-2 py-1 text-[10px]">
            {favicon.url ? <img src={favicon.url} alt="" className="h-3.5 w-3.5 object-contain" /> : <span className="h-3.5 w-3.5 rounded-sm bg-muted-foreground/30" />}
            <span className="truncate">{name}</span>
          </div>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">Preview only. Changes apply after you save and a checker authorizes them.</p>
    </div>
  );
}
