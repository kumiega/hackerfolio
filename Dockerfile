# Use Node 20 Alpine as base
FROM node:20-alpine AS base

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Build stage
FROM base AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build arguments for environment variables
ARG PUBLIC_BASE_URL
ARG PUBLIC_BASE_DOMAIN
ARG PUBLIC_SUPABASE_URL
ARG PUBLIC_SUPABASE_KEY

# Set environment variables for build
ENV PUBLIC_BASE_URL=$PUBLIC_BASE_URL
ENV PUBLIC_BASE_DOMAIN=$PUBLIC_BASE_DOMAIN
ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
ENV PUBLIC_SUPABASE_KEY=$PUBLIC_SUPABASE_KEY

# Build the application
RUN pnpm run build

# Production stage
FROM base AS runtime

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install production dependencies only
RUN pnpm install --prod --frozen-lockfile

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S astro -u 1001 && \
    chown -R astro:nodejs /app

USER astro

# Expose port 4321
EXPOSE 4321

# Set environment to production
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=4321

# Start the application
CMD ["node", "./dist/server/entry.mjs"]