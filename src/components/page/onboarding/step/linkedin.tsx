import LinkedInForm from "@/components/page/onboarding/linkedin-form";

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

      <p className="px-2 py-1.5 bg-red-50 border border-dashed border-red-200 text-xs text-red-800 mb-3 text-balance">
        Portfolio content will be AI-generated. Please review carefully before publishing. You can customize it in the
        editor afterward.
      </p>
    </div>
  );
}

export { LinkedInImportStep };
