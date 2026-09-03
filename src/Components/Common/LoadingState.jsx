import { Skeleton } from "@/Components/UI/skeleton";
export function LoadingState({ lines = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: lines }).map((_, index) => (
        <Skeleton key={index} className="h-12 w-full rounded-xl" />
      ))}
    </div>
  );
}
