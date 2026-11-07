FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY shared/ ./shared/
COPY microservices/services/reservations-service/ ./microservices/services/reservations-service/

RUN npm install
RUN npm --prefix shared run build
RUN npm --prefix microservices/services/reservations-service run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
COPY --from=builder /app/shared/package*.json ./shared/
COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/microservices/services/reservations-service/package*.json ./microservices/services/reservations-service/
COPY --from=builder /app/microservices/services/reservations-service/dist ./microservices/services/reservations-service/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/microservices/services/reservations-service/node_modules ./microservices/services/reservations-service/node_modules

EXPOSE 3002
CMD ["node", "microservices/services/reservations-service/dist/server.js"]

