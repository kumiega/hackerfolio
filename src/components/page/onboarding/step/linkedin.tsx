import { Button } from "@/components/ui/button";
import { useStepper } from "@/components/ui/stepper";

function LinkedInImportStep() {
  const { navigateTo } = useStepper();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Import your LinkedIn profile</h1>
        <p className="text-sm text-muted-foreground">
          Paste your profile URL and we will prepare portfolio bio for you.
        </p>
      </div>

      <Button onClick={() => navigateTo("github-import")}>Continue</Button>
    </div>
  );
}

export { LinkedInImportStep };
