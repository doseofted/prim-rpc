# ---
# Install some utils for container
# ---
FROM node:16.7-bullseye as setup
USER root
RUN npm install --global zx

# ---
# Configure project build
# ---
FROM node:16.7-bullseye as build
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project
COPY --chown=1000:1000 package.json .
COPY --chown=1000:1000 yarn.lock .
COPY --chown=1000:1000 .yarnrc.yml .
COPY --chown=1000:1000 .yarn/. ./.yarn
# force NODE_ENV to development to install dev dependencies for build
RUN (export NODE_ENV="development"; yarn)
COPY --chown=1000:1000 . .
RUN (export NODE_ENV="production"; yarn build)

# ---
# Prepare project to be run
# ---
FROM setup as run
# NOTE: NODE_ENV can be overridden while actively developing
ARG NODE_ENV="production"
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project
COPY --chown=1000:1000 package.json .
COPY --chown=1000:1000 yarn.lock .
COPY --chown=1000:1000 .yarnrc.yml .
COPY --chown=1000:1000 .yarn/. ./.yarn
# unlike build stage, I only need production dependencies here
RUN yarn
# user "node" in container has UID/GID of 1000
COPY --chown=1000:1000 --from=build /home/node/project/dist ./dist
COPY --chown=1000:1000 . .
# NOTE: `src` folder is removed from final container but remains part of final Docker image
RUN rm -fr src
RUN chmod +x entrypoint.mjs

EXPOSE 3001

ENTRYPOINT [ "./entrypoint.mjs" ]
