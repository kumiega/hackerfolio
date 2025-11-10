import type { PortfolioData } from "@/types";

/**
 * Mock portfolio data for testing and development
 * Matches the complete PortfolioData JSONB structure
 */
export const mockPortfolioData: PortfolioData = {
  bio: {
    full_name: "Mark Coderfast",
    position: "Full-stack Developer",
    bio_text:
      "I'm Mark Coderfast a New York-based designer, developer, and serial tinkerer. I am working as full-stack developer since 2012.",
    avatar_url: "/images/avatar.jpg",
  },
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
