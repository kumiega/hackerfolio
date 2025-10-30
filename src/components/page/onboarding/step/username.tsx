import UsernameAvailabilityForm from "@/components/feature/onboarding/username-availabilty-form";

function UsernameStep() {
  return (
    <div className="max-w-[48ch] space-y-8">
      <h1 className="text-2xl font-bold tracking-tight mb-4">Setup your portfolio URL</h1>
      <p className="text-sm text-muted-foreground leading-relaxed text-balance">
        Your portfolio will be available at a unique URL based on your username:
      </p>

      <UsernameAvailabilityForm />
    </div>
  );
}

export { UsernameStep };
