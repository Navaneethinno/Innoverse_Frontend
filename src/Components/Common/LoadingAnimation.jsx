import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import loadingAnimation from "@/assets/animations/loading.lottie";

// The source file's own composition is 800x200 (a wide 4:1 banner, not a
// square icon) — every call site's className must keep that 4:1 ratio, or
// the canvas letterboxes the artwork down to a thin strip inside a mostly
// empty square box (confirmed via the raw .lottie's animation JSON: w:800,
// h:200). The scale() transform previously here was a workaround for that
// same squashing that only made it worse — it enlarged the letterboxed
// strip without changing the box it was centered in, so it could bleed
// past the container instead of actually filling it. Matching the box's
// aspect ratio to the source fixes the root cause; no transform needed.
export function LoadingAnimation({ className = "h-16 w-64" }) {
  return (
    <DotLottieReact
      className={className}
      src={loadingAnimation}
      loop
      autoplay
      aria-label="Loading"
    />
  );
}
