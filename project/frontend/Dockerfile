# NOTE: the context for this Dockerfile is the project root, not the location of the Dockerfile
# NOTE: ./libraries/Dockerfile must be built and tagged "libraries" before building ths image.
#       This can be accomplished by building with docker-compose configuration in project

# ---
# Install needed dependencies in this project (fetched in libraries image, needs to run for this project yet)
# ---
ARG PROJECT_VERSION latest
FROM doseofted/prim-libraries:${PROJECT_VERSION} as installed
USER node
# NOTE: I should probably rename "/home/node/project" so I don't have to type "project" twice
RUN mkdir -p /home/node/project/project/frontend 
COPY --chown=1000:1000 project/frontend/package.json ./project/frontend/package.json

# ---
# Configure project build
# ---
FROM installed as built
USER node
ARG VITE_HOST
RUN pnpm fetch --dev
COPY --chown=1000:1000 project/frontend ./project/frontend
# yes, install happened in utilized libraries image *but* install needs to run again
# so that binaries can be copied and symlinks for this project created
# FIXME: --dev flag in install breaks image, find out why
RUN pnpm install --offline --frozen-lockfile
# typechecks need to ran first since build step does not consider types
RUN pnpm check --filter="frontend"
# build the server only, not libraries since already built
RUN (export NODE_ENV="production"; pnpm build --filter="frontend")
# Now remove all folders for source code and dev-related node_modules (only prod node_modules needed later)
RUN find ./project/frontend -type d -name 'src' -o -name 'node_modules' -prune -exec rm -rf {} \;

# ---
# Prepare project to be run
# ---
FROM installed as run
# NOTE: NODE_ENV can be overridden while actively developing and pnpm utilizes the variable
USER node
ARG NODE_ENV="production"
COPY --from=built /home/node/project/project/frontend ./project/frontend
# unlike build stage, I only need production dependencies here
RUN pnpm install --frozen-lockfile --offline
# NOTE: entrypoint's utilities have already been copied over in libraries image
COPY --chown=1000:1000 project/frontend/entrypoint.mjs ./project/frontend
RUN chmod +x ./project/frontend/entrypoint.mjs

EXPOSE 3000

# CMD [ "/bin/bash" ]
ENTRYPOINT [ "./project/frontend/entrypoint.mjs" ]
