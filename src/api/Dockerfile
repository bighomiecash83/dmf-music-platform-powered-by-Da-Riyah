# DMF - Node Service Dockerfile (prod, multi-stage)
# Target: src/api and services/payment-service
# Assumes package.json has:
# - "start" script for production
# - optional "build" script
#
# IMPORTANT for AWS/ECS:
# - bind to 0.0.0.0 (NOT localhost)
# - respect PORT env var (default 8080)

FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --if-present

FROM node:20-alpine AS run
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app ./

ENV PORT=8080
EXPOSE 8080
CMD ["npm", "start"]
