import type { BioData, PortfolioData, Component } from "@/types";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface BioValidationResult extends ValidationResult {
  fieldErrors: {
    full_name?: string;
    position?: string;
    bio_text?: string;
    avatar_url?: string;
    social_links?: string;
  };
}

export interface SectionsValidationResult extends ValidationResult {
  fieldErrors: {
    sections?: string;
    components?: string;
  };
}

/**
 * Validates bio data for saving/publishing
 */
export function validateBioData(bioData: BioData): BioValidationResult {
  const errors: string[] = [];
  const fieldErrors: BioValidationResult["fieldErrors"] = {};

  // Validate full_name
  if (!bioData.full_name || bioData.full_name.trim().length === 0) {
    errors.push("Full name is required");
    fieldErrors.full_name = "Full name is required";
  } else if (bioData.full_name.length > 100) {
    errors.push("Full name must be 100 characters or less");
    fieldErrors.full_name = "Full name must be 100 characters or less";
  }

  // Validate position (required)
  if (!bioData.position || bioData.position.trim().length === 0) {
    errors.push("Position is required");
    fieldErrors.position = "Position is required";
  } else if (bioData.position.length > 100) {
    errors.push("Position must be 100 characters or less");
    fieldErrors.position = "Position must be 100 characters or less";
  }

  // Validate bio_text
  if (!bioData.bio_text || bioData.bio_text.trim().length === 0) {
    errors.push("Bio text is required");
    fieldErrors.bio_text = "Bio text is required";
  } else if (bioData.bio_text.length > 2000) {
    errors.push("Bio text must be 2000 characters or less");
    fieldErrors.bio_text = "Bio text must be 2000 characters or less";
  }

  // Validate avatar_url (can be empty but if provided should be valid URL)
  if (bioData.avatar_url && bioData.avatar_url.trim().length > 0) {
    try {
      new URL(bioData.avatar_url);
    } catch {
      errors.push("Avatar URL must be a valid URL");
      fieldErrors.avatar_url = "Avatar URL must be a valid URL";
    }
  }

  // Validate social links (URLs should be valid if provided)
  const socialLinks = bioData.social_links;
  const socialLinkErrors: string[] = [];

  // Guard against undefined social_links - skip validation if not present
  if (socialLinks) {
    if (socialLinks.github && socialLinks.github.trim().length > 0) {
      try {
        new URL(socialLinks.github);
      } catch {
        socialLinkErrors.push("GitHub URL must be a valid URL");
      }
    }

    if (socialLinks.linkedin && socialLinks.linkedin.trim().length > 0) {
      try {
        new URL(socialLinks.linkedin);
      } catch {
        socialLinkErrors.push("LinkedIn URL must be a valid URL");
      }
    }

    if (socialLinks.x && socialLinks.x.trim().length > 0) {
      try {
        new URL(socialLinks.x);
      } catch {
        socialLinkErrors.push("X (Twitter) URL must be a valid URL");
      }
    }

    if (socialLinks.email && socialLinks.email.trim().length > 0) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(socialLinks.email)) {
        socialLinkErrors.push("Email must be a valid email address");
      }
    }

    if (socialLinks.custom_link?.url && socialLinks.custom_link.url.trim().length > 0) {
      try {
        new URL(socialLinks.custom_link.url);
      } catch {
        socialLinkErrors.push("Custom link URL must be a valid URL");
      }
    }

    if (socialLinks.website && socialLinks.website.length > 0) {
      socialLinks.website.forEach((site, index) => {
        if (site.url && site.url.trim().length > 0) {
          try {
            new URL(site.url);
          } catch {
            socialLinkErrors.push(`Website URL ${index + 1} must be a valid URL`);
          }
        }
      });
    }

    if (socialLinkErrors.length > 0) {
      errors.push(...socialLinkErrors);
      fieldErrors.social_links = socialLinkErrors.join(", ");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

/**
 * Validates sections data for saving/publishing
 */
export function validateSectionsData(portfolioData: PortfolioData): SectionsValidationResult {
  const errors: string[] = [];
  const fieldErrors: SectionsValidationResult["fieldErrors"] = {};

  // Validate sections exist
  if (!portfolioData.sections || portfolioData.sections.length === 0) {
    errors.push("At least one section is required");
    fieldErrors.sections = "At least one section is required";
  } else {
    // Validate each section has required fields and at least one component
    portfolioData.sections.forEach((section, sectionIndex) => {
      if (!section.title || section.title.trim().length === 0) {
        errors.push(`Section ${sectionIndex + 1}: Title is required`);
      } else if (section.title.length > 100) {
        errors.push(`Section ${sectionIndex + 1}: Title must be 100 characters or less`);
      }

      if (!section.slug || section.slug.trim().length === 0) {
        errors.push(`Section ${sectionIndex + 1}: Slug is required`);
      }

      if (!section.components || section.components.length === 0) {
        errors.push(`Section ${sectionIndex + 1}: At least one component is required`);
      } else {
        // Validate components
        section.components.forEach((component, componentIndex) => {
          const componentErrors = validateComponent(component);
          if (componentErrors.length > 0) {
            errors.push(`Section ${sectionIndex + 1}, Component ${componentIndex + 1}: ${componentErrors.join(", ")}`);
          }
        });
      }
    });

    // Check if there are any components at all across all sections
    const totalComponents = portfolioData.sections.reduce((sum, section) => sum + (section.components?.length || 0), 0);

    if (totalComponents === 0) {
      errors.push("At least one component is required across all sections");
      fieldErrors.components = "At least one component is required across all sections";
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    fieldErrors,
  };
}

/**
 * Validates a single component
 */
function validateComponent(component: Component): string[] {
  const errors: string[] = [];

  if (!component.type) {
    errors.push("Component type is required");
    return errors;
  }

  if (!component.data) {
    errors.push("Component data is required");
    return errors;
  }

  // Type-specific validation
  switch (component.type) {
    case "text": {
      const textData = component.data as { content: string };
      if (!textData.content || textData.content.trim().length === 0) {
        errors.push("Text content is required");
      } else if (textData.content.length > 2000) {
        errors.push("Text content must be 2000 characters or less");
      }
      break;
    }

    case "cards": {
      const cardsData = component.data as {
        cards: { repo_url: string; title: string; summary: string; tech: string[] }[];
      };
      if (!cardsData.cards || cardsData.cards.length === 0) {
        errors.push("At least one project card is required");
      } else if (cardsData.cards.length > 10) {
        errors.push("Maximum 10 project cards allowed");
      } else {
        cardsData.cards.forEach((card, index) => {
          if (!card.repo_url || card.repo_url.trim().length === 0) {
            errors.push(`Card ${index + 1}: Repository URL is required`);
          } else {
            try {
              new URL(card.repo_url);
            } catch {
              errors.push(`Card ${index + 1}: Repository URL must be a valid URL`);
            }
          }

          if (!card.title || card.title.trim().length === 0) {
            errors.push(`Card ${index + 1}: Title is required`);
          } else if (card.title.length > 100) {
            errors.push(`Card ${index + 1}: Title must be 100 characters or less`);
          }

          if (!card.summary || card.summary.trim().length === 0) {
            errors.push(`Card ${index + 1}: Summary is required`);
          } else if (card.summary.length > 500) {
            errors.push(`Card ${index + 1}: Summary must be 500 characters or less`);
          }

          if (!card.tech || card.tech.length === 0) {
            errors.push(`Card ${index + 1}: At least one technology is required`);
          }
        });
      }
      break;
    }

    case "pills": {
      const pillsData = component.data as { items: string[] };
      if (!pillsData.items || pillsData.items.length === 0) {
        errors.push("At least one technology item is required");
      } else if (pillsData.items.length > 30) {
        errors.push("Maximum 30 technology items allowed");
      } else {
        pillsData.items.forEach((item, index) => {
          if (!item || item.trim().length === 0) {
            errors.push(`Technology ${index + 1}: Item cannot be empty`);
          } else if (item.length > 20) {
            errors.push(`Technology ${index + 1}: Item must be 20 characters or less`);
          }
        });
      }
      break;
    }

    case "list": {
      const listData = component.data as { items: { label: string; url?: string; value?: string }[] };
      if (!listData.items || listData.items.length === 0) {
        errors.push("At least one list item is required");
      } else {
        listData.items.forEach((item, index) => {
          if (!item.label || item.label.trim().length === 0) {
            errors.push(`List item ${index + 1}: Label is required`);
          } else if (item.label.length > 80) {
            errors.push(`List item ${index + 1}: Label must be 80 characters or less`);
          }

          if (item.url && item.url.trim().length > 0) {
            try {
              new URL(item.url);
            } catch {
              errors.push(`List item ${index + 1}: URL must be a valid URL`);
            }
          }
        });
      }
      break;
    }

    case "image": {
      const imageData = component.data as { url: string; alt: string };
      if (!imageData.url || imageData.url.trim().length === 0) {
        errors.push("Image URL is required");
      } else {
        try {
          new URL(imageData.url);
        } catch {
          errors.push("Image URL must be a valid URL");
        }
      }

      if (!imageData.alt || imageData.alt.trim().length === 0) {
        errors.push("Image alt text is required");
      } else if (imageData.alt.length > 120) {
        errors.push("Image alt text must be 120 characters or less");
      }
      break;
    }

    case "bio": {
      const bioCompData = component.data as { headline: string; about: string };
      if (!bioCompData.headline || bioCompData.headline.trim().length === 0) {
        errors.push("Bio headline is required");
      } else if (bioCompData.headline.length > 120) {
        errors.push("Bio headline must be 120 characters or less");
      }

      if (!bioCompData.about || bioCompData.about.trim().length === 0) {
        errors.push("Bio about text is required");
      } else if (bioCompData.about.length > 2000) {
        errors.push("Bio about text must be 2000 characters or less");
      }
      break;
    }

    case "personal_info": {
      const personalData = component.data as { full_name: string; position?: string };
      if (!personalData.full_name || personalData.full_name.trim().length === 0) {
        errors.push("Personal info full name is required");
      } else if (personalData.full_name.length > 100) {
        errors.push("Personal info full name must be 100 characters or less");
      }

      if (personalData.position && personalData.position.length > 100) {
        errors.push("Personal info position must be 100 characters or less");
      }
      break;
    }

    case "avatar": {
      const avatarData = component.data as { avatar_url: string };
      if (!avatarData.avatar_url || avatarData.avatar_url.trim().length === 0) {
        errors.push("Avatar URL is required");
      } else {
        try {
          new URL(avatarData.avatar_url);
        } catch {
          errors.push("Avatar URL must be a valid URL");
        }
      }
      break;
    }

    case "social_links":
      // Social links validation is already covered in bio validation
      // For component validation, just ensure the structure exists
      break;
  }

  return errors;
}

/**
 * Checks if bio data has minimum required fields filled to enable save/publish buttons
 */
export function canSaveBio(bioData: BioData): boolean {
  return !!(
    bioData.full_name &&
    bioData.full_name.trim().length > 0 &&
    bioData.position &&
    bioData.position.trim().length > 0 &&
    bioData.bio_text &&
    bioData.bio_text.trim().length > 0
  );
}

/**
 * Checks if sections data has minimum required fields filled to enable save/publish buttons
 */
export function canSaveSections(portfolioData: PortfolioData): boolean {
  return !!(
    portfolioData.sections &&
    portfolioData.sections.length > 0 &&
    portfolioData.sections.some((section) => section.components && section.components.length > 0)
  );
}
