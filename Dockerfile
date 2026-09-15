# ---- Builder stage: full devDependencies so tsc/rimraf/copyfiles are available ----
FROM node:22-bookworm-slim AS builder

WORKDIR /app
# The builder only runs the TypeScript compiler; it never launches a browser,
# so skip Puppeteer's ~280MB Chromium download here too and save build time.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

COPY package*.json ./
RUN npm ci

COPY tsconfig.json jest.config.cjs README.md ./
COPY src ./src
COPY scripts ./scripts
RUN npm run build

# ---- Runtime stage: production deps only + system Chromium for Puppeteer ----
FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173

# Use Debian's Chromium instead of Puppeteer's bundled download: smaller image,
# no download-reliability issues during the build, and it already ships with
# every shared library (libnss3, libatk, libgtk, etc.) Chromium needs to launch.
ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

EXPOSE 4173
USER node
CMD ["npm", "start"]
