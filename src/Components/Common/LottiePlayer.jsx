import { Suspense, lazy } from "react";

const DotLottieReact = lazy(() =>
  import("@lottiefiles/dotlottie-react").then((module) => ({ default: module.DotLottieReact })),
);

// The animation player, downloaded the first time one is shown. Its box keeps
// the same size while it arrives, so the page doesn't jump.
export function LottiePlayer({ className, ...props }) {
  return (
    <Suspense fallback={<div className={className} aria-hidden="true" />}>
      <DotLottieReact className={className} {...props} />
    </Suspense>
  );
}
