import type { PortfolioData } from "@/types";

/**
 * Mock portfolio data for testing and development
 * Matches the complete PortfolioData JSONB structure
 */
export const mockPortfolioData: PortfolioData = {
  full_name: "Mark Coderfast",
  position: "Full-stack developer at Google",
  bio: [
    {
      id: "bio-avatar",
      type: "avatar",
      data: {
        avatar_url: "/images/avatar.jpg",
      },
    },
    {
      id: "bio-full-name",
      type: "personal_info",
      data: {
        full_name: "Mark Coderfast",
      },
    },
    {
      id: "bio-text",
      type: "text",
      data: {
        content:
          "I'm Mark Coderfast a New York-based designer, developer, and serial tinkerer. I am working as full-stack developer since 2012.",
      },
    },
    {
      id: "bio-social",
      type: "social_links",
      data: {
        github: "https://github.com/markcoderfast",
        linkedin: "https://linkedin.com/in/markcoderfast",
        x: "https://twitter.com/markcoderfast",
        website: [{ name: "Blog", url: "https://markcoderfast.com" }],
      },
    },
  ],
  avatar_url: "/images/avatar.jpg",
  sections: [
    {
      id: "tech-stack",
      title: "Tech stack",
      slug: "tech-stack",
      description: "Technologies that I used to work with:",
      visible: true,
      components: [
        {
          id: "tech-pills",
          type: "pills",
          data: {
            title: "Tech stack",
            description: "Technologies that I used to work with:",
            items: [
              "react.js",
              "next.js",
              "vue.js",
              "postgresql",
              "aws",
              "supabase",
              "tailwindcss",
              "shadcn",
              "typescript",
              "three.js",
              "html",
              "css",
              "javascript",
              "wordpress",
            ],
          },
        },
      ],
    },
    {
      id: "projects",
      title: "My projects",
      slug: "projects",
      description: "Some of my recent work",
      visible: true,
      components: [
        {
          id: "project-cards",
          type: "cards",
          data: {
            cards: [
              {
                repo_url: "https://github.com/markcoderfast/hackerfolio",
                title: "Hackerfolio",
                summary: "Generate professional portfolio with AI easy way.",
                tech: ["React", "TypeScript", "Next.js", "Tailwind CSS"],
              },
              {
                repo_url: "https://github.com/markcoderfast/project-two",
                title: "Project Two",
                summary: "Another amazing project I built with modern technologies.",
                tech: ["Vue.js", "Node.js", "PostgreSQL"],
              },
              {
                repo_url: "https://github.com/markcoderfast/project-three",
                title: "Project Three",
                summary: "Yet another cool project showcasing my skills.",
                tech: ["React", "Python", "Django", "AWS"],
              },
            ],
          },
        },
      ],
    },
    {
      id: "links",
      title: "My other places",
      slug: "links",
      description: "Find me online",
      visible: true,
      components: [
        {
          id: "social-links",
          type: "list",
          data: {
            title: "My other places",
            items: [
              {
                label: "My blog",
                url: "https://markcoderfast.com",
              },
              {
                label: "My current company",
                url: "https://google.com",
              },
              {
                label: "My Twitter",
                url: "https://twitter.com/markcoderfast",
              },
            ],
          },
        },
      ],
    },
    {
      id: "about",
      title: "About me",
      slug: "about",
      description: "More about my background",
      visible: true,
      components: [
        {
          id: "about-text",
          type: "text",
          data: {
            title: "Background",
            content:
              "I have been working in software development for over 8 years, specializing in full-stack web development with modern technologies. My passion lies in creating efficient, scalable solutions that solve real-world problems.",
          },
        },
      ],
    },
  ],
};

/**
 * Extract social links from bio components for compatibility with existing BioSection
 */
export const extractSocialLinks = (portfolioData: PortfolioData): Record<string, string> => {
  return portfolioData.bio
    .filter((component) => component.type === "social_links")
    .reduce(
      (links, component) => {
        const data = component.data as any;
        if (data.github) links.github = data.github;
        if (data.linkedin) links.linkedin = data.linkedin;
        if (data.x) links.twitter = data.x;
        if (data.website) {
          data.website.forEach((site: any) => {
            if (site.name?.toLowerCase().includes("blog")) {
              links.blog = site.url;
            }
          });
        }
        return links;
      },
      {} as Record<string, string>
    );
};

/**
 * Extract bio text content from bio components for compatibility with existing BioSection
 */
export const extractBioText = (portfolioData: PortfolioData): string => {
  return portfolioData.bio
    .filter((component) => component.type === "text")
    .map((component) => (component.data as any).content)
    .join(" ");
};
