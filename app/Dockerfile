# ---- Build stage ------------------------------------------------------------
FROM node:22-alpine AS builder

WORKDIR /app

# Install deps with a locked, reproducible install
COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

RUN npm ci --omit=dev

USER node

EXPOSE 3000

CMD ["node", "build"]