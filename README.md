# Hackerfolio

**A minimalist AI-powered portfolio builder for developers.**

[![License](https://img.shields.io/badge/license-TBD-lightgrey)]()

## Table of Contents

1. [Project Description](#project-description)  
2. [Tech Stack](#tech-stack)  
3. [Getting Started](#getting-started)  
4. [Available Scripts](#available-scripts)  
5. [Project Scope](#project-scope)  
6. [Project Status](#project-status)  
7. [License](#license)  

## Project Description

Hackerfolio is an MVP application that enables developers to generate a professional portfolio in under 5 minutes—no design skills required. It integrates with GitHub and LinkedIn and leverages AI (GPT-4o-mini) to automate content creation. Built with Astro and React islands for interactivity, styled using Shadcn/ui and Tailwind CSS, with a Supabase backend and DigitalOcean hosting supporting wildcard subdomains.

## Tech Stack

- **Frontend:** Astro 5, React 19, TypeScript 5  
- **Styling:** Tailwind CSS 4, Shadcn/ui  
- **Backend & Database:** Supabase  
- **AI Integration:** openrouter.ai (GPT-4o-mini)  
- **CI/CD & Hosting:** GitHub Actions, DigitalOcean  

## Getting Started

### Prerequisites

- Node.js v22.14.0 (use [nvm](https://github.com/nvm-sh/nvm) via `.nvmrc`)  
- npm (or yarn/pnpm)  
- Create a Supabase project and obtain **SUPABASE_URL** and **SUPABASE_ANON_KEY**  
- Obtain an OpenRouter API key for AI integration  

### Setup

```bash
# Clone the repository
git clone https://github.com/your-org/hackerfolio.git
cd hackerfolio

# Use the correct Node version
nvm use

# Install dependencies
npm install

# Copy .env example and fill in your keys
cp .env.example .env
# Edit .env:
# SUPABASE_URL=...
# SUPABASE_ANON_KEY=...
# OPENROUTER_API_KEY=...

# Start development server
npm run dev
```

## Available Scripts

| Command           | Description                     |
| ----------------- | ------------------------------- |
| `npm run dev`     | Start Astro dev server          |
| `npm run build`   | Build for production (SSR)      |
| `npm run preview` | Preview production build        |
| `npm run astro`   | Run any Astro CLI command       |
| `npm run lint`    | Run ESLint                      |
| `npm run lint:fix`| Fix lint errors automatically   |
| `npm run format`  | Run Prettier to format code     |

## Project Scope

- **Authentication:** GitHub OAuth, email/password via Supabase Auth  
- **Onboarding:** Unique subdomain (`username.hackerfolio.dev`), optional quick-start wizard  
- **Section Management:** Create, reorder (drag-and-drop), toggle, delete (max 10 sections)  
- **Component System:** Seven types (text, project card, tech list, social links, generic links list, ordered/unordered list, gallery), max 15 components  
- **Import Features:** GitHub repo selection (3–10) with AI-generated project cards; LinkedIn profile JSON parsing and preview  
- **Publishing:** SSR to wildcard subdomain, validation (≥1 section), publish/unpublish  
- **Dashboard:** Split view (sections + component editor), auto-save, real-time preview  
- **Landing Page:** Hero section, 3-step overview, example portfolio, “Free during beta” footer  

## Project Status

This project is currently in **Beta** as an MVP. Features and limits (one template, section/component caps) may evolve based on user feedback.
