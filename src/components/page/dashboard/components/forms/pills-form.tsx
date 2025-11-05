import { Field, FieldLabel, FieldContent, FieldDescription, FieldError } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

interface PillsFormProps {
  items: string[];
  onChange: (field: string, value: string[]) => void;
  error?: string;
}

export function PillsForm({ items, onChange, error }: PillsFormProps) {
  return (
    <Field className="items-stretch">
      <FieldContent>
        <FieldLabel>Pills</FieldLabel>
        <FieldDescription>Separate items with commas</FieldDescription>
      </FieldContent>
      <Textarea
        value={items?.join(", ") || ""}
        onChange={(e) => {
          const newItems = e.target.value
            .split(",")
            .map((item: string) => item.trim())
            .filter(Boolean);
          onChange("items", newItems);
        }}
        placeholder="React, TypeScript, Node.js, Python"
        rows={3}
        className={error ? "border-destructive" : ""}
      />
      <FieldDescription>{(items || []).length} items (max 30)</FieldDescription>
      <FieldError>{error}</FieldError>
    </Field>
  );
}
