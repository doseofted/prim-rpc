# ---
# Install some utils for container
# ---
FROM node:16.13-bullseye as setup
USER root
RUN npm install --global zx
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project

# ---
# Configure project build
# ---
FROM node:16.13-bullseye as build
USER node
RUN mkdir -p /home/node/project
WORKDIR /home/node/project
COPY --chown=1000:1000 package.json .
COPY --chown=1000:1000 pnpm-lock.yaml .
# force NODE_ENV to development to install dev dependencies for build
RUN (export NODE_ENV="development"; pnpm install)
COPY --chown=1000:1000 . .
# needed to run app
RUN (export NODE_ENV="production"; pnpm build)

# ---
# Prepare project to be run
# ---
FROM setup as run
# NOTE: NODE_ENV can be overridden while actively developing
USER node
ARG NODE_ENV="production"
COPY --chown=1000:1000 package.json .
COPY --chown=1000:1000 pnpm-lock.yaml .
# unlike build stage, I only need production dependencies here
RUN yarn
# user "node" in container has UID/GID of 1000
COPY --chown=1000:1000 --from=build /home/node/project/dist ./dist

COPY --chown=1000:1000 ./entrypoint.mjs .
RUN chmod +x entrypoint.mjs

EXPOSE 3001

ENTRYPOINT [ "./entrypoint.mjs" ]
