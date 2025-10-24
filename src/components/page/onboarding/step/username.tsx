import { Button } from "@/components/ui/button";
import { useStepper } from "@/components/ui/stepper";

function UsernameStep() {
  const { navigateTo } = useStepper();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Username</h1>
        <p className="text-sm text-muted-foreground">Choose a username that will be used to access your portfolio.</p>
      </div>

      <Button onClick={() => navigateTo("quick-start")}>Continue</Button>
    </div>
  );
}

export { UsernameStep };
