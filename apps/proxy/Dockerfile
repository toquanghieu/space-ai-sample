# Reverse proxy with the config baked in — no host bind-mount, so it deploys
# identically on Portainer regardless of how the stack is created.
# Build context = monorepo root.
FROM nginx:alpine
# htpasswd (apache2-utils) for optional Basic Auth generated at startup.
RUN apk add --no-cache apache2-utils
COPY nginx.conf /etc/nginx/nginx.conf
# Runs before nginx starts; enables Basic Auth when the env vars are set.
COPY apps/proxy/40-basic-auth.sh /docker-entrypoint.d/40-basic-auth.sh
RUN chmod +x /docker-entrypoint.d/40-basic-auth.sh
