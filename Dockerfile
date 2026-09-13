FROM node:22-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4173

COPY package*.json ./
RUN npm ci --omit=dev

COPY tsconfig.json jest.config.cjs README.md ./
COPY src ./src
RUN npm run build

EXPOSE 4173
USER node
CMD ["npm", "start"]
