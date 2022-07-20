# NOTE: this image is only to be used as a development environment as needed, never in production.
# Use Node
FROM node:16.15-bullseye
USER root
# Install PNPM
RUN corepack enable
RUN corepack prepare pnpm@7.5.2 --activate
# Install Task
RUN sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin
# Install Caddy
ENV DEBIAN_FRONTEND=noninteractive
RUN apt-get update -qq
RUN apt install -y debian-keyring debian-archive-keyring apt-transport-https
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
RUN curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
RUN apt-get update -qq
RUN apt-get install -y caddy

USER node
WORKDIR /home/node/development
