# NOTE: this file is intended to create a working dev environment quickly, not for use in the project itself

FROM node:16.13-bullseye
USER root
RUN corepack enable
RUN corepack prepare pnpm@6.26.1 --activate
RUN pnpm install zx --global
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project
