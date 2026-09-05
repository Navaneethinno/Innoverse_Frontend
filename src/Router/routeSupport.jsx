import { Component, Suspense } from "react";
import { Skeleton } from "@/Components/UI/skeleton";
export const pageFallback = (
  <div className="min-h-screen pt-20 pb-12 px-4 bg-[#F9FAFB]">
    <div className="mx-auto max-w-6xl space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  </div>
);

const CHUNK_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|dynamically imported module/i;
const RELOAD_FLAG_KEY = "innoverse:chunk-reload-attempted";

// Every lazy-loaded route component references a specific, content-hashed
// chunk filename from whatever build was live when the page was first
// loaded. After a new deploy, that old filename no longer exists on the
// CDN — clicking to navigate there in an already-open tab makes the
// dynamic import() reject, which Suspense does NOT catch (it only handles
// pending promises, not errors), so it bubbled up as an uncaught render
// error straight to the route's errorElement (RouteError, "Oops! You're
// lost") — visually identical to a real 404, and RouteError only
// console.errors in dev, so in production the actual cause was invisible.
// This boundary catches specifically that failure mode and reloads the
// page once (sessionStorage guards against a reload loop if the app is
// genuinely broken) instead of showing a false "page not found".
class ChunkErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error) {
    if (CHUNK_ERROR_PATTERN.test(String(error?.message || ""))) {
      try {
        if (!window.sessionStorage.getItem(RELOAD_FLAG_KEY)) {
          window.sessionStorage.setItem(RELOAD_FLAG_KEY, "1");
          window.location.reload();
        }
      } catch {
        // sessionStorage unavailable (e.g. privacy mode) — fall through to
        // rendering the fallback below rather than crashing.
      }
    }
  }
  render() {
    if (this.state.error) {
      if (CHUNK_ERROR_PATTERN.test(String(this.state.error?.message || ""))) {
        // A reload was already triggered in componentDidCatch (or isn't
        // possible); show the loading skeleton rather than a hard crash
        // while that happens.
        return this.props.fallback;
      }
      // A genuine error, not a stale-chunk fetch failure — rethrow so it
      // bubbles to the route's errorElement (RouteError) as before.
      throw this.state.error;
    }
    return this.props.children;
  }
}

export function pageElement(Page) {
  return (
    <ChunkErrorBoundary fallback={pageFallback}>
      <Suspense fallback={pageFallback}>
        <Page />
      </Suspense>
    </ChunkErrorBoundary>
  );
}
