# NOTE: this file is intended to create a working dev environment quickly, not for use in the project itself
# Build:
# $ docker build -f Dev.Dockerfile -t dev-prim-environment .
# Test:
# $ docker run --rm -it dev-prim-environment:latest
FROM buildpack-deps:bullseye
USER root
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update

# Node will be used all through the project since this is mostly a typescript project
RUN curl -fsSL https://deb.nodesource.com/setup_16.x | bash -
RUN apt-cache madison nodejs
RUN apt-get install -y nodejs=16.13.2-deb-1nodesource1

# pnpm is the package manager for the project
RUN corepack enable
RUN corepack prepare pnpm@6.26.1 --activate

# zx scripts are just easier to write than shell scripts and are used throughout this project
RUN pnpm install zx@4.3.0 --global

# Caddy is used as a reverse proxy and couldbe tested in development if needed
# REFERENCE: https://caddyserver.com/docs/install#debian-ubuntu-raspbian
RUN apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | tee /etc/apt/trusted.gpg.d/caddy-stable.asc
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
RUN apt-get update
RUN apt-cache madison caddy
RUN apt-get install -y caddy=2.4.6

ENTRYPOINT [ "/bin/bash" ]
