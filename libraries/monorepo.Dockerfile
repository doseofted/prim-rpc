# NOTE: the context for this Dockerfile is the project root, not the location of the Dockerfile

# ---
# Install common utils for container
# ---
FROM node:16.13-bullseye as setup
USER root
RUN npm install --global zx
RUN corepack enable
RUN corepack prepare pnpm@6.26.1 --activate
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project

# ---
# Install all needed dependencies in monorepo, to be used by other containers (to avoid duplicate network requests)
# ---
FROM setup as production_modules
USER node
# REFERENCE: for pnpm install in container https://pnpm.io/cli/fetch
COPY --chown=1000:1000 .pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# install prod dependencies since dev dependencies are only needed for build
RUN pnpm fetch --prod

# ---
# Configure project build
# ---
FROM setup as build
USER node
# REFERENCE: for pnpm install in container https://pnpm.io/cli/fetch
COPY --chown=1000:1000 .pnpm-workspace.yaml package.json pnpm-lock.yaml ./
# install dev dependencies since they'll be needed for build
RUN pnpm fetch --dev
COPY --chown=1000:1000 libraries/* .
# force NODE_ENV to development to install dev dependencies for build
RUN (export NODE_ENV="development"; pnpm install -r --frozen-lockfile --offline)
COPY --chown=1000:1000 . .
# build all packages copied into the container from the monorepo
RUN (export NODE_ENV="production"; pnpm build)

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
COPY --from=build /home/node/project/libraries/*/dist /home/node/project/libraries/*/package.json /home/node/project/libraries/*/pnpm-lock.yaml ./
# unlike build stage, I only need production dependencies here
RUN pnpm install -r --frozen-lockfile --offline

RUN mkdir -p /home/node/misc
COPY --chown=1000:1000 misc/zx-utils.mjs /home/node/misc
COPY --chown=1000:1000 libraries/entrypoint.mjs .
RUN chmod +x entrypoint.mjs

ENTRYPOINT [ "./entrypoint.mjs" ]
