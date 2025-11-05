import { useState } from "react";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Github } from "lucide-react";

interface AvatarFormProps {
  avatar_url: string;
  onChange: (field: string, value: string) => void;
  error?: string;
  githubAvatarUrl?: string;
}

export function AvatarForm({ avatar_url, onChange, error, githubAvatarUrl }: AvatarFormProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onChange("avatar_url", dataUrl);
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setIsUploading(false);
    }
  };

  const useGithubAvatar = () => {
    if (githubAvatarUrl) {
      onChange("avatar_url", githubAvatarUrl);
    }
  };

  return (
    <div className="space-y-4">
      <Field className="items-stretch">
        <FieldLabel>Avatar</FieldLabel>

        {/* Current Avatar Preview */}
        <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
          <Avatar className="h-16 w-16">
            <AvatarImage src={avatar_url} alt="Current avatar" />
            <AvatarFallback className="text-lg">Avatar</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="text-sm font-medium">Current Avatar</p>
            <p className="text-xs text-muted-foreground">{avatar_url ? "Avatar set" : "No avatar set"}</p>
          </div>
        </div>
      </Field>

      {/* File Upload */}
      <Field className="items-stretch">
        <FieldLabel className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Upload Image
        </FieldLabel>
        <div className="flex items-center gap-2">
          <Input type="file" accept="image/*" onChange={handleFileUpload} disabled={isUploading} className="flex-1" />
          {isUploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
        </div>
        <p className="text-xs text-muted-foreground">Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP</p>
      </Field>

      {/* GitHub Avatar */}
      {githubAvatarUrl && (
        <Field className="items-stretch">
          <FieldLabel className="flex items-center gap-2">
            <Github className="h-4 w-4" />
            Your GitHub Avatar
          </FieldLabel>
          <div className="flex items-center gap-4 p-4 border rounded-lg bg-muted/30">
            <Avatar className="h-12 w-12">
              <AvatarImage src={githubAvatarUrl} alt="GitHub avatar" />
              <AvatarFallback>GH</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium">GitHub Profile Avatar</p>
              <p className="text-xs text-muted-foreground">Use your GitHub avatar from authentication</p>
            </div>
            <Button type="button" variant="outline" onClick={useGithubAvatar} size="sm">
              Use This Avatar
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}
