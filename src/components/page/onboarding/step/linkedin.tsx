import { LightbulbIcon } from "lucide-react";
import LinkedInForm from "@/components/feature/onboarding/linkedin-form";

function LinkedInImportStep() {
  return (
    <div className="space-y-8 max-w-md">
      <div>
        <h1 className="text-2xl font-bold tracking-tight mb-2 text-balance">Create a bio from your LinkedIn</h1>
        <p className="text-sm text-muted-foreground mb-3 leading-relaxed text-balance">
          Provide your LinkedIn profile information to instantly generate a personalized, perfectly fitting portfolio
          bio.
        </p>
      </div>

      <LinkedInForm />

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground px-1.5 py-1 border border-secondary/10 bg-secondary/5 text-secondary/86 max-w-fit">
        <LightbulbIcon className="w-4 h-4" />
        You can customize your generated bio in the editor afterward.
      </p>
    </div>
  );
}

export { LinkedInImportStep };
