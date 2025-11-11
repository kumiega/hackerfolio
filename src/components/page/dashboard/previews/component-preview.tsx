import type { Component } from "@/types";
import { TextPreview } from "./text-preview";
import { CardPreview } from "./card-preview";
import { PillsPreview } from "./pills-preview";
import { SocialLinksPreview } from "./social-links-preview";
import { ListPreview } from "./list-preview";
import { ImagePreview } from "./image-preview";
import { BioPreview } from "./bio-preview";
import { PersonalInfoPreview } from "./personal-info-preview";
import { AvatarPreview } from "./avatar-preview";
import { UnknownPreview } from "./unknown-preview";

interface ComponentPreviewProps {
  component: Component;
}

export function ComponentPreview({ component }: ComponentPreviewProps) {
  switch (component.type) {
    case "text":
      return <TextPreview content={(component.data as { content: string }).content} />;
    case "cards":
      return (
        <CardPreview
          cards={
            (component.data as { cards: { repo_url: string; title: string; summary: string; tech: string[] }[] }).cards
          }
        />
      );
    case "pills":
      return <PillsPreview items={(component.data as { items: string[] }).items} />;
    case "social_links":
      return <SocialLinksPreview data={component.data as Record<string, unknown>} />;
    case "list":
      return <ListPreview items={(component.data as { items: unknown[] }).items} />;
    case "image":
      return <ImagePreview alt={(component.data as { alt: string }).alt} />;
    case "bio":
      return <BioPreview headline={(component.data as { headline: string }).headline} />;
    case "personal_info":
      return (
        <PersonalInfoPreview
          full_name={(component.data as { full_name: string }).full_name}
          position={(component.data as { position?: string }).position}
        />
      );
    case "avatar":
      return <AvatarPreview avatar_url={(component.data as { avatar_url: string }).avatar_url} />;
    default:
      return <UnknownPreview type={component.type} />;
  }
}
