import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{description}</span>
        {onRetry ? (
          <button className="text-sm font-medium underline" onClick={onRetry}>
            Retry
          </button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
