import { Skeleton } from "@/Components/UI/skeleton";
import { LoadingAnimation } from "@/Components/Common/LoadingAnimation";
export function LoadingState({ lines = 3 }) {
  return (
    <div className="space-y-4">
      <div className="flex justify-center py-2">
        <LoadingAnimation className="h-16 w-64" />
      </div>
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}
