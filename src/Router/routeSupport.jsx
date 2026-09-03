import { Suspense } from "react";
import { Skeleton } from "@/Components/UI/skeleton";
export const pageFallback = (
  <div className="min-h-screen pt-20 pb-12 px-4 bg-[#F9FAFB]">
    <div className="mx-auto max-w-6xl space-y-4">
      <Skeleton className="h-10 w-64" />
      <Skeleton className="h-64 w-full rounded-2xl" />
    </div>
  </div>
);
export function pageElement(Page) {
  return (
    <Suspense fallback={pageFallback}>
      <Page />
    </Suspense>
  );
}
