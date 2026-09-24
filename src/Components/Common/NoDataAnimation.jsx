import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import noDataAnimation from "@/assets/animations/no-data.lottie";
import { useTranslation } from "react-i18next";

// The source file's own composition is 1024x768 (4:3) — the className here
// must keep that ratio or the canvas letterboxes the artwork inside empty
// space (same issue as LoadingAnimation.jsx; see its comment). The old
// square box plus a scale() transform compensated in the wrong place —
// matching the box's aspect ratio to the source is the actual fix.
export function NoDataAnimation({ className = "h-24 w-32" }) {
  const { t } = useTranslation();
  return (
    <DotLottieReact
      className={className}
      src={noDataAnimation}
      autoplay
      loop
      aria-label={t("common:noData")}
    />
  );
}
