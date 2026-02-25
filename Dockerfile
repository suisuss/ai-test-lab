FROM node:20-slim AS base

RUN corepack enable && corepack prepare pnpm@latest --activate
RUN apt-get update && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm exec prisma generate

# Dev target — runs the dev server
FROM base AS dev
EXPOSE 3000
CMD ["sh", "-c", "pnpm exec prisma db push && pnpm db:seed && pnpm dev --hostname 0.0.0.0 --port 3000"]

# Test target — runs Playwright tests
FROM base AS test
RUN pnpm exec playwright install --with-deps chromium
CMD ["sh", "-c", "pnpm exec prisma db push && pnpm db:seed && pnpm exec playwright test"]
