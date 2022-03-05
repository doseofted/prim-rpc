# NOTE: the context for this Dockerfile is the project root, not the location of the Dockerfile

# ---
# Install common utils for container
# ---
FROM node:16.14-bullseye-slim as setup
ARG DEBIAN_FRONTEND "noninteractive"
RUN apt-get update -qq --no-install-recommends \
	&& apt-get install -qq build-essential python3
USER root
RUN corepack enable
RUN corepack prepare pnpm@6.32.2 --activate
RUN pnpm install zx@5.2.0 --global
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project

# ---
# Install all needed dependencies in monorepo, to be used by other containers (to avoid duplicate network requests)
# ---
FROM setup as installed
USER node
# REFERENCE: for pnpm install in container https://pnpm.io/cli/fetch
COPY --chown=1000:1000 pnpm-*.yaml package.json ./
# install prod dependencies since dev dependencies are only needed for build, unless NODE_ENV is changed (during dev)
ARG NODE_ENV "production"
RUN pnpm fetch

# ---
# Configure project build
# ---
FROM installed as built
USER node
# in addition to prod dependencies, install dev dependencies since they'll be needed for build
RUN pnpm fetch --dev
COPY --chown=1000:1000 libraries ./libraries
RUN pnpm install --offline --frozen-lockfile --dev
# build all packages copied into the container from the monorepo
RUN (export NODE_ENV="production"; pnpm libraries:build)
# Now remove all folders for source code and dev-related node_modules (only prod node_modules needed later)
RUN find ./libraries -type d -name 'src' -o -name 'node_modules' -prune -exec rm -rf {} \;

# ---
# Prepare project to be run
# ---
FROM installed as run
# NOTE: NODE_ENV can be overridden while actively developing and pnpm utilizes the variable
USER node
ARG NODE_ENV "production"
ARG HOST
# Copy all built libraries and their package.json
COPY --from=built /home/node/project/libraries ./libraries
# unlike build stage, I only need production dependencies here
RUN pnpm install --frozen-lockfile --offline

RUN mkdir -p /home/node/project/misc
COPY --chown=1000:1000 misc/zx-utils.mjs ./misc
COPY --chown=1000:1000 libraries/entrypoint.mjs ./libraries
RUN chmod +x ./libraries/entrypoint.mjs

# CMD [ "/bin/bash" ]
ENTRYPOINT [ "./libraries/entrypoint.mjs" ]
