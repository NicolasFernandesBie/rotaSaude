FROM node:22-bookworm-slim

RUN corepack enable && apt-get update && apt-get install -y --no-install-recommends openssl && rm -rf /var/lib/apt/lists/*
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY prisma ./prisma
RUN pnpm exec prisma generate

COPY tsconfig.json ./
COPY src ./src
COPY docker-entrypoint.sh ./

RUN mkdir -p /data && chown -R node:node /app /data
USER node

ENV NODE_ENV=production
EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
