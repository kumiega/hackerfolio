"use client";

import { useState } from "react";
import { Upload, User, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { BioData } from "@/types";
import { toast } from "sonner";

interface BioSectionProps {
  bio: BioData;
  onUpdateBio: (updates: Partial<BioData>) => void;
  validationErrors?: {
    full_name?: string;
    position?: string;
    summary?: string;
    avatar_url?: string;
    social_links?: string;
  };
}

export function BioSection({ bio, onUpdateBio, validationErrors }: BioSectionProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleRemoveAvatar = () => {
    onUpdateBio({ avatar_url: "" });
    toast.success("Avatar removed successfully!");
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select a valid image file");
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await fetch("/api/v1/portfolios/avatar-upload", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error?.message || "Upload failed");
      }

      onUpdateBio({ avatar_url: result.data.avatar_url });
      toast.success("Avatar uploaded successfully!");
    } catch (error) {
      console.error("Avatar upload error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to upload avatar");
    } finally {
      setIsUploading(false);
      // Clear the input
      event.target.value = "";
    }
  };

  return (
    <Card className="border bg-background">
      <CardHeader>
        <CardTitle className="text-lg">Your Bio</CardTitle>
        <CardDescription>This section appears at the top of your portfolio</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-4">
            <Label>Avatar</Label>
            <div className="flex items-center gap-4">
              <div className="relative group">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={bio.avatar_url} alt="Avatar" />
                  <AvatarFallback>
                    <User className="h-8 w-8" />
                  </AvatarFallback>
                </Avatar>
                {bio.avatar_url && (
                  <button
                    onClick={handleRemoveAvatar}
                    className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    title="Remove avatar"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={isUploading} className="relative">
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? "Uploading..." : "Upload Avatar"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={isUploading}
                    />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF up to 5MB</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                value={bio.full_name || ""}
                onChange={(e) => onUpdateBio({ full_name: e.target.value })}
                placeholder="Enter your full name"
                className={validationErrors?.full_name ? "border-red-500" : ""}
              />
              {validationErrors?.full_name && <p className="text-sm text-red-500 mt-1">{validationErrors.full_name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="position">
                Position <span className="text-red-500">*</span>
              </Label>
              <Input
                id="position"
                value={bio.position || ""}
                onChange={(e) => onUpdateBio({ position: e.target.value })}
                placeholder="e.g. Software Engineer"
                className={validationErrors?.position ? "border-red-500" : ""}
              />
              {validationErrors?.position && <p className="text-sm text-red-500 mt-1">{validationErrors.position}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">
              Bio Text <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="summary"
              value={bio.summary || ""}
              onChange={(e) => onUpdateBio({ summary: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
              className={validationErrors?.summary ? "border-red-500" : ""}
            />
            {validationErrors?.summary && <p className="text-sm text-red-500 mt-1">{validationErrors.summary}</p>}
          </div>

          <div className="space-y-4">
            <Label>Social Links</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="github" className="text-sm text-muted-foreground">
                  GitHub
                </Label>
                <Input
                  id="github"
                  value={bio.social_links?.github || ""}
                  onChange={(e) =>
                    onUpdateBio({
                      social_links: { ...bio.social_links, github: e.target.value },
                    })
                  }
                  placeholder="https://github.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="linkedin" className="text-sm text-muted-foreground">
                  LinkedIn
                </Label>
                <Input
                  id="linkedin"
                  value={bio.social_links?.linkedin || ""}
                  onChange={(e) =>
                    onUpdateBio({
                      social_links: { ...bio.social_links, linkedin: e.target.value },
                    })
                  }
                  placeholder="https://linkedin.com/in/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="x" className="text-sm text-muted-foreground">
                  X (Twitter)
                </Label>
                <Input
                  id="x"
                  value={bio.social_links?.x || ""}
                  onChange={(e) =>
                    onUpdateBio({
                      social_links: { ...bio.social_links, x: e.target.value },
                    })
                  }
                  placeholder="https://twitter.com/username"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm text-muted-foreground">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={bio.social_links?.email || ""}
                  onChange={(e) =>
                    onUpdateBio({
                      social_links: { ...bio.social_links, email: e.target.value },
                    })
                  }
                  placeholder="your.email@example.com"
                />
              </div>
            </div>
            <div className="space-y-4">
              <Label className="text-sm text-muted-foreground">Custom Link</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="custom_link_name" className="text-xs text-muted-foreground">
                    Link Name
                  </Label>
                  <Input
                    id="custom_link_name"
                    value={bio.social_links?.custom_link?.name || ""}
                    onChange={(e) =>
                      onUpdateBio({
                        social_links: {
                          ...bio.social_links,
                          custom_link: {
                            name: e.target.value,
                            url: bio.social_links?.custom_link?.url || "",
                          },
                        },
                      })
                    }
                    placeholder="Portfolio, Blog, etc."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="custom_link_url" className="text-xs text-muted-foreground">
                    Link URL
                  </Label>
                  <Input
                    id="custom_link_url"
                    value={bio.social_links?.custom_link?.url || ""}
                    onChange={(e) =>
                      onUpdateBio({
                        social_links: {
                          ...bio.social_links,
                          custom_link: {
                            name: bio.social_links?.custom_link?.name || "",
                            url: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="https://example.com"
                  />
                </div>
              </div>
            </div>
            {validationErrors?.social_links && (
              <div className="mt-2">
                <p className="text-sm text-red-500">{validationErrors.social_links}</p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
