import { Field, FieldLabel, FieldDescription, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface TextFormProps {
  content: string;
  onChange: (field: string, value: string) => void;
  error?: string;
}

export function TextForm({ content, onChange, error }: TextFormProps) {
  return (
    <Field className="items-stretch">
      <FieldLabel htmlFor="content">Content</FieldLabel>
      <Textarea
        id="content"
        value={content || ""}
        onChange={(e) => onChange("content", e.target.value)}
        placeholder="Enter your text content..."
        rows={4}
        className={error ? "border-destructive" : ""}
      />
      <FieldDescription>{(content || "").length}/2000 characters</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
