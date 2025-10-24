import { Button } from "@/components/ui/button";

function GitHubImportStep() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2">Import your projects from GitHub</h1>
        <p className="text-sm text-muted-foreground">Select the projects you want to import to your portfolio.</p>
      </div>

      <Button onClick={() => alert("Onboarding completeed")}>Complete onboarding</Button>
    </div>
  );
}

export { GitHubImportStep };
