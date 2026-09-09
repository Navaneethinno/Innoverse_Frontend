import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function LoadingAnimation({ className = "h-24 w-24" }) {
  return (
    <DotLottieReact
      className={className}
      src="/assets/animations/loading.lottie"
      loop
      autoplay
      aria-label="Loading"
    />
  );
}
