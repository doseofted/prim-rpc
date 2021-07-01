# ---
# Install some utils for container
# ---
FROM node:16.3-buster as setup
USER root
# RUN DEBIAN_FRONTEND=noninteractive apt-get update -qq && \
#   DEBIAN_FRONTEND=noninteractive apt-get install -y -qq inotify-tools

RUN npm install --global zx

# REFERENCE: https://michaelb.org/the-right-way-to-do-global-npm-install-without-sudo/
# RUN npm config set prefix ~/.local
# ENV PATH=~/.local/bin/:$PATH

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
COPY --chown=1000:1000 ./entrypoint.mjs .
RUN chmod +x entrypoint.mjs

# to use global dependency, I need to link it so module can be found from entrypoint script
# USER root
# WORKDIR /home/node
# RUN npm link chokidar

ENTRYPOINT [ "./entrypoint.mjs" ]
