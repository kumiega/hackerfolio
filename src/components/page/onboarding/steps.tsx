import { UsernameStep } from "@/components/page/onboarding/step/username";
import { QuickStartStep } from "@/components/page/onboarding/step/quick-start";
import { GitHubImportStep } from "@/components/page/onboarding/step/github";
import { LinkedInImportStep } from "@/components/page/onboarding/step/linkedin";
import { StepIndicator } from "@/components/ui/step-indicator";
import { StepperProvider, useStepper } from "@/components/ui/stepper";

const steps = [
  {
    label: "username",
    content: <UsernameStep />,
  },
  {
    label: "quick-start",
    content: <QuickStartStep />,
  },
  {
    label: "linkedin-import",
    content: <LinkedInImportStep />,
  },
  {
    label: "github-import",
    content: <GitHubImportStep />,
  },
];

const StepContent = () => {
  const { currentStep } = useStepper();

  return <div>{currentStep.content}</div>;
};

interface OnboardingStepsProps {
  userId: string;
}

function OnboardingSteps({ userId }: OnboardingStepsProps) {
  const initialData = { userId };

  return (
    <StepperProvider initialData={initialData} steps={steps}>
      <StepIndicator className="mb-8" />

      <StepContent />
    </StepperProvider>
  );
}

export { OnboardingSteps };
