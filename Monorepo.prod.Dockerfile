# This image is intended to act as a base in production and will have additional files built on top of it
FROM node:16.15-bullseye-slim as production-base
USER root
# PNPM will be used to install production dependencies
RUN corepack enable
RUN corepack prepare pnpm@7.8.0 --activate
USER node
RUN pnpm config set store-dir /home/node/.pnpm-store
# Setup the project folder with proper permissions
RUN mkdir -p /home/node/project && chown node /home/node/project
WORKDIR /home/node/project
# Now run a limited install with dependencies needed at runtime
COPY --chown=node pnpm-*.yaml package.json ./
RUN pnpm fetch --prod
# If image is used directly, drop into shell for debugging
CMD [ "/bin/bash" ]
