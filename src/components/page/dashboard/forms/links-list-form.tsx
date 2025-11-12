import { Field, FieldLabel, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface LinkItem {
  label: string;
  url: string;
}

interface LinksListFormProps {
  items: LinkItem[];
  onChange: (field: string, value: LinkItem[]) => void;
}

export function LinksListForm({ items, onChange }: LinksListFormProps) {
  const safeItems = items || [];

  return (
    <Field className="items-stretch">
      <FieldLabel>Links (list)</FieldLabel>
      <div className="space-y-2">
        {safeItems.map((item, index) => (
          <div key={index} className="flex gap-2">
            <Input
              value={item.label || ""}
              onChange={(e) => {
                const newItems = [...safeItems];
                newItems[index] = { ...newItems[index], label: e.target.value };
                onChange("items", newItems);
              }}
              placeholder="Link label"
            />
            <Input
              value={item.url || ""}
              onChange={(e) => {
                const newItems = [...safeItems];
                newItems[index] = { ...newItems[index], url: e.target.value };
                onChange("items", newItems);
              }}
              placeholder="https://..."
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                const newItems = safeItems.filter((_, i) => i !== index);
                onChange("items", newItems);
              }}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const newItems = [...safeItems, { label: "", url: "" }];
            onChange("items", newItems);
          }}
        >
          Add Link
        </Button>
      </div>
      <FieldDescription>
        {safeItems.length} link{safeItems.length !== 1 ? "s" : ""}
      </FieldDescription>
    </Field>
  );
}
