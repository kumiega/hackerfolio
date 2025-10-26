import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Code } from "@/components/ui/code";
import { useStepper } from "@/components/ui/stepper";

import UsernameAvailabilityForm from "@/components/feature/onboarding/username-availabilty-form";

function UsernameStep() {
  const { navigateTo } = useStepper();

  return (
    <div className="max-w-lg space-y-8">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Setup your portfolio URL</h1>
      <p className="text-sm text-muted-foreground leading-relaxed text-balance">
        Your portfolio will be available at a unique URL based on your username:
      </p>
      <UsernameAvailabilityForm onSubmit={() => navigateTo("quick-start")} />
    </div>
  );
}

export { UsernameStep };
