import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface PersonalInfoFormProps {
  full_name: string;
  position?: string;
  onChange: (field: string, value: string) => void;
  errors?: Record<string, string>;
}

export function PersonalInfoForm({ full_name, position, onChange, errors }: PersonalInfoFormProps) {
  return (
    <div className="space-y-4">
      <Field className="items-stretch">
        <FieldLabel htmlFor="full_name">Name</FieldLabel>
        <Input
          id="full_name"
          value={full_name || ""}
          onChange={(e) => onChange("full_name", e.target.value)}
          placeholder="Enter your full name"
          className={errors?.full_name ? "border-destructive" : ""}
        />
        <FieldDescription>{(full_name || "").length}/100 characters</FieldDescription>
        <FieldError>{errors?.full_name}</FieldError>
      </Field>

      <Field className="items-stretch">
        <FieldLabel htmlFor="position">Position/Title</FieldLabel>
        <Input
          id="position"
          value={position || ""}
          onChange={(e) => onChange("position", e.target.value)}
          placeholder="e.g., Full-stack Developer, Product Manager"
          className={errors?.position ? "border-destructive" : ""}
        />
        <FieldDescription>{(position || "").length}/100 characters</FieldDescription>
        <FieldError>{errors?.position}</FieldError>
      </Field>
    </div>
  );
}
