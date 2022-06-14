# NOTE: this file is intended to create a working dev environment quickly in VS Code, not for use in the project itself
# Build:
# $ docker build -f Dev.Dockerfile -t dev-prim-environment .
# Test:
# $ docker run --rm -it dev-prim-environment:latest

# FIXME: this image has not been used in the project but could be edited later if useful

FROM node:18.1-bullseye
USER root
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update

# pnpm is the package manager for the project
RUN corepack enable
RUN corepack prepare pnpm@7.0.1 --activate

# zx scripts are just easier to write than shell scripts and are used throughout this project
RUN npm install zx@6.1.0 --global

# Caddy is used as a reverse proxy and could be tested in development if needed
# REFERENCE: https://caddyserver.com/docs/install#debian-ubuntu-raspbian
RUN apt-get install -y debian-keyring debian-archive-keyring apt-transport-https
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | tee /etc/apt/trusted.gpg.d/caddy-stable.asc
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
RUN apt-get update
RUN apt-cache madison caddy
RUN apt-get install -y caddy=2.5.1

# Install Task, the task runer for the project
RUN sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin

USER node
ENTRYPOINT [ "/bin/bash" ]
