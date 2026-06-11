#!/bin/sh
# Runs automatically via nginx's /docker-entrypoint.d before nginx starts.
# Enables HTTP Basic Auth only when both env vars are provided (set them in
# Portainer / compose). Credentials are never baked into the image or committed.
set -e

mkdir -p /etc/nginx/auth

if [ -n "${BASIC_AUTH_USER:-}" ] && [ -n "${BASIC_AUTH_PASSWORD:-}" ]; then
  htpasswd -bc /etc/nginx/.htpasswd "$BASIC_AUTH_USER" "$BASIC_AUTH_PASSWORD" >/dev/null 2>&1
  cat > /etc/nginx/auth/basic.conf <<EOF
auth_basic "Restricted";
auth_basic_user_file /etc/nginx/.htpasswd;
EOF
  echo "[proxy] HTTP Basic Auth ENABLED (user: ${BASIC_AUTH_USER})"
else
  rm -f /etc/nginx/auth/basic.conf /etc/nginx/.htpasswd
  echo "[proxy] HTTP Basic Auth disabled (set BASIC_AUTH_USER + BASIC_AUTH_PASSWORD to enable)"
fi
