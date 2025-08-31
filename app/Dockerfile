# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
# Use npm install to allow adapter-node to be added without lock mismatch
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy built app from builder stage
COPY --from=builder /app/build ./build
COPY --from=builder /app/package*.json ./

# Install only production dependencies in the app root (Node adapter runs with `node build`)
RUN npm install --omit=dev

EXPOSE 3000

CMD ["node", "build"]
