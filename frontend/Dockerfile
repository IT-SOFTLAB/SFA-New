
FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json ./

RUN npm ci

ARG VITE_API_BASE_URL
ARG VITE_API_VERSION=api/v1
ARG VITE_TOMTOM_API_KEY

ENV VITE_API_BASE_URL=${VITE_API_BASE_URL} \
  VITE_API_VERSION=${VITE_API_VERSION} \
  VITE_TOMTOM_API_KEY=${VITE_TOMTOM_API_KEY}

COPY . .

RUN npm run build

FROM nginx:1.25-alpine AS runner

COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
