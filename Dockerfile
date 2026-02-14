FROM node:20-alpine AS base

# --- Dependencies ---
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- Builder ---
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ARG NEXTAUTH_SECRET="build-time-placeholder"
ARG OPENAI_API_KEY="build-time-placeholder"

ENV DATABASE_URL=$DATABASE_URL
ENV NEXTAUTH_SECRET=$NEXTAUTH_SECRET
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV NEXT_TELEMETRY_DISABLED=1

RUN npx prisma generate
RUN npm run build

# --- Runner ---
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/public ./public
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/prisma/schema.prisma ./prisma/schema.prisma
COPY --from=builder /app/prisma/seed-prod.js ./prisma/seed-prod.js
COPY --from=builder /app/prisma/sync-templates.js ./prisma/sync-templates.js
COPY --from=builder /app/prisma/sync-icd10.js ./prisma/sync-icd10.js
COPY --from=builder /app/data ./data
COPY --from=builder /app/package.json ./package.json

# Install prisma CLI + bcryptjs for migrations and seed at startup
RUN npm install --no-save prisma @prisma/client bcryptjs && npx prisma generate

# Next.js standalone output
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Entrypoint: migrations + seed + start
COPY scripts/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["/docker-entrypoint.sh"]
