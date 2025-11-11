import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

interface ImageFormProps {
  url: string;
  alt: string;
  onChange: (field: string, value: string) => void;
}

export function ImageForm({ url, alt, onChange }: ImageFormProps) {
  return (
    <div className="space-y-4">
      <Field className="items-stretch">
        <FieldLabel htmlFor="url">Image URL</FieldLabel>
        <Input
          id="url"
          value={url || ""}
          onChange={(e) => onChange("url", e.target.value)}
          placeholder="https://example.com/image.jpg"
        />
      </Field>
      <Field className="items-stretch">
        <FieldLabel htmlFor="alt">Alt Text</FieldLabel>
        <Input
          id="alt"
          value={alt || ""}
          onChange={(e) => onChange("alt", e.target.value)}
          placeholder="Describe the image"
        />
        <FieldDescription>{(alt || "").length}/120 characters</FieldDescription>
      </Field>
    </div>
  );
}
