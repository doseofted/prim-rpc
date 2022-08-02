FROM node:16.15-bullseye as monorepo-install
USER root
# Corepack is still experimental and not enabled by default
# LINK https://nodejs.org/api/corepack.html#enabling-the-feature
# NOTE: it seems corepack `enable` and `prepare` need to be separate steps (otherwise correct version is not used)
RUN corepack enable
RUN corepack prepare pnpm@7.7.1 --activate
# Use Task to make management of project easier
# LINK https://taskfile.dev/installation/#install-script
RUN sh -c "$(curl --location https://taskfile.dev/install.sh)" -- -d -b /usr/local/bin
USER node
# Set the store-dir explicitly so that I know it's location (to copy later)
# `pnpm config` is alias for `npm config` and `store-dir` is specific to pnpm
# LINK https://pnpm.io/npmrc#store-dir
RUN pnpm config set store-dir /home/node/.pnpm-store
# Create generic project folder in home and assign to correct user
RUN mkdir -p /home/node/project && chown node /home/node/project
WORKDIR /home/node/project
# Lockfiles should be copied first when `pnpm fetch` command is used
# LINK https://pnpm.io/cli/fetch#usage-scenario
# NOTE: temporarily copying package.json in same step because Parcel fails to fetch otherwise on Debian/ARM64
COPY --chown=node pnpm-*.yaml package.json ./
RUN pnpm fetch
# Copy miscellaneous configuration related to project that could be used in container
COPY --chown=node .eslint* .nvmrc .parcelrc Taskfile.yml tsconfig.json turbo.json build-deps.mjs  ./
COPY --chown=node misc misc

FROM monorepo-install as monorepo-build
# Build all project dependencies once (excluding `apps/`, built in each respective Dockerfile)
# First, start with libraries used in the project
COPY --chown=node libs libs
RUN pnpm install --offline --frozen-lockfile
RUN pnpm build-libs
ENV NODE_ENV=development
# If image is used directly, drop into shell for debugging
CMD [ "pnpm", "build-deps" ]
