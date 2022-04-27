# NOTE: the context for this Dockerfile is the project root, not the location of the Dockerfile

# ---
# Install pnpm and zx on top of Node image, needed to run
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
# Install all needed dependencies across project, to be used for build
# ---
FROM setup as installed
USER node
# REFERENCE: for pnpm install in container https://pnpm.io/cli/fetch
COPY --chown=1000:1000 pnpm-*.yaml package.json ./
# fetch dev and prod dependencies to prepare for build, to be installed later
RUN (export NODE_ENV="development"; pnpm fetch)

# ---
# Build the project
# ---
FROM installed as built
USER node
COPY --chown=1000:1000 libraries ./libraries
# Install using fetched dependencies
RUN pnpm install --offline --frozen-lockfile
# build all library packages with Parcel
RUN (export NODE_ENV="production"; pnpm packages:build)
# build all frontend projects with Vite
RUN (export NODE_ENV="production"; pnpm --filter './interface' build)

# ---
# Prepare project to be run
# ---
FROM installed as run
USER node
# By using NODE_ENV arg, I can limit whether dev dependencies are installed
ARG NODE_ENV "production"
ARG HOST
# Run clean install using given NODE_ENV
COPY --chown=1000:1000 pnpm-*.yaml package.json ./
# RUN pnpm fetch
# Copy all built libraries and their package.json
COPY --from=built /home/node/prim/libraries ./libraries
RUN pnpm install --frozen-lockfile --offline
# Copy utilities used by run script
RUN mkdir -p /home/node/prim/misc
COPY --chown=1000:1000 misc/zx-utils.mjs ./misc
# Copy the run script itself
COPY --chown=1000:1000 libraries/entrypoint.mjs ./libraries/
# CMD [ "/bin/bash" ]
ENTRYPOINT [ "./libraries/entrypoint.mjs" ]
