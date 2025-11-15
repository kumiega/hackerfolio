import { useState } from "react";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload, Github, Loader2 } from "lucide-react";

interface AvatarFormProps {
  avatar_url: string;
  onChange: (field: string, value: string) => void;
  githubAvatarUrl?: string;
}

export function AvatarForm({ avatar_url, onChange, githubAvatarUrl }: AvatarFormProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/v1/portfolios/avatar-upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Upload failed");
      }

      // Update the avatar URL in the form
      onChange("avatar_url", result.data.avatar_url);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  const useGithubAvatar = async () => {
    if (!githubAvatarUrl) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      // For GitHub avatars, we'll still just set the URL directly since it's already hosted
      // We could potentially download and re-upload to our storage, but for now we'll keep it simple
      onChange("avatar_url", githubAvatarUrl);
    } catch (_error) {
      console.error("GitHub avatar error:", _error);
      setUploadError("Failed to set GitHub avatar");
    } finally {
      setIsUploading(false);
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
          {isUploading && (
            <div className="flex items-center gap-1">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm text-muted-foreground">Uploading...</span>
            </div>
          )}
        </div>
        <p className="text-xs text-muted-foreground">Max file size: 5MB. Supported formats: JPG, PNG, GIF, WebP</p>
        {uploadError && <FieldError>{uploadError}</FieldError>}
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
            <Button type="button" variant="outline" onClick={useGithubAvatar} size="sm" disabled={isUploading}>
              Use This Avatar
            </Button>
          </div>
        </Field>
      )}
    </div>
  );
}
