# Build stage: install only production dependencies
FROM node:20-alpine AS deps
WORKDIR /usr/src/app
ENV NODE_ENV=production

COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev --omit=optional --no-fund --no-audit; else npm install --omit=dev --omit=optional --no-fund --no-audit; fi \
    && npm prune --omit=dev --omit=optional \
    && npm cache clean --force

# Runtime stage: minimal Alpine with just node
FROM alpine:3.19 AS runner
WORKDIR /usr/src/app
ENV NODE_ENV=production

RUN apk add --no-cache nodejs-current \
    && addgroup -S node && adduser -S node -G node

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node index.js ./
COPY --chown=node:node src ./src
COPY --chown=node:node deploy-commands.js ./deploy-commands.js

USER node

CMD ["node", "index.js"]
