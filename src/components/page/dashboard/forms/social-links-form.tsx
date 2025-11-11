import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Website {
  name: string;
  url: string;
}

interface SocialLinksFormProps {
  github: string;
  linkedin: string;
  x: string;
  website: Website[];
  onChange: (field: string, value: unknown) => void;
}

export function SocialLinksForm({ github, linkedin, x, website, onChange }: SocialLinksFormProps) {
  return (
    <div className="space-y-4">
      <Field className="items-stretch">
        <FieldLabel htmlFor="github">GitHub</FieldLabel>
        <Input
          id="github"
          value={github || ""}
          onChange={(e) => onChange("github", e.target.value)}
          placeholder="https://github.com/username"
        />
      </Field>
      <Field className="items-stretch">
        <FieldLabel htmlFor="linkedin">LinkedIn</FieldLabel>
        <Input
          id="linkedin"
          value={linkedin || ""}
          onChange={(e) => onChange("linkedin", e.target.value)}
          placeholder="https://linkedin.com/in/username"
        />
      </Field>
      <Field className="items-stretch">
        <FieldLabel htmlFor="x">X (Twitter)</FieldLabel>
        <Input
          id="x"
          value={x || ""}
          onChange={(e) => onChange("x", e.target.value)}
          placeholder="https://twitter.com/username"
        />
      </Field>
      <Field className="items-stretch">
        <FieldLabel>Website</FieldLabel>
        <div className="space-y-2">
          {(website || []).map((site, index) => (
            <div key={index} className="flex gap-2">
              <Input
                value={site.name || ""}
                onChange={(e) => {
                  const currentWebsites = website || [];
                  const newWebsites = [...currentWebsites];
                  newWebsites[index] = { ...newWebsites[index], name: e.target.value };
                  onChange("website", newWebsites);
                }}
                placeholder="Site name"
              />
              <Input
                value={site.url || ""}
                onChange={(e) => {
                  const currentWebsites = website || [];
                  const newWebsites = [...currentWebsites];
                  newWebsites[index] = { ...newWebsites[index], url: e.target.value };
                  onChange("website", newWebsites);
                }}
                placeholder="https://..."
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const currentWebsites = website || [];
                  const newWebsites = currentWebsites.filter((_, i) => i !== index);
                  onChange("website", newWebsites);
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
              const currentWebsites = website || [];
              const newWebsites = [...currentWebsites, { name: "", url: "" }];
              onChange("website", newWebsites);
            }}
          >
            Add Website
          </Button>
        </div>
      </Field>
    </div>
  );
}
