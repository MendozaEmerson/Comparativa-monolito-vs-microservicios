# Multi-stage Dockerfile for Modular Monolith
FROM node:20-alpine AS builder
WORKDIR /app

# Copy root workspace and packages
COPY package*.json ./
COPY shared/ ./shared/
COPY monolith/ ./monolith/

# Install and build
RUN npm install
RUN npm --prefix shared run build
RUN npm --prefix monolith run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/shared/package*.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/monolith/package*.json ./monolith/
COPY --from=builder /app/monolith/dist ./monolith/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/monolith/node_modules ./monolith/node_modules

EXPOSE 3000
CMD ["node", "monolith/dist/server.js"]

