# This image is intended to act as a base in production and will have additional files built on top of it
FROM node:19.4-bullseye-slim as production-base
USER root
# PNPM will be used to install production dependencies
RUN corepack enable
RUN corepack prepare pnpm@7.25.0 --activate
RUN pnpm config set store-dir /home/node/.pnpm-store
USER node
# Setup the project folder with proper permissions
RUN mkdir -p /home/node/project && chown node /home/node/project
WORKDIR /home/node/project
# Now run a limited install with dependencies needed at runtime
COPY --chown=node pnpm-*.yaml package.json ./
RUN pnpm fetch --prod
# If image is used directly, drop into shell for debugging
CMD [ "/bin/bash" ]
