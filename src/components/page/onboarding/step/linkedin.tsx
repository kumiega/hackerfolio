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

      <p className="text-xs text-red-800 mb-3 text-balance">
        Portfolio content will be AI-generated. Please review carefully before publishing. You can customize it in the
        editor afterward.
      </p>
    </div>
  );
}

export { LinkedInImportStep };
