# NOTE: the context for this Dockerfile is the project root, not the location of the Dockerfile

# ---
# Install common utils for container
# ---
FROM node:16.13-bullseye as setup
USER root
RUN corepack enable
RUN corepack prepare pnpm@6.26.1 --activate
RUN pnpm install zx --global
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project

# ---
# Install all needed dependencies in monorepo, to be used by other containers (to avoid duplicate network requests)
# ---
FROM setup as production_modules
USER node
# REFERENCE: for pnpm install in container https://pnpm.io/cli/fetch
COPY --chown=1000:1000 pnpm-*.yaml package.json ./
# install prod dependencies since dev dependencies are only needed for build, unless NODE_ENV is changed (during dev)
ARG NODE_ENV="production"
RUN pnpm fetch

# ---
# Configure project build
# ---
FROM production_modules as build
USER node
# in addition to prod dependencies, install dev dependencies since they'll be needed for build
RUN pnpm fetch --dev
COPY --chown=1000:1000 libraries ./libraries
RUN pnpm install --offline --frozen-lockfile --dev
# build all packages copied into the container from the monorepo
RUN pnpm libraries:build
# Now remove all folders for source code and dev-related node_modules (only prod node_modules needed later)
RUN find . -type d -name 'src' -o -name 'node_modules' -prune -exec rm -rf {} \;

# ---
# Prepare project to be run
# ---
FROM production_modules as built_libraries
# NOTE: NODE_ENV can be overridden while actively developing project
USER node
ARG NODE_ENV="production"
ARG COMPOSE_ENV
ARG COMPOSE_HOST
# Copy all build libraries and their package.json
# TODO: copy all built libraries into one folder to avoid multiple COPY commands
COPY --from=build /home/node/project/libraries ./libraries

# unlike build stage, I only need production dependencies here
RUN pnpm install --frozen-lockfile --offline

RUN mkdir -p /home/node/misc
COPY --chown=1000:1000 misc/zx-utils.mjs /home/node/misc
COPY --chown=1000:1000 libraries/entrypoint.mjs .
RUN chmod +x entrypoint.mjs

# CMD [ "/bin/bash" ]
ENTRYPOINT [ "./entrypoint.mjs" ]
