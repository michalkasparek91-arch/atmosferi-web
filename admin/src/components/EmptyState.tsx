import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  message: string;
  submessage?: string;
  buttonLabel?: string;
  onButtonClick?: () => void;
}

const EmptyState = ({ message, submessage, buttonLabel, onButtonClick }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
    <div className="flex flex-col items-center">
      <p className="text-sm text-muted-foreground font-medium">{message}</p>
      {submessage && <p className="text-xs text-muted-foreground mt-1">{submessage}</p>}
      <div className="h-4" />
      {buttonLabel && onButtonClick ? (
        <Button onClick={onButtonClick} className="rounded-full">
          {buttonLabel}
        </Button>
      ) : (
        <div className="h-10" />
      )}
    </div>
  </div>
);

export default EmptyState;
