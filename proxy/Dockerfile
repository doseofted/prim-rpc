FROM caddy:2.5.2 as base
WORKDIR /etc/caddy
COPY base.Caddyfile .

FROM base as dev
COPY dev.Caddyfile Caddyfile

FROM base as prod
COPY prod.Caddyfile Caddyfile

FROM base as staging
COPY staging.Caddyfile Caddyfile
