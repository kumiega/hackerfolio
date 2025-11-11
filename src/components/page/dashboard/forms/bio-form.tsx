import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface BioFormProps {
  headline: string;
  about: string;
  onChange: (field: string, value: string) => void;
  headlineError?: string;
}

export function BioForm({ headline, about, onChange, headlineError }: BioFormProps) {
  return (
    <div className="space-y-4">
      <Field className="items-stretch">
        <FieldLabel htmlFor="headline">Headline</FieldLabel>
        <Input
          id="headline"
          value={headline || ""}
          onChange={(e) => onChange("headline", e.target.value)}
          placeholder="Software Engineer & Full Stack Developer"
          className={headlineError ? "border-destructive" : ""}
        />
        <FieldDescription>{(headline || "").length}/120 characters</FieldDescription>
        <FieldError>{headlineError}</FieldError>
      </Field>
      <Field className="items-stretch">
        <FieldLabel htmlFor="about">About</FieldLabel>
        <Textarea
          id="about"
          value={about || ""}
          onChange={(e) => onChange("about", e.target.value)}
          placeholder="Tell visitors about yourself..."
          rows={6}
        />
        <FieldDescription>{(about || "").length}/2000 characters</FieldDescription>
      </Field>
    </div>
  );
}
