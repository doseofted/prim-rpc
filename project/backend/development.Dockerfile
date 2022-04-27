# NOTE: the context for this Dockerfile is the project root, not the location of the Dockerfile
# NOTE: ./libraries/Dockerfile must be built and tagged "libraries" before building ths image.
#       This can be accomplished by building with docker-compose configuration in project

# ---
# Install needed dependencies in this project (fetched in libraries image, needs to run for this project yet)
# ---
ARG PROJECT_VERSION latest
FROM doseofted/prim-libraries:${PROJECT_VERSION} as installed
USER node
RUN mkdir -p /home/node/prim/project/backend 
COPY --chown=1000:1000 project/backend/package.json ./project/backend/package.json

# ---
# Configure project build
# ---
FROM installed as built
USER node

COPY --chown=1000:1000 project/backend ./project/backend
# install fetched dependencies from base image
RUN pnpm --filter="backend" install --offline --frozen-lockfile
# typechecks need to ran first since build step does not consider types
RUN pnpm --filter="backend" check
# build the server only, not libraries since already built
RUN (export NODE_ENV="production"; pnpm --filter="backend" build)

# ---
# Prepare project to be run
# ---
FROM installed as run
USER node
ARG NODE_ENV "production"
COPY --from=built /home/node/prim/project/backend ./project/backend
# unlike build stage, I only need production dependencies here
RUN pnpm install --frozen-lockfile --offline
# NOTE: entrypoint's utilities have already been copied over in libraries image
COPY --chown=1000:1000 project/backend/entrypoint.mjs ./project/backend

EXPOSE 3001

ENTRYPOINT [ "./project/backend/entrypoint.mjs" ]
