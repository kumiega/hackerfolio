import { cn } from "@/lib/utils";
import { useStepper } from "./stepper";
import { Fragment } from "react/jsx-runtime";

interface StepIndicatorProps {
  className?: string;
}

function StepIndicator({ className }: StepIndicatorProps) {
  const { steps, activeStep } = useStepper();

  return (
    <div className={cn("font-mono flex items-center gap-1 px-2 bg-neutral-200 max-w-max", className)}>
      {Array.from({ length: steps.length }).map((_, index) => (
        <Fragment key={steps[index].label}>
          <div className={cn(activeStep === index ? "text-primary" : "text-muted-foreground")}>#{index + 1}</div>
          {index !== steps.length - 1 && (
            <div className="h-0 w-5 border-t-2 border-dashed border-muted-foreground/33"></div>
          )}
        </Fragment>
      ))}
    </div>
  );
}

export { StepIndicator };
