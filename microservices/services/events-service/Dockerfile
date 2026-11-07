FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY microservices/services/events-service/ ./microservices/services/events-service/

RUN npm install
RUN npm --prefix shared run build
RUN npm --prefix microservices/services/events-service run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/shared/package*.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/microservices/services/events-service/package*.json ./microservices/services/events-service/
COPY --from=builder /app/microservices/services/events-service/dist ./microservices/services/events-service/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/microservices/services/events-service/node_modules ./microservices/services/events-service/node_modules

EXPOSE 3001
CMD ["node", "microservices/services/events-service/dist/server.js"]

