# ---
# Install some utils for container
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
# Configure project build
# ---
FROM setup as build
USER node
# REFERENCE: for pnpm install in container https://pnpm.io/cli/fetch
COPY --chown=1000:1000 package.json pnpm-lock.yaml .pnpm-workspace.yaml ./
RUN pnpm fetch -r
# force NODE_ENV to development to install dev dependencies for build
RUN (export NODE_ENV="development"; pnpm install -r --frozen-lockfile --offline)
COPY --chown=1000:1000 . .
# build all packages in monorepo, assets place in /home/node/project/packages/{PROJECT}/dist
RUN (export NODE_ENV="production"; pnpm build)

# ---
# Prepare project to be run
# ---
FROM setup as run
# NOTE: NODE_ENV can be overridden while actively developing
USER node
ARG NODE_ENV="production"
ARG COMPOSE_ENV
ARG COMPOSE_HOST
COPY --chown=1000:1000 package.json pnpm-lock.yaml .pnpm-workspace.yaml ./
# unlike build stage, I only need production dependencies here
RUN pnpm fetch -r
RUN pnpm install -r --frozen-lockfile --offline
# TODO: only copy dist folders and their package.json files since packages/**/src/** is not needed
RUN mkdir -p ./packages
# user "node" in container has UID/GID of 1000
COPY --chown=1000:1000 --from=build /home/node/project/packages ./packages

COPY --chown=1000:1000 ./entrypoint.mjs .
RUN chmod +x entrypoint.mjs
# NOTE: copying everything is useful for development processes but should probably be removed from production container
COPY --chown=1000:1000 . .

ENTRYPOINT [ "./entrypoint.mjs" ]
