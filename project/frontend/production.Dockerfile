# NOTE: the context for this Dockerfile is the project root, not the location of the Dockerfile
# NOTE: ./libraries/Dockerfile must be built and tagged "libraries" before building ths image.
#       This can be accomplished by building with docker-compose configuration in project

# ---
# Install needed dependencies in this project (fetched in libraries image, needs to run for this project yet)
# ---
ARG PROJECT_VERSION latest
FROM doseofted/prim-libraries:${PROJECT_VERSION} as installed
USER node
RUN mkdir -p /home/node/prim/project/frontend 
COPY --chown=1000:1000 project/frontend/package.json ./project/frontend/package.json

# ---
# Configure project build
# ---
FROM installed as built
USER node
ARG VITE_HOST
COPY --chown=1000:1000 project/frontend ./project/frontend
# install fetched dependencies from base image
RUN pnpm install --offline --frozen-lockfile
# typechecks need to ran first since build step does not consider types
RUN pnpm --filter="@doseofted/prim-frontend" check
# build the server only, not libraries since already built
RUN (export NODE_ENV="production"; pnpm --filter="@doseofted/prim-frontend" build)

# ---
# Prepare clean minimal image for running project in production
# ---
FROM node:16.14-bullseye-slim as prepare
USER root
RUN corepack enable
RUN corepack prepare pnpm@6.32.11 --activate
RUN pnpm add zx@6.1.0 --global
USER node
RUN mkdir -p /home/node/prim
WORKDIR /home/node/prim
COPY --from=built /home/node/prim/pnpm-*.yaml /home/node/prim/package.json  ./
COPY --from=built /home/node/prim/misc ./misc
COPY --from=built /home/node/prim/libraries ./libraries

# ---
# Prepare project to be run
# ---
FROM prepare as run
USER node
ARG NODE_ENV "production"
# unlike build stage, I only need production dependencies here
RUN pnpm fetch
RUN pnpm install --frozen-lockfile --offline
COPY --from=built /home/node/prim/project ./project
EXPOSE 3000
ENTRYPOINT [ "./project/frontend/entrypoint.mjs" ]
