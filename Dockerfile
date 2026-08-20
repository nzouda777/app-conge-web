FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Vite bakes VITE_* variables into the bundle at build time.
ARG VITE_API_URL=http://localhost:3000
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

FROM nginx:1.27-alpine AS runtime
COPY nginx.conf /etc/nginx/conf.d/default.conf
# Kept out of conf.d/ so nginx's `include conf.d/*.conf` doesn't load it as a
# stray http-context block — it's pulled in explicitly per-location instead.
COPY security-headers.conf /etc/nginx/security-headers.conf
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
