# Reverse proxy with the config baked in — no host bind-mount, so it deploys
# identically on Portainer regardless of how the stack is created.
# Build context = monorepo root.
FROM nginx:alpine
COPY nginx.conf /etc/nginx/nginx.conf
