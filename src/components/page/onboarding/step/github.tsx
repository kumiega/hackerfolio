import { Button } from "@/components/ui/button";
import { useStepper } from "@/components/ui/stepper";
import { repositories } from "@/lib/repositories";

function GitHubImportStep() {
  const { navigateTo, data } = useStepper<{ userId: string }, string>();
  const userId = data.userId;

  const handleComplete = async () => {
    await repositories.userProfiles.update(userId, { is_onboarded: true });
    navigateTo("dashboard");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Import your projects from GitHub</h1>
        <p className="text-sm text-muted-foreground">Select the projects you want to import to your portfolio.</p>
      </div>

      <div className="flex gap-4">
        <Button onClick={handleComplete}>Complete onboarding</Button>
        <Button variant="link" onClick={handleComplete}>
          Skip import
        </Button>
      </div>
    </div>
  );
}

export { GitHubImportStep };
