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
COPY . .
# NOTE: force NODE_ENV to development for builds
RUN (export NODE_ENV="development"; yarn --pure-lockfile)
RUN yarn build

# ---
# Prepare project to be run
# ---
FROM setup as run
# NOTE: NODE_ENV can be overridden while actively developing
ARG NODE_ENV="production"
USER node
WORKDIR /home/node
COPY --from=build /home/node/dist ./dist
COPY ./package.json .
COPY ./yarn.lock .
# user "node" in container as UID/GID of 1000
COPY --chown=1000:1000 ./entrypoint.mjs .
RUN chmod +x entrypoint.mjs
RUN echo $NODE_ENV
RUN yarn --pure-lockfile

ENTRYPOINT [ "./entrypoint.mjs" ]
