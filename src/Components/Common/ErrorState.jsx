import { AlertCircle } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Alert, AlertDescription, AlertTitle } from "@/Components/UI/alert";
export function ErrorState({ title, description, onRetry }) {
  const { t } = useTranslation("common");
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{description}</span>
        {onRetry ? (
          <button className="text-sm font-medium underline" onClick={onRetry}>
            {t("retry")}
          </button>
        ) : null}
      </AlertDescription>
    </Alert>
  );
}
