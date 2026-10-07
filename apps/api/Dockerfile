FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy the monorepo (host node_modules/dist excluded via .dockerignore)
COPY . .

# Install all deps
RUN pnpm install

# Build API (Nx also builds the workspace libs it depends on -> libs/*/dist)
RUN pnpm exec nx build api

FROM node:22-alpine AS runner
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Reuse the built workspace: keeps pnpm symlinks, built libs (libs/*/dist),
# the API output (apps/api/dist), migrations and tsx for the migration runner.
COPY --from=builder /app /app

WORKDIR /app/apps/api
EXPOSE 3000

ENV NODE_ENV=production
ENV DATABASE_URL="postgres://ratedeck:ratedeck_password@postgres:5432/ratedeck"
ENV REDIS_URL="redis://redis:6379"

CMD ["node", "dist/main.js"]
