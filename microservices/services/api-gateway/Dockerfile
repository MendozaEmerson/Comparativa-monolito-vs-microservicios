FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY microservices/services/api-gateway/ ./microservices/services/api-gateway/

RUN npm install
RUN npm --prefix microservices/services/api-gateway run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/microservices/services/api-gateway/package*.json ./microservices/services/api-gateway/
COPY --from=builder /app/microservices/services/api-gateway/dist ./microservices/services/api-gateway/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/microservices/services/api-gateway/node_modules ./microservices/services/api-gateway/node_modules

EXPOSE 3000
CMD ["node", "microservices/services/api-gateway/dist/gateway.js"]

