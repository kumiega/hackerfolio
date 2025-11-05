import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface FullNameFormProps {
  full_name: string;
  onChange: (field: string, value: string) => void;
  error?: string;
}

export function FullNameForm({ full_name, onChange, error }: FullNameFormProps) {
  return (
    <Field className="items-stretch">
      <FieldLabel htmlFor="full_name">Full Name</FieldLabel>
      <Input
        id="full_name"
        value={full_name || ""}
        onChange={(e) => onChange("full_name", e.target.value)}
        placeholder="Enter your full name"
        className={error ? "border-destructive" : ""}
      />
      <FieldDescription>{(full_name || "").length}/100 characters</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
