import { AlertCircle, X } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export interface LoginError {
  code: string;
  message: string;
  details?: string;
}

interface ErrorMessageProps {
  error: LoginError | null;
  onDismiss?: () => void;
}

export default function ErrorMessage({ error, onDismiss }: ErrorMessageProps) {
  if (!error) return null;

  return (
    <Alert variant="destructive" className="mb-4" role="alert" aria-live="polite">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle className="flex items-center justify-between">
        <span>Login Error</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onDismiss}
            className="h-4 w-4 p-0 hover:bg-transparent"
            aria-label="Dismiss error"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </AlertTitle>
      <AlertDescription>{error.message}</AlertDescription>
    </Alert>
  );
}
