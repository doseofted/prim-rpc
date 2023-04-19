FROM node:19.9-bullseye as monorepo-install
USER root
# Corepack is still experimental and not enabled by default
# LINK https://nodejs.org/api/corepack.html#enabling-the-feature
RUN corepack enable
USER node
# Create generic project folder in home and assign to correct user
RUN mkdir -p /home/node/project && chown node /home/node/project
WORKDIR /home/node/project
# Lockfiles should be copied first when `pnpm fetch` command is used
# LINK https://pnpm.io/cli/fetch#usage-scenario
COPY --chown=node pnpm-*.yaml package.json ./
RUN pnpm fetch
# Copy miscellaneous configuration related to project that could be used in container
COPY --chown=node .eslint* .nvmrc Taskfile.yml tsconfig.json turbo.json build-deps.mjs  ./
COPY --chown=node misc misc
COPY --chown=node docs docs

FROM monorepo-install as prim-monorepo-build
# Build all project dependencies once (excluding `apps/`, built in each respective Dockerfile)
# First, start with libraries used in the project
COPY --chown=node libs libs
RUN pnpm install --offline --frozen-lockfile
RUN pnpm task dev:build -- "--filter=./libs/*"
ENV NODE_ENV=development
# "build-libs" task will watch libs and rebuild in development
CMD [ "pnpm", "task", "dev:build-libs" ]
