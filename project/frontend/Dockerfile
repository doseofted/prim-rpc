# ---
# Install some utils for container
# ---
FROM node:16.13-bullseye as setup
USER root
RUN npm install --global zx
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project

# ---
# Configure project build
# ---
FROM node:16.13-bullseye as build
USER node
ARG VITE_HOST
ARG VITE_COMPOSE_ENV
RUN mkdir -p /home/node/project
WORKDIR /home/node/project
COPY --chown=1000:1000 package.json .
COPY --chown=1000:1000 pnpm-lock.yaml .
# force NODE_ENV to development to install dev dependencies for build
RUN (export NODE_ENV="development"; pnpm install)
COPY --chown=1000:1000 . .
RUN pnpm check
RUN (export NODE_ENV="production"; pnpm build)

# ---
# Prepare project to be run
# ---
FROM setup as run
USER node
# NOTE: NODE_ENV can be overridden while actively developing
ARG NODE_ENV="production"
COPY --chown=1000:1000 package.json .
COPY --chown=1000:1000 pnpm-lock.yaml .
# unlike build stage, I only need production dependencies here
RUN pnpm install
# user "node" in container has UID/GID of 1000
COPY --chown=1000:1000 --from=build /home/node/project/dist ./dist
COPY --chown=1000:1000 . .
# RUN chmod +x entrypoint.mjs

EXPOSE 3000

ENTRYPOINT [ "pnpm" ]
