# NOTE: the context for this Dockerfile is the project root, not the location of the Dockerfile

# ---
# Install common utils for container
# ---
FROM node:16.14-bullseye as setup
USER root
RUN corepack enable
RUN corepack prepare pnpm@6.32.11 --activate
RUN pnpm add zx@6.1.0 --global
USER node
RUN mkdir -p /home/node/prim
WORKDIR /home/node/prim

# ---
# Install all needed dependencies in monorepo, to be used by other containers (to avoid duplicate network requests)
# ---
FROM setup as installed
USER node
# REFERENCE: for pnpm install in container https://pnpm.io/cli/fetch
COPY --chown=1000:1000 pnpm-*.yaml package.json ./
# install dev and prod dependencies to prepare for build
RUN (export NODE_ENV="development"; pnpm fetch)

# ---
# Configure project build
# ---
FROM installed as built
USER node
COPY --chown=1000:1000 libraries ./libraries
RUN pnpm install --offline --frozen-lockfile
# build all packages copied into the container from the monorepo
ARG NODE_ENV "production"
RUN pnpm packages:build
# TODO: run build script in interface folder but built library instead of using html entry point
RUN pnpm --filter './interface' build

# ---
# Prepare project to be run
# ---
FROM installed as run
# NOTE: NODE_ENV can be overridden while actively developing and pnpm utilizes the variable
USER node
ARG NODE_ENV "production"
ARG HOST
# Copy all built libraries and their package.json
COPY --from=built /home/node/prim/libraries ./libraries
# RUN pnpm install --frozen-lockfile --offline --prod
RUN mkdir -p /home/node/prim/misc
COPY --chown=1000:1000 misc/zx-utils.mjs ./misc
COPY --chown=1000:1000 libraries/entrypoint.mjs ./libraries

# CMD [ "/bin/bash" ]
ENTRYPOINT [ "./libraries/entrypoint.mjs" ]
