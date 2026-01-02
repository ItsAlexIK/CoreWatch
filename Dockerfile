# Use a slim Node.js base image
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Keep environment in production mode by default
ENV NODE_ENV=production

# Install dependencies first to leverage Docker layer caching
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --omit=dev; else npm install --omit=dev; fi \
    && npm cache clean --force

# Copy the rest of the application code
COPY . .

# Run as the non-root node user provided by the base image
USER node

CMD ["node", "index.js"]
