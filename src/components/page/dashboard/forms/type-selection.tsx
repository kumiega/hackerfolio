import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ComponentType } from "@/types";

interface TypeSelectionProps {
  value: ComponentType | "";
  onChange: (value: ComponentType) => void;
}

export function TypeSelection({ value, onChange }: TypeSelectionProps) {
  return (
    <Field className="items-stretch">
      <FieldLabel>Component Type</FieldLabel>
      <Select value={value} onValueChange={(value: ComponentType) => onChange(value)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a component type" />
        </SelectTrigger>
        <SelectContent className="z-[100]">
          <SelectItem value="cards">Project Card</SelectItem>
          <SelectItem value="pills">Skills Pills</SelectItem>
          <SelectItem value="list">List</SelectItem>
          <SelectItem value="image">Image</SelectItem>
        </SelectContent>
      </Select>
    </Field>
  );
}
