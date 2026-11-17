FROM node:22-alpine AS deps
WORKDIR /app
# Build tools for better-sqlite3's native module (no prebuilt musl binary).
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json ./
# --ignore-scripts stays (SonarQube #97); rebuild only better-sqlite3's native module.
RUN npm ci --ignore-scripts
RUN npm rebuild better-sqlite3

FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
# The named volume at /app/data inherits this ownership on first mount,
# so the node user can create the SQLite file inside it.
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 3000
CMD ["node", "server.js"]
