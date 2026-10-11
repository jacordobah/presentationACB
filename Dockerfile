# syntax=docker/dockerfile:1

FROM node:24.21.0-alpine3.24 AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ARG VITE_LOCATION_SIMULATOR=false
ARG VITE_POSITION_INTERVAL_MS=5000
ARG VITE_POLL_INTERVAL_MS=5000
ENV VITE_LOCATION_SIMULATOR=$VITE_LOCATION_SIMULATOR \
    VITE_POSITION_INTERVAL_MS=$VITE_POSITION_INTERVAL_MS \
    VITE_POLL_INTERVAL_MS=$VITE_POLL_INTERVAL_MS
RUN npm run build

FROM nginx:1.30.5-alpine3.24
# Self-signed certificate for HTTPS on the local network; the tunnel provides a trusted one.
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/certs \
    && openssl req -x509 -nodes -newkey rsa:2048 -days 825 \
        -subj "/CN=localhost" \
        -addext "subjectAltName=DNS:localhost,IP:127.0.0.1" \
        -keyout /etc/nginx/certs/acb.key \
        -out /etc/nginx/certs/acb.crt
COPY nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
