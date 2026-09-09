import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import loadingAnimation from "@/assets/animations/loading.lottie";

export function LoadingAnimation({ className = "h-24 w-24" }) {
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
