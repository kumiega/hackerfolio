import { Button } from "@/components/ui/button";
import { useStepper } from "@/components/ui/stepper";
import { supabaseClient } from "@/db/supabase.client";

import { repositories } from "@/lib/repositories";

function QuickStartStep() {
  const { navigateTo, data } = useStepper<{ userId: string }, string>();
  const userId = data.userId;

  const handleSkip = async () => {
    repositories.initialize(supabaseClient);
    await repositories.userProfiles.update(userId, { is_onboarded: true });
    window.location.href = "/dashboard";
  };

  return (
    <div className="space-y-8">
      <div className="max-w-lg">
        <h1 className="text-2xl font-bold tracking-tight mb-2">We can import your data</h1>
        <p className="text-sm text-muted-foreground leading-relaxed text-balance">
          Coderpage allows you to use your GitHub and LinkedIn profile to create your portfolio. You can also skip the
          import and start from scratch.
        </p>
      </div>

      <div className="flex gap-4">
        <Button onClick={() => navigateTo("linkedin-import")}>Continue</Button>
        <Button variant="link" onClick={handleSkip}>
          Skip
        </Button>
      </div>
    </div>
  );
}

export { QuickStartStep };
