FROM node:22-alpine AS builder

WORKDIR /app
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate

# Copy everything
COPY . .

# Install dependencies
RUN pnpm install --frozen-lockfile

# Build Web (Vite)
RUN pnpm exec nx build web

FROM nginx:alpine AS runner

# Copy the built assets to Nginx
COPY --from=builder /app/apps/web/dist /usr/share/nginx/html

# Add a basic nginx conf to support React Router (SPA fallback to index.html)
RUN echo 'server { \
    listen 80; \
    client_max_body_size 100m; \
    location /api/ { \
        proxy_pass http://api:3000/; \
        proxy_set_header Host $host; \
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for; \
    } \
    location / { \
        root /usr/share/nginx/html; \
        index index.html index.htm; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
