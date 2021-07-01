# ---
# Install some utils for container
# ---
FROM node:16.3-buster as setup
USER root
RUN npm install --global zx

# ---
# Configure project build
# ---
FROM node:16.3-buster as build
USER node
WORKDIR /home/node
COPY --chown=1000:1000 ./package.json .
COPY --chown=1000:1000 ./yarn.lock .
# force NODE_ENV to development to install dev dependencies for build
RUN (export NODE_ENV="development"; yarn --pure-lockfile)
COPY --chown=1000:1000 . .
RUN (export NODE_ENV="production"; yarn build)

# ---
# Prepare project to be run
# ---
FROM setup as run
# NOTE: NODE_ENV can be overridden while actively developing
ARG NODE_ENV="production"
USER node
WORKDIR /home/node
COPY --chown=1000:1000 ./package.json .
COPY --chown=1000:1000 ./yarn.lock .
# unlike build stage, I only need production dependencies here
RUN yarn --pure-lockfile
# user "node" in container has UID/GID of 1000
COPY --chown=1000:1000 --from=build /home/node/dist ./dist
COPY --chown=1000:1000 . .
# NOTE: `src` folder is removed from final container but remains part of final Docker image
RUN rm -fr src
RUN chmod +x entrypoint.mjs

EXPOSE 3000

ENTRYPOINT [ "./entrypoint.mjs" ]
